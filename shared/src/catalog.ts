import { BaseSpirit, Cocktail, CocktailIngredientRole } from './cocktail';
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
 * Ingredient ids are stable, url-safe slugs (never a DB ObjectId), so a user's cabinet — stored as
 * ingredient ids — stays valid whether the client reads the bundled catalog offline or refreshes it
 * from the API. Each id is taken from an authored, immutable `id` when the seed provides one, else
 * derived deterministically via `slugify(name)`. Two clients seeded from the same data therefore
 * compute the same ids and the same content hash.
 *
 * This module is pure and dependency-free (no `crypto`, no DB) so it is safe to import from the
 * browser/React Native bundle. The SHA-256/12 `version` is stamped by the Node-side callers over
 * `JSON.stringify({ ingredients, cocktails })` of the returned content — see build-catalog.mjs
 * and backend CatalogService (both use the identical recipe).
 */

/** Raw ingredient as it appears in the seed file or a Mongo document (name-keyed). */
export interface RawCatalogIngredient {
  /** Authored, immutable id. When present, used verbatim; otherwise derived via `slugify(name)`. */
  id?: string;
  name: string;
  category?: IngredientCategory;
  isStaple?: boolean;
  parentId?: string;
  substitutes?: string[];
  aliases?: string[];
}

/**
 * Raw cocktail ingredient line. The line's *base* ingredient is referenced by `name` (resolved to
 * an id at build time); `call` preserves the recipe's verbatim wording. `alternatives` lists the
 * *names* of other bases that also satisfy an "X or Y" line — resolved and validated to ids here.
 */
export interface RawCatalogLine {
  name: string;
  call?: string;
  amount?: number;
  amountMax?: number;
  unit: MeasureUnit;
  note?: string;
  optional?: boolean;
  role?: CocktailIngredientRole;
  /** Names (not ids) of alternative bases for a recipe "X or Y" line. */
  alternatives?: string[];
}

/** Raw cocktail as it appears in the seed file or a Mongo document. */
export interface RawCatalogCocktail {
  /** Authored, immutable id. When present, used verbatim; otherwise derived via `slugify(name)`. */
  id?: string;
  name: string;
  category?: string;
  baseSpirit?: BaseSpirit;
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

/** Base language of the catalog's names/instructions. English is the canonical id space. */
export type Locale = 'en' | 'nl';

/** Metadata stamped on top of {@link CatalogContent} to form the shipped/served {@link Catalog}. */
export interface CatalogMeta {
  /** SHA-256/12 content hash over `{ ingredients, cocktails }` — doubles as the `/api/catalog` ETag. */
  version: string;
  /** Hand-bumped only on a breaking shape change; clients may gate on it. */
  schemaVersion: number;
  /** Provenance, e.g. `'iba-cocktails-seed.json'`. */
  generatedFrom: string;
  /** Base language of `name`/`instructions` (a Dutch overlay carries the same `version`). */
  locale: Locale;
  counts: { ingredients: number; cocktails: number };
}

/** The full catalog document every sink ships / serves: metadata + resolved content. */
export interface Catalog extends CatalogMeta {
  ingredients: Ingredient[];
  cocktails: Cocktail[];
}

/** Current catalog schema version — bump on a breaking shape change (see docs/data-model-refinement.md). */
export const CATALOG_SCHEMA_VERSION = 1;

/**
 * An id-keyed translation overlay (e.g. `catalog.nl.json`) applied on top of the canonical
 * (English) catalog at display time. Carries the same `version` as the catalog it overlays; on a
 * mismatch the UI falls back to canonical names.
 */
export interface CatalogTranslations {
  version: string;
  ingredients: Record<string, { name: string }>;
  cocktails: Record<
    string,
    {
      name?: string;
      description?: string;
      instructions?: string[];
      notes?: string;
      garnish?: string;
    }
  >;
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
      // Prefer an authored, immutable id; fall back to a slug of the name (legacy/unfrozen seeds).
      let id: string;
      if (ing.id) {
        if (usedIds.has(ing.id)) {
          throw new Error(`Duplicate authored ingredient id "${ing.id}" (on "${ing.name}").`);
        }
        usedIds.add(ing.id);
        id = ing.id;
      } else {
        id = makeUniqueId(ing.name, usedIds);
      }
      const entry: Ingredient = {
        id,
        name: ing.name,
        ...(ing.category ? { category: ing.category } : {}),
        isStaple: ing.isStaple ?? false,
        ...(ing.parentId ? { parentId: ing.parentId } : {}),
        ...(ing.substitutes?.length ? { substitutes: ing.substitutes } : {}),
        ...(ing.aliases?.length ? { aliases: ing.aliases } : {}),
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
        // Resolve "X or Y" alternatives (authored as names) to base ids; fail loud on a typo.
        const alternativeIds = (line.alternatives ?? []).map((altName) => {
          const alt = byName.get(altName.trim().toLowerCase());
          if (!alt) {
            throw new Error(
              `Cocktail "${c.name}" line "${line.name}" references unknown alternative "${altName}". ` +
                `Add it to the ingredients list.`,
            );
          }
          return alt.id;
        });
        return {
          ingredientId: found.id,
          name: found.name,
          ...(line.call ? { call: line.call } : {}),
          ...(line.amount !== undefined ? { amount: line.amount } : {}),
          ...(line.amountMax !== undefined ? { amountMax: line.amountMax } : {}),
          unit: line.unit,
          ...(line.note ? { note: line.note } : {}),
          ...(line.optional ? { optional: true } : {}),
          ...(line.role ? { role: line.role } : {}),
          ...(alternativeIds.length ? { alternativeIds } : {}),
        };
      });

      // Prefer an authored, immutable cocktail id; fall back to a slug of the name.
      let cocktailId: string;
      if (c.id) {
        if (usedCocktailIds.has(c.id)) {
          throw new Error(`Duplicate authored cocktail id "${c.id}" (on "${c.name}").`);
        }
        usedCocktailIds.add(c.id);
        cocktailId = c.id;
      } else {
        cocktailId = makeUniqueId(c.name, usedCocktailIds);
      }

      return {
        id: cocktailId,
        name: c.name,
        ...(c.category ? { category: c.category } : {}),
        ...(c.baseSpirit ? { baseSpirit: c.baseSpirit } : {}),
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
