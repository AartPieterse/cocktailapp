import {
  Cocktail,
  CocktailIngredient,
  CocktailVariation,
  MakeableResult,
  Substitution,
} from './cocktail';
import { Ingredient } from './ingredient';

/**
 * The fields of a base that say what else it can stand in for, plus its display name (which a
 * {@link Substitution} carries so a card can say "met jenever" without another lookup).
 */
export type SubstitutionGraph = Pick<Ingredient, 'id' | 'parentId' | 'substitutes'> &
  Partial<Pick<Ingredient, 'name'>>;

/**
 * What the user's OWN ingredients cover, substitutes included: every base id the bar satisfies,
 * mapped to the own ids that satisfy it (sorted, so the answer never depends on tick order). An own
 * id always covers itself. On top of that, one hop and only from what the user actually has:
 *   - a child covers its parent (`cognac` → `brandy`, `spiced-rum` → `dark-rum`): a specific
 *     bottle answers a generic call;
 *   - a parent covers its children (`brandy` → `cognac`, `vieux`): the generic answers a specific
 *     call;
 *   - a base covers its explicit `substitutes` (`jenever` → `gin`).
 * A covered id is never expanded again. Expanding the expansion is how white rum used to reach
 * spiced rum (white → dark → dark's child) and cognac reached vieux (cognac → brandy → its other
 * child): neither is a swap anyone authored. Unknown ids cover only themselves.
 */
export function cabinetCoverage(
  ownIngredientIds: Iterable<string>,
  ingredients: SubstitutionGraph[],
): Map<string, string[]> {
  const own = [...new Set(ownIngredientIds)];
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  const children = new Map<string, string[]>();
  for (const ing of ingredients) {
    if (ing.parentId) children.set(ing.parentId, [...(children.get(ing.parentId) ?? []), ing.id]);
  }
  const covers = new Map<string, Set<string>>(own.map((id) => [id, new Set([id])]));
  const add = (covered: string, by: string): void => {
    const set = covers.get(covered) ?? new Set<string>();
    set.add(by);
    covers.set(covered, set);
  };
  for (const id of own) {
    const ing = byId.get(id);
    if (!ing) continue;
    if (ing.parentId) add(ing.parentId, id);
    ing.substitutes?.forEach((s) => add(s, id));
    children.get(id)?.forEach((child) => add(child, id));
  }
  return new Map([...covers].map(([covered, by]) => [covered, [...by].sort()]));
}

/**
 * Every base id the user's own ingredients satisfy, substitutes included: the keys of
 * {@link cabinetCoverage}, own ids first. Pure and non-mutating. Substitutes always count; there is
 * no switch any more, because a substitution is shown where it is used ("met jenever").
 *
 * This flat list cannot honour an `exact` line (see `CocktailIngredient.exact`), which only the
 * user's own base satisfies. To judge recipes, pass the OWN ids plus the graph to
 * {@link missingLines} / {@link computeMakeable} instead of feeding them this list.
 */
export function expandCabinet(
  ownIngredientIds: string[],
  ingredients: SubstitutionGraph[],
): string[] {
  return [...cabinetCoverage(ownIngredientIds, ingredients).keys()];
}

/**
 * How the bar covers one recipe line. `via` lists the user's own base ids standing in for it, and
 * is empty when the user has the line's own base or one of its recipe alternatives ("X or Y").
 */
export interface LineCover {
  via: string[];
}

/** The user's own ids, and (when substitutes count) what they cover. */
interface Bar {
  own: Set<string>;
  coverage: Map<string, string[]> | null;
}

function toBar(ownIngredientIds: Iterable<string>, ingredients?: SubstitutionGraph[]): Bar {
  const own =
    ownIngredientIds instanceof Set ? (ownIngredientIds as Set<string>) : new Set(ownIngredientIds);
  return { own, coverage: ingredients ? cabinetCoverage(own, ingredients) : null };
}

function coverLine(line: CocktailIngredient, bar: Bar): LineCover | null {
  const ids = [line.ingredientId, ...(line.alternativeIds ?? [])];
  if (ids.some((id) => bar.own.has(id))) return { via: [] };
  if (!bar.coverage || line.exact) return null;
  const via = [...new Set(ids.flatMap((id) => bar.coverage?.get(id) ?? []))].sort();
  return via.length ? { via } : null;
}

/** Whether a line can block a drink: not optional, not a garnish or seasoning. */
const isRequired = (line: CocktailIngredient): boolean =>
  !line.optional && line.role !== 'garnish' && line.role !== 'seasoning';

/**
 * How the user's bar covers each line of one recipe, aligned with `cocktail.ingredients`: a
 * {@link LineCover} (naming the own ids that stand in, when it is a substitute) or null when nothing
 * in the bar covers it. Optional and decorative lines are reported too, so the recipe page can say
 * "in je bar" or "met citroen uit je bar" on every line it shows.
 *
 * Pass the user's OWN ids, never an expanded list: an `exact` line is covered only by its own base
 * (or a recipe alternative), never by a substitute. Without `ingredients` no substitute counts.
 */
export function coverLines(
  cocktail: Cocktail,
  ownIngredientIds: Iterable<string>,
  ingredients?: SubstitutionGraph[],
): (LineCover | null)[] {
  const bar = toBar(ownIngredientIds, ingredients);
  return cocktail.ingredients.map((line) => coverLine(line, bar));
}

