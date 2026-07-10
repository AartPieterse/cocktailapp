import { Cocktail } from './cocktail';
import { Difficulty } from './difficulty';
import { Glassware } from './glassware';
import { Ingredient } from './ingredient';
import { IngredientCategory } from './ingredient-category';
import { MeasureUnit } from './measure-unit';
import { Method } from './method';

/**
 * Canonical catalog builder shared by every sink so they agree byte-for-byte:
 *   - scripts/build-catalog.mjs → the committed offline bundle (frontend + app),
 *   - the backend's GET /api/catalog → the live, seeded-from-the-same-source catalog.
 *
 * Ingredient ids are deterministic, accent-folded slugs derived from the *name* (not a DB
 * ObjectId), so a user's cabinet — stored as ingredient ids — stays valid whether the client
 * reads the bundled catalog offline or refreshes it from the API. Because ids come from names,
 * two clients seeded from the same data compute the same ids and the same content hash.
 *
 * This module is pure and dependency-free (no `crypto`, no DB) so it is safe to import from the
 * browser/React Native bundle. The SHA-256/12 `version` is stamped by the Node-side callers over
 * `JSON.stringify({ ingredients, cocktails })` of the returned content — see build-catalog.mjs
 * and backend CatalogService (both use the identical recipe).
 */

/** Raw ingredient as it appears in the seed file or a Mongo document (name-keyed). */
export interface RawCatalogIngredient {
  name: string;
  category?: IngredientCategory;
  isStaple?: boolean;
}

/** Raw cocktail ingredient line (its id, if any, is ignored — lines are resolved by name). */
export interface RawCatalogLine {
  name: string;
  amount: number;
  unit: MeasureUnit;
  note?: string;
  optional?: boolean;
}

/** Raw cocktail as it appears in the seed file or a Mongo document. */
export interface RawCatalogCocktail {
  name: string;
  category?: string;
  description?: string;
  instructions?: string[];
  ingredients?: RawCatalogLine[];
  glass?: Glassware;
  method?: Method;
  difficulty?: Difficulty;
  garnish?: string;
  notes?: string;
  servings?: number;
  tags?: string[];
  imageUrl?: string;
}

/** The resolved, id-assigned catalog content (the `version` is stamped on top by Node callers). */
export interface CatalogContent {
  counts: { ingredients: number; cocktails: number };
  ingredients: Ingredient[];
  cocktails: Cocktail[];
}

/** Turn a display name into a stable, url-safe slug (accent-folded). */
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics (Bénédictine -> Benedictine)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // non-alphanumerics -> hyphen
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
    .replace(/-{2,}/g, '-'); // collapse runs
}

/** Assign a unique slug id, disambiguating rare collisions with a numeric suffix. */
function makeUniqueId(name: string, used: Set<string>): string {
  const base = slugify(name) || 'item';
  let id = base;
  let n = 2;
  while (used.has(id)) id = `${base}-${n++}`;
  used.add(id);
  return id;
}

/**
 * Build the canonical catalog from raw ingredients + cocktails. Deterministic and independent of
 * input order: entries are sorted by name *before* ids are assigned, so id disambiguation (the
 * rare `-2` suffix) resolves identically whether the input comes from the seed file (seed order)
 * or Mongo (query order). Throws if a cocktail references an ingredient not in the ingredient list.
 */
export function buildCatalog(
  rawIngredients: RawCatalogIngredient[],
  rawCocktails: RawCatalogCocktail[],
): CatalogContent {
  // Ingredients: sort by name, then assign ids in that stable order.
  const usedIds = new Set<string>();
  const byName = new Map<string, { id: string; name: string }>();
  const ingredients: Ingredient[] = [...rawIngredients]
    .map((ing) => ({ ...ing, name: ing.name.trim() }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((ing) => {
      const id = makeUniqueId(ing.name, usedIds);
      const entry: Ingredient = {
        id,
        name: ing.name,
        ...(ing.category ? { category: ing.category } : {}),
        isStaple: ing.isStaple ?? false,
      };
      byName.set(ing.name.toLowerCase(), { id, name: ing.name });
      return entry;
    });

  // Cocktails: sort by name, then assign ids and resolve ingredient lines to ingredient ids.
  const usedCocktailIds = new Set<string>();
  const cocktails: Cocktail[] = [...rawCocktails]
    .map((c) => ({ ...c, name: c.name.trim() }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => {
      const lines = (c.ingredients ?? []).map((line) => {
        const found = byName.get(line.name.trim().toLowerCase());
        if (!found) {
          throw new Error(
            `Cocktail "${c.name}" references unknown ingredient "${line.name}". ` +
              `Add it to the ingredients list.`,
          );
        }
        return {
          ingredientId: found.id,
          name: found.name,
          amount: line.amount,
          unit: line.unit,
          ...(line.note ? { note: line.note } : {}),
          ...(line.optional ? { optional: true } : {}),
        };
      });

      return {
        id: makeUniqueId(c.name, usedCocktailIds),
        name: c.name,
        ...(c.category ? { category: c.category } : {}),
        description: c.description ?? '',
        instructions: c.instructions ?? [],
        ingredients: lines,
        ...(c.glass ? { glass: c.glass } : {}),
        ...(c.method ? { method: c.method } : {}),
        ...(c.difficulty ? { difficulty: c.difficulty } : {}),
        ...(c.garnish ? { garnish: c.garnish } : {}),
        ...(c.notes ? { notes: c.notes } : {}),
        servings: c.servings ?? 1,
        ...(c.tags?.length ? { tags: c.tags } : {}),
        ...(c.imageUrl ? { imageUrl: c.imageUrl } : {}),
      } as Cocktail;
    });

  return {
    counts: { ingredients: ingredients.length, cocktails: cocktails.length },
    ingredients,
    cocktails,
  };
}
