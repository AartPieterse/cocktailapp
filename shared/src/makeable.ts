import { Cocktail, MakeableResult } from './cocktail';

/**
 * The flagship "what can I make with what I have" computation, as a pure function so every
 * client (Angular web, Expo native + web, and the backend's tests) shares one implementation.
 *
 * Returns cocktails ordered by how many *required* ingredients you are still missing, up to
 * `maxMissing` (0 = makeable right now). Rules, ported 1:1 from the Angular CatalogService and
 * the backend CocktailsService aggregation:
 *   - cocktails with no ingredient lines are excluded;
 *   - `optional` lines never count as missing;
 *   - a line is "missing" when its `ingredientId` is not in the available set;
 *   - results with `missingCount > maxMissing` are dropped;
 *   - sorted by missingCount, then cocktail name (locale-aware).
 *
 * The input is not mutated; `missing` entries carry both the id and the denormalized name so the
 * UI can show "je mist nog: Gin, Limoen".
 */
export function computeMakeable(
  cocktails: Cocktail[],
  availableIngredientIds: string[],
  maxMissing = 0,
): MakeableResult[] {
  const available = new Set(availableIngredientIds);
  return cocktails
    .filter((ck) => ck.ingredients.length > 0)
    .map((ck) => {
      const missing = ck.ingredients
        .filter((line) => !line.optional && !available.has(line.ingredientId))
        .map((line) => ({ ingredientId: line.ingredientId, name: line.name }));
      return { cocktail: ck, missing, missingCount: missing.length };
    })
    .filter((r) => r.missingCount <= maxMissing)
    .sort(
      (a, b) =>
        a.missingCount - b.missingCount ||
        a.cocktail.name.localeCompare(b.cocktail.name),
    );
}
