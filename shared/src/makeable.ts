import { Cocktail, CocktailIngredient, MakeableResult } from './cocktail';
import { Ingredient } from './ingredient';

/**
 * The required ingredient lines of a single cocktail that the available set does NOT satisfy.
 * A line counts as missing unless it is `optional`, a `garnish`/`seasoning`, or one of its ids
 * (its `ingredientId` OR any `alternativeIds` — the recipe "X or Y") is available.
 *
 * This is the ONE rule behind "wat kan ik maken": {@link computeMakeable} maps it over the whole
 * catalog, and per-cocktail views (e.g. the detail page) must call it directly rather than
 * re-deriving the predicate — that duplication is how the detail page silently drifted from the
 * list. Pass an *expanded* cabinet (see {@link expandCabinet}) to honour substitutions.
 */
export function missingLines(
  cocktail: Cocktail,
  availableIngredientIds: Iterable<string>,
): CocktailIngredient[] {
  const available =
    availableIngredientIds instanceof Set
      ? (availableIngredientIds as Set<string>)
      : new Set(availableIngredientIds);
  const has = (line: CocktailIngredient): boolean =>
    available.has(line.ingredientId) ||
    (line.alternativeIds?.some((id) => available.has(id)) ?? false);
  return cocktail.ingredients.filter(
    (line) =>
      !line.optional && line.role !== 'garnish' && line.role !== 'seasoning' && !has(line),
  );
}

/**
 * The flagship "what can I make with what I have" computation, as a pure function so every
 * client (the Angular web app and the backend) shares one implementation.
 *
 * Returns cocktails ordered by how many *required* ingredients you are still missing, up to
 * `maxMissing` (0 = makeable right now). Rules:
 *   - cocktails with no ingredient lines are excluded;
 *   - `optional` lines never count as missing;
 *   - `garnish` / `seasoning` lines never count as missing (a twist or a dash of salt never blocks);
 *   - a line is "missing" when neither its `ingredientId` nor any of its `alternativeIds`
 *     (a recipe "X or Y") is in the available set;
 *   - results with `missingCount > maxMissing` are dropped;
 *   - sorted by missingCount, then cocktail name (locale-aware).
 *
 * The extra rules are a strict superset: with `role`/`alternativeIds` absent on every line, the
 * result is identical to the original ingredient-only computation.
 *
 * The input is not mutated; `missing` entries carry both the id and the denormalized name so the
 * UI can show "je mist nog: Gin, Limoen". Matching happens on canonical *base* ids — expand the
 * cabinet with {@link expandCabinet} first if you want user-facing substitutions.
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
      const missing = missingLines(ck, available).map((line) => ({
        ingredientId: line.ingredientId,
        name: line.name,
      }));
      return { cocktail: ck, missing, missingCount: missing.length };
    })
    .filter((r) => r.missingCount <= maxMissing)
    .sort(
      (a, b) =>
        a.missingCount - b.missingCount ||
        a.cocktail.name.localeCompare(b.cocktail.name),
    );
}

/**
 * Expand a cabinet of base ingredient ids to include substitutable bases, so a user who stocks a
 * specific bottle satisfies a generic recipe call and vice-versa. Pure and non-mutating; feed the
 * result straight into {@link computeMakeable}. This is deliberately *outside* `computeMakeable`
 * (whose locked three-arg signature must not change) and is an opt-in nicety, not a hero requirement.
 *
 * With `opts.substitutes` off (the default) it just de-duplicates the input, so callers can wire it
 * unconditionally. With it on:
 *   - stocking a child (`old-tom-gin`, `parentId: 'gin'`) also satisfies its parent (`gin`);
 *   - stocking a parent (`gin`) also satisfies every child that names it as `parentId`;
 *   - explicit `substitutes` ids are added.
 * Unknown ids pass through untouched.
 */
export function expandCabinet(
  availableIngredientIds: string[],
  ingredients: Pick<Ingredient, 'id' | 'parentId' | 'substitutes'>[],
  opts: { substitutes?: boolean } = {},
): string[] {
  const set = new Set(availableIngredientIds);
  if (!opts.substitutes) return [...set];
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  for (const id of [...set]) {
    const ing = byId.get(id);
    if (!ing) continue;
    if (ing.parentId) set.add(ing.parentId); // stock a child → the generic recipe is satisfied
    ing.substitutes?.forEach((s) => set.add(s));
  }
  for (const ing of ingredients) {
    // stock the generic → its specific calls are satisfied
    if (ing.parentId && set.has(ing.parentId)) set.add(ing.id);
  }
  return [...set];
}
