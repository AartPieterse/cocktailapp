import { describe, expect, it } from 'vitest';
import type { Cocktail, CocktailIngredient } from './cocktail';
import type { Ingredient } from './ingredient';
import {
  cabinetCoverage,
  computeMakeable,
  computeMakeableWithVariations,
  coverLines,
  expandCabinet,
  missingLines,
} from './makeable';

/**
 * Substitutes always count. `cabinetCoverage` / `expandCabinet` say what the user's OWN ingredients
 * cover; `coverLines`, `missingLines` and `computeMakeable` apply that per recipe line, honouring
 * `exact` lines, and report which own ingredient stands in. None of them mutate their inputs.
 */

function ing(id: string, extra: Partial<Ingredient> = {}): Ingredient {
  return { id, name: id, ...extra };
}

// The shape of the real graph: brandy with two children, dark rum with a spiced child, a two-way
// white/dark swap, and jenever standing in for gin one way.
const catalog: Ingredient[] = [
  ing('gin', { name: 'Gin' }),
  ing('jenever', { name: 'Jenever', substitutes: ['gin'] }),
  ing('brandy', { name: 'Brandy' }),
  ing('cognac', { name: 'Cognac', parentId: 'brandy' }),
  ing('vieux', { name: 'Vieux', parentId: 'brandy', substitutes: ['cognac'] }),
  ing('white-rum', { name: 'Witte rum', substitutes: ['dark-rum'] }),
  ing('dark-rum', { name: 'Donkere rum', substitutes: ['white-rum'] }),
  ing('spiced-rum', { name: 'Spiced rum', parentId: 'dark-rum' }),
  ing('vermouth', { name: 'Vermout' }),
];

function line(ingredientId: string, extra: Partial<CocktailIngredient> = {}): CocktailIngredient {
  return { ingredientId, name: ingredientId, amount: 5, unit: 'cl', ...extra };
}

function cocktail(id: string, ingredients: CocktailIngredient[]): Cocktail {
  return { id, name: id, description: '', instructions: [], ingredients };
}

describe('expandCabinet', () => {
  it('de-duplicates and keeps own ids first', () => {
    const out = expandCabinet(['gin', 'gin', 'vermouth'], catalog);
    expect(out).toEqual(['gin', 'vermouth']);
  });

  it('adds a parent when a child is stocked', () => {
    expect(expandCabinet(['cognac'], catalog)).toEqual(['cognac', 'brandy']);
  });

  it('adds every child when the generic parent is stocked', () => {
    expect(expandCabinet(['brandy'], catalog).sort()).toEqual(['brandy', 'cognac', 'vieux']);
  });

  it('applies explicit substitutes, one way only', () => {
    expect(expandCabinet(['jenever'], catalog)).toContain('gin');
    expect(expandCabinet(['gin'], catalog)).toEqual(['gin']);
  });

  it('expands only from what the user has: white rum does not reach spiced rum', () => {
    // white → dark is a swap; dark → spiced is dark's child. Chaining the two was the old bug.
    expect(expandCabinet(['white-rum'], catalog).sort()).toEqual(['dark-rum', 'white-rum']);
  });

  it('expands only from what the user has: cognac does not reach vieux', () => {
    // cognac → brandy is its parent; brandy → vieux is the parent's other child. Not a swap.
    expect(expandCabinet(['cognac'], catalog)).not.toContain('vieux');
  });

  it('keeps vieux covering cognac through its explicit substitute', () => {
    expect(expandCabinet(['vieux'], catalog).sort()).toEqual(['brandy', 'cognac', 'vieux']);
  });

  it('still lets spiced rum and dark rum cover each other through the parent link', () => {
    expect(expandCabinet(['spiced-rum'], catalog)).toContain('dark-rum');
    expect(expandCabinet(['dark-rum'], catalog)).toEqual(
      expect.arrayContaining(['white-rum', 'spiced-rum']),
    );
  });

  it('passes unknown ids through untouched', () => {
    expect(expandCabinet(['mystery-amaro'], catalog)).toEqual(['mystery-amaro']);
  });

  it('does not mutate its inputs', () => {
    const cabinet = ['cognac'];
    const snapshot = JSON.stringify({ cabinet, catalog });
    expandCabinet(cabinet, catalog);
    cabinetCoverage(cabinet, catalog);
    expect(JSON.stringify({ cabinet, catalog })).toBe(snapshot);
  });
});

