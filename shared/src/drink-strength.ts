import type { Cocktail } from './cocktail';
import type { Ingredient } from './ingredient';
import { convertMeasure, isVolumeUnit } from './measure-convert';
import type { Method } from './method';

/**
 * How strong a drink ends up in the glass, as a percentage — the way a bottle label reads.
 *
 * This is bar information, not health information: it tells you what kind of drink you are about to
 * make. A stirred Martini lands around 30% and is meant to be sipped; a highball lands near 10% and
 * is meant to be long. Knowing which one you are building is the whole point, and it is the same
 * knowledge that tells you whether to reach for a coupe or a collins glass.
 *
 * It deliberately reports the strength of the *finished* drink rather than of the pour, because
 * dilution is an ingredient. Ignoring it would make every stirred drink look 25% stronger than it
 * tastes.
 */

/**
 * Water added as a fraction of the pour, by method. These are the usual working figures: stirring
 * twenty seconds takes on roughly a fifth, a hard shake nearer a third because the ice fractures,
 * and blending buries a cup of crushed ice in the drink.
 */
const DILUTION: Record<Method, number> = {
  stirred: 0.22,
  shaken: 0.28,
  muddled: 0.2,
  build: 0.18,
  blended: 0.5,
  layered: 0.05,
};

const DEFAULT_DILUTION = 0.2;

/** Total measurable liquid in one serving, in millilitres, before dilution. */
export function pourVolume(cocktail: Cocktail, ingredients: readonly Ingredient[]): number {
  void ingredients;
  let ml = 0;
  for (const line of cocktail.ingredients) {
    if (line.optional || line.role === 'garnish' || line.role === 'seasoning') continue;
    if (line.amount === undefined || !isVolumeUnit(line.unit)) continue;
    ml += convertMeasure(line.amount, line.unit, 'ml').amount;
  }
  return ml;
}

/** Millilitres of pure alcohol in one serving. */
export function alcoholVolume(cocktail: Cocktail, ingredients: readonly Ingredient[]): number {
  const abvById = new Map<string, number>();
  for (const ing of ingredients) {
    if (typeof ing.abv === 'number' && ing.abv > 0) abvById.set(ing.id, ing.abv);
  }

  let ml = 0;
  for (const line of cocktail.ingredients) {
    if (line.optional) continue;
    const abv = abvById.get(line.ingredientId);
    if (abv === undefined) continue;
    if (line.amount === undefined || !isVolumeUnit(line.unit)) continue;
    ml += convertMeasure(line.amount, line.unit, 'ml').amount * (abv / 100);
  }
  return ml;
}

/**
 * Strength of the finished drink as a percentage, after the dilution its method implies.
 * `null` when the recipe carries no alcohol, so the line is left off rather than printed as 0%.
 *
 * A `topup` line (soda, cola, sparkling water) carries no number, so a highball's real served
 * strength is lower still than this reports — {@link isLong} flags those so a caller can say so.
 */
export function servedAbv(cocktail: Cocktail, ingredients: readonly Ingredient[]): number | null {
  const alcohol = alcoholVolume(cocktail, ingredients);
  if (alcohol <= 0) return null;
  const pour = pourVolume(cocktail, ingredients);
  if (pour <= 0) return null;
  const dilution = cocktail.method ? (DILUTION[cocktail.method] ?? DEFAULT_DILUTION) : DEFAULT_DILUTION;
  return (alcohol / (pour * (1 + dilution))) * 100;
}

/** True when the recipe is topped up with something unmeasured, so the glass holds more than the pour. */
export function isLong(cocktail: Cocktail): boolean {
  return cocktail.ingredients.some((l) => l.unit === 'topup' && !l.optional);
}

/** No non-optional line contributes alcohol. */
export function isAlcoholFree(cocktail: Cocktail, ingredients: readonly Ingredient[]): boolean {
  return alcoholVolume(cocktail, ingredients) <= 0;
}
