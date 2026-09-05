import type { Cocktail } from './cocktail';
import type { Ingredient } from './ingredient';
import { convertMeasure, isVolumeUnit } from './measure-convert';

/**
 * Alcohol strength of a recipe, expressed in Dutch *standaardglazen*.
 *
 * The app shows this as one neutral line on a recipe ("ongeveer 1,4 standaardglas alcohol per
 * glas"), at the same visual weight as the glass line. It is deliberately NOT a sort key, a badge
 * or a filter on "strongest" — strength is information, never a virtue. See the product rules on
 * the design canvas.
 */

/** Grams of pure alcohol in one Dutch standaardglas. The figure the Trimbos-instituut uses. */
export const GRAMS_PER_STANDARD_DRINK = 10;

/** Density of ethanol at room temperature, g/ml. */
const ETHANOL_DENSITY = 0.789;

/**
 * Grams of pure alcohol in one serving of `cocktail`.
 *
 * Only lines with a volume unit (`ml`/`cl`/`oz`) and an ingredient carrying an {@link Ingredient.abv}
 * contribute: a "topup with soda water" line has no number, and a dash of bitters is negligible but
 * would still count if it were authored in millilitres. Returns 0 when nothing qualifies, which is
 * also the honest answer for an alcohol-free drink.
 *
 * `servings` on the cocktail is ignored — the result is per serving as written, matching how the
 * detail screen scales amounts per person.
 */
export function alcoholGrams(cocktail: Cocktail, ingredients: readonly Ingredient[]): number {
  const abvById = new Map<string, number>();
  for (const ing of ingredients) {
    if (typeof ing.abv === 'number' && ing.abv > 0) abvById.set(ing.id, ing.abv);
  }

  let grams = 0;
  for (const line of cocktail.ingredients) {
    if (line.optional) continue;
    const abv = abvById.get(line.ingredientId);
    if (abv === undefined) continue;
    if (line.amount === undefined || !isVolumeUnit(line.unit)) continue;
    const ml = convertMeasure(line.amount, line.unit, 'ml').amount;
    grams += ml * (abv / 100) * ETHANOL_DENSITY;
  }
  return grams;
}

/**
 * Alcohol in one serving, in Dutch standaardglazen. `null` when the recipe carries no alcohol at
 * all, so a caller can omit the line entirely rather than print "0 standaardglazen".
 */
export function standardDrinks(
  cocktail: Cocktail,
  ingredients: readonly Ingredient[],
): number | null {
  const grams = alcoholGrams(cocktail, ingredients);
  if (grams <= 0) return null;
  return grams / GRAMS_PER_STANDARD_DRINK;
}

/**
 * True when no non-optional line references an ingredient with an ABV. Cheaper and more precise
 * than the category-based check in `ALCOHOLIC_INGREDIENT_CATEGORIES` once `abv` is authored, but
 * only meaningful for recipes whose ingredients actually carry it.
 */
export function isAlcoholFree(cocktail: Cocktail, ingredients: readonly Ingredient[]): boolean {
  return alcoholGrams(cocktail, ingredients) <= 0;
}