describe('cabinetCoverage', () => {
  it('names the own ingredients behind each covered id, sorted', () => {
    const cov = cabinetCoverage(['white-rum', 'spiced-rum'], catalog);
    expect(cov.get('dark-rum')).toEqual(['spiced-rum', 'white-rum']);
    expect(cov.get('white-rum')).toEqual(['white-rum']);
  });
});

describe('coverLines', () => {
  const fizz = cocktail('gin-fizz', [line('gin'), line('lemon', { role: 'garnish' })]);

  it('reports an own line with an empty via, a substitute with the own id, a gap as null', () => {
    expect(coverLines(fizz, ['gin'], catalog)).toEqual([{ via: [] }, null]);
    expect(coverLines(fizz, ['jenever'], catalog)).toEqual([{ via: ['jenever'] }, null]);
  });

  it('counts a recipe alternative as the line itself, not a substitute', () => {
    const c = cocktail('x', [line('cognac', { alternativeIds: ['brandy'] })]);
    expect(coverLines(c, ['brandy'], catalog)).toEqual([{ via: [] }]);
  });

  it('ignores substitutes without the graph', () => {
    expect(coverLines(fizz, ['jenever'])).toEqual([null, null]);
  });
});

describe('exact lines', () => {
  const martini = cocktail('dry-martini', [line('gin', { exact: true }), line('vermouth')]);
  const fizz = cocktail('gin-fizz', [line('gin')]);

  it('are not covered by a substitute', () => {
    expect(missingLines(martini, ['jenever', 'vermouth'], catalog).map((l) => l.ingredientId)).toEqual([
      'gin',
    ]);
    expect(coverLines(martini, ['jenever', 'vermouth'], catalog)[0]).toBeNull();
  });

  it('are still covered by their own base', () => {
    expect(missingLines(martini, ['gin', 'vermouth'], catalog)).toEqual([]);
  });

  it('leave other recipes free to use the substitute', () => {
    const res = computeMakeable([martini, fizz], ['jenever', 'vermouth'], 0, catalog);
    expect(res.map((r) => r.cocktail.id)).toEqual(['gin-fizz']);
  });

  it('also block a parent or child standing in (cognac line, brandy in the bar)', () => {
    const sazerac = cocktail('sazerac', [line('cognac', { exact: true })]);
    expect(missingLines(sazerac, ['brandy'], catalog)).toHaveLength(1);
    expect(missingLines(sazerac, ['vieux'], catalog)).toHaveLength(1);
  });
});

describe('computeMakeable with the substitution graph', () => {
  const fizz = cocktail('gin-fizz', [line('gin'), line('vermouth')]);

  it('lists the substituted lines with the own ingredient that stands in', () => {
    const [r] = computeMakeable([fizz], ['jenever', 'vermouth'], 0, catalog);
    expect(r.missingCount).toBe(0);
    expect(r.substitutions).toEqual([
      { ingredientId: 'gin', name: 'gin', via: [{ ingredientId: 'jenever', name: 'Jenever' }] },
    ]);
  });

  it('carries no substitutions when the bar has every base itself', () => {
    const [r] = computeMakeable([fizz], ['gin', 'vermouth'], 0, catalog);
    expect(r.substitutions).toBeUndefined();
  });

  it('is the old exact-id matching without the graph', () => {
    expect(computeMakeable([fizz], ['jenever', 'vermouth'], 0)).toEqual([]);
  });

  it('applies the graph in computeMakeableWithVariations, from the catalog ingredients', () => {
    const res = computeMakeableWithVariations({ cocktails: [fizz], ingredients: catalog }, [
      'jenever',
      'vermouth',
    ]);
    expect(res.map((r) => r.cocktail.id)).toEqual(['gin-fizz']);
    expect(res[0].substitutions?.[0].via[0].name).toBe('Jenever');
  });
});
