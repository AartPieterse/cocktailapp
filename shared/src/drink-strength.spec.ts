import { describe, expect, it } from 'vitest';
import type { Cocktail } from './cocktail';
import type { Ingredient } from './ingredient';
import { alcoholVolume, isAlcoholFree, isLong, pourVolume, servedAbv } from './drink-strength';

const ingredients: Ingredient[] = [
  { id: 'gin', name: 'Gin', category: 'spirit', abv: 40 },
  { id: 'campari', name: 'Campari', category: 'liqueur', abv: 25 },
  { id: 'sweet-vermouth', name: 'Sweet Vermouth', category: 'wine', abv: 16 },
  { id: 'lime-juice', name: 'Fresh Lime Juice', category: 'juice' },
  { id: 'soda-water', name: 'Soda Water', category: 'mixer' },
  { id: 'mint', name: 'Mint', category: 'garnish' },
];

function cocktail(lines: Cocktail['ingredients'], method?: Cocktail['method']): Cocktail {
  return { id: 'x', name: 'X', description: '', instructions: [], ingredients: lines, method };
}

const negroni = cocktail(
  [
    { ingredientId: 'gin', name: 'Gin', amount: 30, unit: 'ml' },
    { ingredientId: 'campari', name: 'Campari', amount: 30, unit: 'ml' },
    { ingredientId: 'sweet-vermouth', name: 'Sweet Vermouth', amount: 30, unit: 'ml' },
  ],
  'stirred',
);

describe('pourVolume', () => {
  it('adds up the measurable liquid and ignores garnish and seasoning lines', () => {
    expect(pourVolume(negroni, ingredients)).toBe(90);
    const withGarnish = cocktail([
      ...negroni.ingredients,
      { ingredientId: 'mint', name: 'Mint', amount: 6, unit: 'ml', role: 'garnish' },
    ]);
    expect(pourVolume(withGarnish, ingredients)).toBe(90);
  });
});

describe('alcoholVolume', () => {
  it('weights each line by its own abv', () => {
    // 30ml@40 + 30ml@25 + 30ml@16 = 12 + 7.5 + 4.8
    expect(alcoholVolume(negroni, ingredients)).toBeCloseTo(24.3, 5);
  });
});

describe('servedAbv', () => {
  it('reports the finished drink, diluted by what its method implies', () => {
    // 24.3 / (90 * 1.22)
    expect(servedAbv(negroni, ingredients)).toBeCloseTo(22.1, 1);
  });

  it('dilutes a shaken drink further than a stirred one', () => {
    const stirred = servedAbv(negroni, ingredients)!;
    const shaken = servedAbv({ ...negroni, method: 'shaken' }, ingredients)!;
    expect(shaken).toBeLessThan(stirred);
  });

  it('returns null for a drink with no alcohol so the line can be omitted', () => {
    const virgin = cocktail(
      [{ ingredientId: 'lime-juice', name: 'Fresh Lime Juice', amount: 30, unit: 'ml' }],
      'build',
    );
    expect(servedAbv(virgin, ingredients)).toBeNull();
  });
});

describe('isLong', () => {
  it('flags a recipe topped up with something unmeasured', () => {
    const highball = cocktail([
      { ingredientId: 'gin', name: 'Gin', amount: 45, unit: 'ml' },
      { ingredientId: 'soda-water', name: 'Soda Water', unit: 'topup' },
    ]);
    expect(isLong(highball)).toBe(true);
    expect(isLong(negroni)).toBe(false);
  });
});

describe('isAlcoholFree', () => {
  it('is true only when nothing contributes alcohol', () => {
    expect(isAlcoholFree(negroni, ingredients)).toBe(false);
    expect(
      isAlcoholFree(
        cocktail([{ ingredientId: 'lime-juice', name: 'Fresh Lime Juice', amount: 30, unit: 'ml' }]),
        ingredients,
      ),
    ).toBe(true);
  });
});
