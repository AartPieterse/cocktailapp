/**
 * The Dutch cocktail text, resolved from its two authored sources — used by BOTH the harvester that
 * emits the overlay (`build-translations-nl.mjs`) and the gate that refuses to ship an incomplete
 * one (`validate-seed.mjs` rule 18).
 *
 * It lives here, once, precisely because those two must never disagree: a gate that resolves the
 * text differently from the harvester would either pass text that never ships or fail text that
 * does. Everything about the merge — curated wins per entry, variations merge per key — is decided
 * in this file and nowhere else.
 *
 * The two sources:
 *   - `seed-data.mjs` — the curated Dutch set, matched to catalog ids by `slugify(name)`;
 *   - `translations-nl-cocktails.json` — an id-keyed supplement for everything the curated set
 *     doesn't cover. Optional; absent is fine.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import shared from '@cocktailapp/shared';
import { cocktails as nlCocktails } from './seed-data.mjs';

const { slugify } = shared;
const here = dirname(fileURLToPath(import.meta.url));

/** The id-keyed supplement, or `{}` when the file isn't there. */
export function readSupplement() {
  try {
    return JSON.parse(readFileSync(join(here, 'translations-nl-cocktails.json'), 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Resolve the Dutch entry for every cocktail in the built catalog.
 *
 * @param {Array<{id: string, variations?: Array<{key: string}>}>} builtCocktails
 * @returns {{
 *   entries: Record<string, object>,
 *   stats: { curated: number, supplement: number },
 *   keyErrors: string[],
 * }} `entries` is id-keyed and carries only the fields that were actually authored, so a caller can
 * tell "no Dutch description" from "an empty one". `keyErrors` lists variation keys the catalog does
 * not have — never silently dropped, because that is how hand-written Dutch text went missing once.
 */
export function resolveDutchCocktails(builtCocktails) {
  const cocktailIds = new Set(builtCocktails.map((c) => c.id));
  const variationKeys = new Map(
    builtCocktails.map((c) => [c.id, new Set((c.variations ?? []).map((v) => v.key))]),
  );
  const keyErrors = [];

  /** Keep only variation overlay entries whose key exists on that cocktail; record the rest. */
  const pickVariations = (id, variations) => {
    if (!variations) return undefined;
    const valid = variationKeys.get(id) ?? new Set();
    const kept = {};
    for (const [key, text] of Object.entries(variations)) {
      if (!valid.has(key)) {
        keyErrors.push(
          `cocktail "${id}" has Dutch text for variation key "${key}", which the catalog does not ` +
            `have (valid: ${[...valid].join(', ') || 'none'})`,
        );
        continue;
      }
      if (text?.name || text?.description !== undefined) kept[key] = text;
    }
    return Object.keys(kept).length ? kept : undefined;
  };

  const entries = {};
  let curated = 0;
  for (const c of nlCocktails) {
    const id = slugify(c.name);
    if (!cocktailIds.has(id)) continue;
    curated++;
    const variations = pickVariations(id, c.variations);
    entries[id] = {
      name: c.name,
      ...(c.description ? { description: c.description } : {}),
      ...(c.instructions?.length ? { instructions: c.instructions } : {}),
      ...(c.notes ? { notes: c.notes } : {}),
      ...(c.garnish ? { garnish: c.garnish } : {}),
      ...(variations ? { variations } : {}),
    };
  }

  // Fill in what the curated set doesn't cover (curated wins on overlap).
  let supplement = 0;
  for (const [id, entry] of Object.entries(readSupplement())) {
    if (!cocktailIds.has(id)) continue;
    const variations = pickVariations(id, entry.variations);
    const existing = entries[id];
    if (!existing) {
      entries[id] = {
        ...(entry.name ? { name: entry.name } : {}),
        ...(entry.description ? { description: entry.description } : {}),
        ...(entry.instructions?.length ? { instructions: entry.instructions } : {}),
        ...(entry.notes ? { notes: entry.notes } : {}),
        ...(entry.garnish ? { garnish: entry.garnish } : {}),
        ...(variations ? { variations } : {}),
      };
      supplement++;
      continue;
    }
    // The curated set wins on overlap — but merge per FIELD, not per entry, so a supplement can
    // still contribute variations the curated entry doesn't carry. (Skipping the whole entry here
    // is why moving Dutch variation text into the supplement silently dropped it for every cocktail
    // the curated set covers, caipirinha included.)
    if (variations) {
      existing.variations = { ...variations, ...(existing.variations ?? {}) };
    }
  }

  return { entries, stats: { curated, supplement }, keyErrors };
}
