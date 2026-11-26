import { describe, expect, it } from 'vitest';
import type { Cocktail, CocktailIngredient } from './cocktail';
import { computeMakeable, computeMakeableWithVariations, variationRecipe } from './makeable';

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

  // --- superset rules (roles + alternativeIds); absent on the cases above, so those stay green ---

  it('never counts garnish or seasoning lines as missing', () => {
    const cocktails = [
      cocktail('bm', 'Bloody Mary', [
        line('vodka', 'Vodka'),
        line('tomato', 'Tomato Juice'),
        line('tabasco', 'Tabasco', { role: 'seasoning' }),
        line('celery', 'Celery', { role: 'garnish' }),
      ]),
    ];
    // Tabasco + celery are not stocked, but their roles never block → makeable at maxMissing 0.
    const result = computeMakeable(cocktails, ['vodka', 'tomato'], 0);
    expect(result).toHaveLength(1);
    expect(result[0].missingCount).toBe(0);
  });

  it('treats a line as available when an alternativeId is stocked (recipe "X or Y")', () => {
    const cocktails = [
      cocktail('of', 'Old Fashioned', [
        line('bourbon', 'Bourbon', { alternativeIds: ['rye-whiskey'] }),
        line('sugar', 'Sugar'),
      ]),
    ];
    // Have rye + sugar, not bourbon → the whiskey line is satisfied via its alternative.
    const result = computeMakeable(cocktails, ['rye-whiskey', 'sugar'], 0);
    expect(result).toHaveLength(1);
    expect(result[0].missingCount).toBe(0);
  });

  it('still reports the primary base name when an "X or Y" line is missing', () => {
    const cocktails = [
      cocktail('of', 'Old Fashioned', [
        line('bourbon', 'Bourbon', { alternativeIds: ['rye-whiskey'] }),
        line('sugar', 'Sugar'),
      ]),
    ];
    const result = computeMakeable(cocktails, ['sugar'], 1);
    expect(result[0].missing).toEqual([{ ingredientId: 'bourbon', name: 'Bourbon' }]);
  });
});

describe('variations in "what can I make"', () => {
  const cachaca = line('cachaca', 'Cachaça', { call: 'Cachaça (aged)', note: 'gekoeld' });
  const limeWedges = line('lime-juice', 'Fresh Lime Juice');
  const sugar = line('sugar', 'Sugar');
  const caipirinha: Cocktail = {
    ...cocktail('caipirinha', 'Caipirinha', [cachaca, limeWedges, sugar]),
    alcoholFreeCounterpartId: 'virgin-caipirinha',
    variations: [
      { key: 'caipiroska', name: 'Caipiroska', swaps: [{ fromId: 'cachaca', toId: 'vodka' }] },
      { key: 'prose-only', name: 'Prose Only', description: 'Use something no cabinet can hold.' },
      { key: 'linked', name: 'Linked', swaps: [{ fromId: 'cachaca', toId: 'vodka' }], makesCocktailId: 'x' },
    ],
  };
  const ingredients = [
    { id: 'vodka', name: 'Wodka' },
    { id: 'cachaca', name: 'Cachaça' },
  ];
  const catalog = { cocktails: [caipirinha], ingredients };

  it('builds the variant recipe under the parent id, with the swap applied to its line', () => {
    const recipe = variationRecipe(caipirinha, caipirinha.variations![0], (id) =>
      ingredients.find((i) => i.id === id)?.name,
    )!;
    expect(recipe.id).toBe('caipirinha');
    expect(recipe.name).toBe('Caipiroska');
    expect(recipe.ingredients[0]).toEqual({ ingredientId: 'vodka', name: 'Wodka', amount: 5, unit: 'cl' });
    expect(recipe.ingredients.slice(1)).toEqual([limeWedges, sugar]);
    expect(recipe.variations).toBeUndefined();
    expect(recipe.alcoholFreeCounterpartId).toBeUndefined();
  });

  it('cannot evaluate a prose-only variation, one linked to its own cocktail, or a swap of a missing line', () => {
    expect(variationRecipe(caipirinha, caipirinha.variations![1])).toBeNull();
    expect(variationRecipe(caipirinha, caipirinha.variations![2])).toBeNull();
    const stray = { key: 'stray', name: 'Stray', swaps: [{ fromId: 'gin', toId: 'vodka' }] };
    expect(variationRecipe(caipirinha, stray)).toBeNull();
  });

  it('surfaces the variation, and never lets it satisfy the parent', () => {
    const result = computeMakeableWithVariations(catalog, ['vodka', 'lime-juice', 'sugar'], 0);
    expect(result.map((r) => r.cocktail.name)).toEqual(['Caipiroska']);
    expect(result[0].variation?.key).toBe('caipiroska');
    expect(result[0].parentName).toBe('Caipirinha');
    expect(result[0].cocktail.id).toBe('caipirinha');
  });

  it('merges parents and variations into one order, and reports a variant line by its new name', () => {
    const result = computeMakeableWithVariations(catalog, ['cachaca', 'lime-juice', 'sugar'], 1);
    expect(result.map((r) => [r.cocktail.name, r.missingCount])).toEqual([
      ['Caipirinha', 0],
      ['Caipiroska', 1],
    ]);
    expect(result[1].missing).toEqual([{ ingredientId: 'vodka', name: 'Wodka' }]);
  });

  it('leaves the catalog-only answer exactly as computeMakeable gives it', () => {
    const cab = ['cachaca', 'vodka', 'lime-juice', 'sugar'];
    const withVariations = computeMakeableWithVariations(catalog, cab, 0);
    expect(withVariations.filter((r) => !r.variation)).toEqual(computeMakeable([caipirinha], cab, 0));
  });
});
