import {
  type Cocktail,
  DRINK_FAMILIES,
  type DrinkFamily,
  type MakeableResult,
} from '@cocktailapp/shared';

/**
 * Pure helpers behind the "Ontdek" screen. Everything that rotates does so by the LOCAL calendar
 * day, so the page reads like a menu that is set once in the morning: the same pick all day, a
 * new one tomorrow, and never a different drink on every reload.
 */

/** Whole days since the epoch, counted in the viewer's own time zone. */
export function dayIndex(date: Date = new Date()): number {
  const local = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor(local / 86_400_000);
}

/**
 * Spread consecutive days across the pool. Plain `day % length` walks an alphabetical list one
 * name at a time, so Monday's Daiquiri is followed by Tuesday's Don's Special Daiquiri.
 */
function spread(day: number): number {
  // MurmurHash3's finaliser: every input bit reaches every output bit, so `% length` is fair.
  let h = day >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * The day's pick from `pool`, stepped `offset` places on by the "something else" button. The pool
 * is ordered by `keyOf` first, so the result depends on WHAT is in it, not on the order a service
 * happened to return it in.
 */
export function pickOfTheDay<T>(
  pool: readonly T[],
  keyOf: (item: T) => string,
  day: number,
  offset = 0,
): T | null {
  if (!pool.length) return null;
  const ordered = [...pool].sort((a, b) => keyOf(a).localeCompare(keyOf(b)));
  return ordered[(spread(day) + offset) % ordered.length];
}

/**
 * A family to put in the spotlight. Two steps a day through the nine, so every family comes round
 * once in nine days and neighbours in the list (sour, spirit-forward) never follow each other.
 */
export function familyOfTheDay(day: number): DrinkFamily {
  const n = DRINK_FAMILIES.length;
  return DRINK_FAMILIES[(((day * 2) % n) + n) % n];
}

/** A variation shares its parent's id, so the pair is what identifies a result. */
export function resultKey(r: Pick<MakeableResult, 'cocktail' | 'variation'>): string {
  return r.variation ? `${r.cocktail.id}/${r.variation.key}` : r.cocktail.id;
}

/**
 * The lines that make the drink, as a short list of names: no garnish, nothing optional, no
 * seasoning. The point is "gin, Campari, red vermouth" at a glance, not the full spec.
 */
export function ingredientNames(cocktail: Cocktail, max = 5): string[] {
  const names = cocktail.ingredients
    .filter((l) => !l.optional && (l.role ?? 'ingredient') === 'ingredient')
    .map((l) => l.name);
  return [...new Set(names)].slice(0, max);
}

/**
 * Up to `max` example drinks for a family, preferring the ones this bar already makes so the
 * spotlight points at something the reader can pour tonight, then filling from the menu.
 */
export function familyExamples(
  family: DrinkFamily,
  makeable: readonly Cocktail[],
  menu: readonly Cocktail[],
  max = 3,
): Cocktail[] {
  const out: Cocktail[] = [];
  const seen = new Set<string>();
  for (const c of [...makeable, ...menu]) {
    if (out.length >= max) break;
    if (c.family !== family || seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
  }
  return out;
}