/**
 * The required ingredient lines of a single cocktail that the bar does NOT satisfy. A line counts
 * as missing unless it is `optional`, a `garnish`/`seasoning`, or covered: one of its ids (its
 * `ingredientId` OR any `alternativeIds`, the recipe "X or Y") is in the bar, or, when the
 * substitution graph is passed, a substitute stands in for it and the line is not `exact`.
 *
 * This is the ONE rule behind "wat kan ik maken": {@link computeMakeable} maps it over the whole
 * catalog, and per-cocktail views (e.g. the detail page) must call it directly rather than
 * re-deriving the predicate (that duplication is how the detail page silently drifted from the
 * list). Pass the user's OWN ids plus `ingredients` to count substitutes.
 */
export function missingLines(
  cocktail: Cocktail,
  ownIngredientIds: Iterable<string>,
  ingredients?: SubstitutionGraph[],
): CocktailIngredient[] {
  const bar = toBar(ownIngredientIds, ingredients);
  return cocktail.ingredients.filter((line) => isRequired(line) && !coverLine(line, bar));
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
 *     (a recipe "X or Y") is available and, with `ingredients` passed, no substitute covers it;
 *   - results with `missingCount > maxMissing` are dropped;
 *   - sorted by missingCount, then cocktail name (locale-aware).
 *
 * `ingredients` is the substitution graph (see {@link cabinetCoverage}). Pass it with the user's
 * OWN ids to count substitutes: each result then lists, in `substitutions`, the required lines a
 * substitute covers. Without it, matching is on exact base ids only, as it always was.
 *
 * The input is not mutated; `missing` entries carry both the id and the denormalized name so the
 * UI can show "je mist nog: Gin, Limoen".
 */
export function computeMakeable(
  cocktails: Cocktail[],
  availableIngredientIds: string[],
  maxMissing = 0,
  ingredients?: SubstitutionGraph[],
): MakeableResult[] {
  const bar = toBar(availableIngredientIds, ingredients);
  const names = new Map((ingredients ?? []).map((i) => [i.id, i.name]));
  return cocktails
    .filter((ck) => ck.ingredients.length > 0)
    .map((ck) => toResult(ck, bar, names))
    .filter((r) => r.missingCount <= maxMissing)
    .sort(byMissingThenName);
}

function toResult(
  cocktail: Cocktail,
  bar: Bar,
  names: Map<string, string | undefined>,
): MakeableResult {
  const missing: MakeableResult['missing'] = [];
  const substitutions: Substitution[] = [];
  for (const line of cocktail.ingredients) {
    if (!isRequired(line)) continue;
    const cover = coverLine(line, bar);
    if (!cover) missing.push({ ingredientId: line.ingredientId, name: line.name });
    else if (cover.via.length) {
      substitutions.push({
        ingredientId: line.ingredientId,
        name: line.name,
        via: cover.via.map((id) => ({ ingredientId: id, name: names.get(id) ?? id })),
      });
    }
  }
  return {
    cocktail,
    missing,
    missingCount: missing.length,
    ...(substitutions.length ? { substitutions } : {}),
  };
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
 * A swapped line drops its `call`, `note`, `alternativeIds` and `exact`: they described the
 * ingredient that was swapped out. `nameOf` supplies the incoming base's display name (pass the
 * translated catalog's ingredients to read in Dutch); the id stands in when it has none.
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
      const {
        call: _call,
        note: _note,
        alternativeIds: _alternatives,
        exact: _exact,
        ...kept
      } = line;
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
 * Substitutes always count here: pass the user's OWN ids, and the catalog's `ingredients` double as
 * the substitution graph (and name a swapped-in line). Every "wat kan ik maken" surface and the
 * backend's `POST /cocktails/makeable` call this, so they agree on what a substitute covers.
 *
 * A variation is judged ONLY as its own recipe. It never satisfies its parent: holding vodka shows
 * the Caipiroska, never a Caipirinha you cannot make. Its result carries `variation`, and its
 * `cocktail` is the variant recipe under the parent's id — so a consumer that keys results by
 * cocktail id (a per-card status map) must skip results that carry `variation`.
 */
export function computeMakeableWithVariations(
  catalog: { cocktails: Cocktail[]; ingredients: (SubstitutionGraph & Pick<Ingredient, 'name'>)[] },
  ownIngredientIds: string[],
  maxMissing = 0,
): MakeableResult[] {
  const bar = toBar(ownIngredientIds, catalog.ingredients);
  const names = new Map(catalog.ingredients.map((i) => [i.id, i.name]));
  const variants = catalog.cocktails.flatMap((ck) =>
    (ck.variations ?? []).flatMap((variation) => {
      const recipe = variationRecipe(ck, variation, (id) => names.get(id));
      return recipe ? [{ ...toResult(recipe, bar, names), variation, parentName: ck.name }] : [];
    }),
  );
  return [
    ...computeMakeable(catalog.cocktails, ownIngredientIds, maxMissing, catalog.ingredients),
    ...variants.filter((r) => r.missingCount <= maxMissing),
  ].sort(byMissingThenName);
}
