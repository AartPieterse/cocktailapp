import { describe, expect, it } from 'vitest';
import type { Cocktail, CocktailIngredient } from './cocktail';
import { computeMakeable } from './makeable';

/**
 * Mirrors backend/src/cocktails/cocktails.service.spec.ts (the makeable aggregation) but against
 * the pure, shared implementation every client uses. Guards the hero feature's contract:
 * zero-ingredient exclusion, optional lines ignored, missingCount filtering, sort order, and
 * that ids/names survive untouched into the result.
 */

function line(
  ingredientId: string,
  name: string,
  extra: Partial<CocktailIngredient> = {},
): CocktailIngredient {
  return { ingredientId, name, amount: 5, unit: 'cl', ...extra };
}

function cocktail(
  id: string,
  name: string,
  ingredients: CocktailIngredient[],
): Cocktail {
  return { id, name, description: '', instructions: [], ingredients };
}

const gin = line('gin', 'Gin');
const tonic = line('tonic', 'Tonic');
const lime = line('lime', 'Limoen');

describe('computeMakeable', () => {
  it('returns cocktails whose required ingredients are all available (missingCount 0)', () => {
    const cocktails = [cocktail('gt', 'Gin & Tonic', [gin, tonic])];
    const result = computeMakeable(cocktails, ['gin', 'tonic'], 0);
    expect(result).toHaveLength(1);
    expect(result[0].cocktail.id).toBe('gt');
    expect(result[0].missing).toEqual([]);
    expect(result[0].missingCount).toBe(0);
  });

  it('never counts optional lines as missing', () => {
    const cocktails = [
      cocktail('gt', 'Gin & Tonic', [gin, tonic, line('bitters', 'Bitters', { optional: true })]),
    ];
    // Bitters is not available, but it is optional → still makeable at maxMissing 0.
    const result = computeMakeable(cocktails, ['gin', 'tonic'], 0);
    expect(result).toHaveLength(1);
    expect(result[0].missingCount).toBe(0);
  });

  it('excludes cocktails with no ingredient lines', () => {
    const cocktails = [cocktail('empty', 'Empty', [])];
    expect(computeMakeable(cocktails, ['gin'], 5)).toEqual([]);
  });

  it('reports missing required ingredients with id and denormalized name', () => {
    const cocktails = [cocktail('gt', 'Gin & Tonic', [gin, tonic])];
    const result = computeMakeable(cocktails, ['gin'], 1);
    expect(result).toHaveLength(1);
    expect(result[0].missing).toEqual([{ ingredientId: 'tonic', name: 'Tonic' }]);
    expect(result[0].missingCount).toBe(1);
  });

  it('drops cocktails whose missingCount exceeds maxMissing', () => {
    const cocktails = [cocktail('marg', 'Margarita', [gin, tonic, lime])];
    // Have only gin → missing 2 (tonic, lime). maxMissing 1 excludes it.
    expect(computeMakeable(cocktails, ['gin'], 1)).toEqual([]);
    // maxMissing 2 includes it.
    expect(computeMakeable(cocktails, ['gin'], 2)).toHaveLength(1);
  });

  it('sorts by missingCount (ascending) ahead of name', () => {
    // Available: tonic only.
    const cocktails = [
      cocktail('b', 'Bravo', [gin, tonic]), // missing 1 (gin)
      cocktail('a', 'Alpha', [gin, tonic, lime]), // missing 2 (gin, lime) — earlier name, but more missing
      cocktail('c', 'Charlie', [tonic]), // missing 0
    ];
    const result = computeMakeable(cocktails, ['tonic'], 2);
    expect(result.map((r) => r.cocktail.name)).toEqual(['Charlie', 'Bravo', 'Alpha']);
  });

  it('breaks missingCount ties by name (locale-aware)', () => {
    const cocktails = [
      cocktail('z', 'Zombie', [line('rum', 'Rum')]),
      cocktail('a', 'Americano', [line('campari', 'Campari')]),
    ];
    const result = computeMakeable(cocktails, [], 1);
    expect(result.map((r) => r.cocktail.name)).toEqual(['Americano', 'Zombie']);
  });

  it('defaults maxMissing to 0', () => {
    const cocktails = [cocktail('gt', 'Gin & Tonic', [gin, tonic])];
    expect(computeMakeable(cocktails, ['gin'])).toEqual([]);
    expect(computeMakeable(cocktails, ['gin', 'tonic'])).toHaveLength(1);
  });

  it('does not mutate the input cocktails', () => {
    const cocktails = [cocktail('gt', 'Gin & Tonic', [gin, tonic])];
    const snapshot = JSON.stringify(cocktails);
    computeMakeable(cocktails, ['gin'], 1);
    expect(JSON.stringify(cocktails)).toBe(snapshot);
  });
});
