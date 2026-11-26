import {
  type Cocktail,
  DRINK_FAMILIES,
  type DrinkFamily,
  type Ingredient,
  isAlcoholFree,
  variationRecipe,
} from '@cocktailapp/shared';

/**
 * The guest menu travels entirely in its link: `/menu?t=<title>&m=<keys>`. Nothing is stored, so
 * there is nothing to sync, secure or clean up, and a guest's phone needs no account.
 *
 * `m` is a comma-separated list of explicit keys, `cocktailId` or `cocktailId~variationKey`. Not an
 * index bitset: `catalog-ids.lock.json` is alphabetical, so an index shifts as soon as a cocktail is
 * added. Keys the catalog does not know (a link made before a catalog change) are skipped silently.
 *
 * See docs/plans/gastenmenu.md.
 */

/** The host's title is a heading, not a message. */
export const MENU_TITLE_MAX = 40;
/** Above this many drinks the QR code gets dense; the host screen suggests a shorter menu. */
export const MENU_LONG = 80;
/** A hand-edited link cannot make the guest page build an unbounded list. */
const MAX_KEYS = 300;
/** Catalog ids and variation keys are slugs (see `buildCatalog`). */
const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;

/** One drink on the menu, as it appears in the link. */
export interface MenuKey {
  /** The key as written in the link: `negroni` or `caipirinha~caipiroska`. */
  key: string;
  cocktailId: string;
  variationKey?: string;
}

/** A menu entry the catalog could resolve. */
export interface MenuEntry {
  key: string;
  /** For a variation: the variant recipe, under its parent's id (see `variationRecipe`). */
  cocktail: Cocktail;
  variationKey?: string;
  /** The parent's display name, set for a variation. */
  parentName?: string;
  alcoholFree: boolean;
}

/** A family's section of the menu. `family` is null for drinks without one (shown last). */
export interface MenuSection<T> {
  family: DrinkFamily | null;
  items: T[];
}

/** The link key for a drink: its id, or `id~variationKey` for a variation. */
export function menuKey(cocktailId: string, variationKey?: string | null): string {
  return variationKey ? `${cocktailId}~${variationKey}` : cocktailId;
}

/**
 * The host's title as a guest sees it: control characters removed, whitespace collapsed, at most
 * {@link MENU_TITLE_MAX} characters. Null when nothing is left, so the page falls back to its
 * default. Escaping for display is Angular's text interpolation; this never reaches innerHTML.
 */
export function cleanTitle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const text = raw
    .replace(/\p{Cc}/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  // Array.from counts code points, so an emoji or accented letter is never cut in half.
  return Array.from(text).slice(0, MENU_TITLE_MAX).join('').trim() || null;
}

/** The `m` parameter as keys: malformed and duplicate entries are dropped, order is kept. */
export function parseMenuKeys(raw: string | null | undefined): MenuKey[] {
  if (!raw) return [];
  const out: MenuKey[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(',')) {
    if (out.length >= MAX_KEYS) break;
    const key = part.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    const [cocktailId, variationKey, extra] = key.split('~');
    if (extra !== undefined || !SLUG.test(cocktailId)) continue;
    if (variationKey !== undefined && !SLUG.test(variationKey)) continue;
    seen.add(key);
    out.push(variationKey ? { key, cocktailId, variationKey } : { key, cocktailId });
  }
  return out;
}

/**
 * The link for a menu. `origin` is `location.origin`, so the code works on whatever address the
 * host is using (`http://192.168.1.100` on the home network). Keys are slugs and `~` is unreserved,
 * so only the title needs encoding; commas stay literal to keep the QR code small.
 */
export function buildMenuUrl(
  origin: string,
  title: string | null,
  keys: readonly string[],
): string {
  const t = cleanTitle(title);
  const m = keys.map(encodeURIComponent).join(',');
  return `${origin.replace(/\/+$/, '')}/menu?${t ? `t=${encodeURIComponent(t)}&` : ''}m=${m}`;
}

/**
 * Resolve the link's keys against the catalog. An unknown cocktail is skipped; so is a variation
 * whose parent is unknown, whose key the parent does not have, or that has no recipe of its own.
 */
export function resolveMenu(
  keys: readonly MenuKey[],
  cocktails: readonly Cocktail[],
  ingredients: readonly Ingredient[],
): MenuEntry[] {
  const byId = new Map(cocktails.map((c) => [c.id, c]));
  const names = new Map(ingredients.map((i) => [i.id, i.name]));
  const out: MenuEntry[] = [];
  for (const k of keys) {
    const parent = byId.get(k.cocktailId);
    if (!parent) continue;
    if (!k.variationKey) {
      out.push({ key: k.key, cocktail: parent, alcoholFree: isAlcoholFree(parent, ingredients) });
      continue;
    }
    const variation = parent.variations?.find((v) => v.key === k.variationKey);
    const recipe = variation && variationRecipe(parent, variation, (id) => names.get(id));
    if (!recipe) continue;
    out.push({
      key: k.key,
      cocktail: recipe,
      variationKey: k.variationKey,
      parentName: parent.name,
      alcoholFree: isAlcoholFree(recipe, ingredients),
    });
  }
  return out;
}

/**
 * Sections in `DRINK_FAMILIES` order, empty families left out, drinks without a family last. Within
 * a section the drinks are alphabetical, so the menu reads the same however the link was ordered.
 */
export function groupByFamily<T extends { cocktail: Pick<Cocktail, 'family' | 'name'> }>(
  items: readonly T[],
  locale = 'nl',
): MenuSection<T>[] {
  const buckets = new Map<DrinkFamily | null, T[]>();
  for (const item of items) {
    const family = DRINK_FAMILIES.includes(item.cocktail.family as DrinkFamily)
      ? (item.cocktail.family as DrinkFamily)
      : null;
    const list = buckets.get(family) ?? [];
    list.push(item);
    buckets.set(family, list);
  }
  const order: (DrinkFamily | null)[] = [...DRINK_FAMILIES, null];
  return order
    .filter((f) => buckets.has(f))
    .map((family) => ({
      family,
      items: buckets
        .get(family)!
        .slice()
        .sort((a, b) => a.cocktail.name.localeCompare(b.cocktail.name, locale)),
    }));
}
