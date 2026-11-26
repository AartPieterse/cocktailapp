import { Cocktail, CocktailIngredient, CocktailVariation, MakeableResult } from './cocktail';
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
    .map((ck) => toResult(ck, available))
    .filter((r) => r.missingCount <= maxMissing)
    .sort(byMissingThenName);
}

function toResult(cocktail: Cocktail, available: Set<string>): MakeableResult {
  const missing = missingLines(cocktail, available).map((line) => ({
    ingredientId: line.ingredientId,
    name: line.name,
  }));
  return { cocktail, missing, missingCount: missing.length };
}

function byMissingThenName(a: MakeableResult, b: MakeableResult): number {
  return a.missingCount - b.missingCount || a.cocktail.name.localeCompare(b.cocktail.name);
}

/**
 * The recipe a variation describes: its parent with every swap applied to the line it names, and
 * the variation's own name and description on top. Everything else — glass, method, instructions,
 * family — is the parent's, because a swap changes an ingredient and nothing more.
 *
 * The result keeps the PARENT's `id`. A variation has no id of its own and must not get one: that
 * is what lets it be deleted without stranding a stored favourite (see the variation ladder in
 * docs/data-model.md). Anything that links or stores must therefore pair `id` with `variation.key`.
 *
 * Returns null for a variation that cannot be evaluated as a recipe:
 *   - prose only (no `swaps`) — its ingredient is not a stockable base, so no cabinet can hold it;
 *   - linked to its own catalog cocktail (`makesCocktailId`) — that entry is evaluated as itself;
 *   - a swap naming a line this recipe does not have (`validate-seed` fails on that already).
 *
 * A swapped line drops its `call`, `note` and `alternativeIds`: they described the ingredient that
 * was swapped out. `nameOf` supplies the incoming base's display name (pass the translated catalog's
 * ingredients to read in Dutch); the id stands in when it has none.
 */
export function variationRecipe(
  cocktail: Cocktail,
  variation: CocktailVariation,
  nameOf: (ingredientId: string) => string | undefined = () => undefined,
): Cocktail | null {
  if (variation.makesCocktailId || !variation.swaps?.length) return null;
  let ingredients = cocktail.ingredients;
  for (const { fromId, toId } of variation.swaps) {
    if (!ingredients.some((line) => line.ingredientId === fromId)) return null;
    ingredients = ingredients.map((line) => {
      if (line.ingredientId !== fromId) return line;
      const { call: _call, note: _note, alternativeIds: _alternatives, ...kept } = line;
      return { ...kept, ingredientId: toId, name: nameOf(toId) ?? toId };
    });
  }
  // The pairing with an alcohol-free counterpart belongs to the parent recipe, not to its variants.
  const {
    variations: _variations,
    alcoholFreeCounterpartId: _counterpart,
    alcoholFreeOfId: _of,
    ...parent
  } = cocktail;
  return {
    ...parent,
    name: variation.name,
    description: variation.description ?? cocktail.description,
    ingredients,
  };
}

/**
 * "What can I make", with variations: {@link computeMakeable} over the catalog, plus one result per
 * variation that can be evaluated as a recipe (see {@link variationRecipe}), merged into the same
 * order.
 *
 * A variation is judged ONLY as its own recipe. It never satisfies its parent: holding vodka shows
 * the Caipiroska, never a Caipirinha you cannot make. Its result carries `variation`, and its
 * `cocktail` is the variant recipe under the parent's id — so a consumer that keys results by
 * cocktail id (a per-card status map) must skip results that carry `variation`.
 *
 * `computeMakeable` itself is unchanged and still answers for catalog cocktails alone.
 */
export function computeMakeableWithVariations(
  catalog: { cocktails: Cocktail[]; ingredients: Pick<Ingredient, 'id' | 'name'>[] },
  availableIngredientIds: string[],
  maxMissing = 0,
): MakeableResult[] {
  const available = new Set(availableIngredientIds);
  const names = new Map(catalog.ingredients.map((i) => [i.id, i.name]));
  const variants = catalog.cocktails.flatMap((ck) =>
    (ck.variations ?? []).flatMap((variation) => {
      const recipe = variationRecipe(ck, variation, (id) => names.get(id));
      return recipe ? [{ ...toResult(recipe, available), variation, parentName: ck.name }] : [];
    }),
  );
  return [
    ...computeMakeable(catalog.cocktails, availableIngredientIds, maxMissing),
    ...variants.filter((r) => r.missingCount <= maxMissing),
  ].sort(byMissingThenName);
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
