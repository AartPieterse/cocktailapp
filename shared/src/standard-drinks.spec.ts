import { describe, expect, it } from 'vitest';
import type { Cocktail } from './cocktail';
import type { Ingredient } from './ingredient';
import { alcoholGrams, isAlcoholFree, standardDrinks } from './standard-drinks';

const ingredients: Ingredient[] = [
  { id: 'white-rum', name: 'White Rum', category: 'spirit', abv: 40 },
  { id: 'campari', name: 'Campari', category: 'liqueur', abv: 25 },
  { id: 'lime-juice', name: 'Fresh Lime Juice', category: 'juice' },
  { id: 'soda-water', name: 'Soda Water', category: 'mixer' },
  { id: 'sugar', name: 'Sugar', category: 'other' },
];

function cocktail(lines: Cocktail['ingredients']): Cocktail {
  return { id: 'x', name: 'X', description: '', instructions: [], ingredients: lines };
}

describe('alcoholGrams', () => {
  it('multiplies volume by abv and ethanol density', () => {
    // 45 ml at 40% → 18 ml ethanol → 18 × 0.789 g
    const grams = alcoholGrams(
      cocktail([{ ingredientId: 'white-rum', name: 'White Rum', amount: 45, unit: 'ml' }]),
      ingredients,
    );
    expect(grams).toBeCloseTo(14.202, 3);
  });

  it('adds up across lines and converts non-ml volume units', () => {
    const grams = alcoholGrams(
      cocktail([
        { ingredientId: 'white-rum', name: 'White Rum', amount: 3, unit: 'cl' },
        { ingredientId: 'campari', name: 'Campari', amount: 1, unit: 'oz' },
      ]),
      ingredients,
    );
    // 30 ml @40% + 30 ml @25% = 12 ml + 7.5 ml ethanol
    expect(grams).toBeCloseTo(19.5 * 0.789, 3);
  });

  it('ignores ingredients with no abv, lines with no amount, and non-volume units', () => {
    const grams = alcoholGrams(
      cocktail([
        { ingredientId: 'lime-juice', name: 'Fresh Lime Juice', amount: 20, unit: 'ml' },
        { ingredientId: 'soda-water', name: 'Soda Water', unit: 'topup' },
        { ingredientId: 'sugar', name: 'Sugar', amount: 2, unit: 'teaspoon' },
      ]),
      ingredients,
    );
    expect(grams).toBe(0);
  });

  it('skips optional lines, which never count towards a serving', () => {
    const grams = alcoholGrams(
      cocktail([
        { ingredientId: 'white-rum', name: 'White Rum', amount: 45, unit: 'ml', optional: true },
      ]),
      ingredients,
    );
    expect(grams).toBe(0);
  });
});

describe('standardDrinks', () => {
  it('reports Dutch standaardglazen of 10 g alcohol', () => {
    const n = standardDrinks(
      cocktail([{ ingredientId: 'white-rum', name: 'White Rum', amount: 45, unit: 'ml' }]),
      ingredients,
    );
    expect(n).toBeCloseTo(1.42, 2);
  });

  it('returns null for a drink with no alcohol, so the line can be omitted entirely', () => {
    const n = standardDrinks(
      cocktail([{ ingredientId: 'lime-juice', name: 'Fresh Lime Juice', amount: 20, unit: 'ml' }]),
      ingredients,
    );
    expect(n).toBeNull();
  });
});

describe('isAlcoholFree', () => {
  it('is true only when nothing contributes alcohol', () => {
    const virgin = cocktail([
      { ingredientId: 'lime-juice', name: 'Fresh Lime Juice', amount: 20, unit: 'ml' },
      { ingredientId: 'soda-water', name: 'Soda Water', unit: 'topup' },
    ]);
    const withRum = cocktail([
      ...virgin.ingredients,
      { ingredientId: 'white-rum', name: 'White Rum', amount: 45, unit: 'ml' },
    ]);
    expect(isAlcoholFree(virgin, ingredients)).toBe(true);
    expect(isAlcoholFree(withRum, ingredients)).toBe(false);
  });
});
