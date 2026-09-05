/**
 * build-translations-nl.mjs — one-shot harvester for the Dutch overlay source.
 *
 * Produces scripts/translations-nl.json: an id-keyed Dutch overlay (CatalogTranslations without the
 * version — build-catalog.mjs stamps the current catalog version when it emits catalog.nl.json).
 *
 *   - ingredient names come from scripts/translations-nl-ingredients.mjs (one line per base id,
 *     100% coverage enforced by validate-seed.mjs rule 17);
 *   - cocktail name/description/instructions/notes/garnish are resolved by
 *     scripts/translations-nl-text.mjs (shared with validate-seed.mjs rule 18) from two sources:
 *     the curated Dutch set in scripts/seed-data.mjs (matched to catalog ids by slug), plus
 *     scripts/translations-nl-cocktails.json for every other cocktail (seed-data.mjs wins on overlap).
 *     Any cocktail still without Dutch text keeps its canonical English (applyCatalogTranslations
 *     falls back). This replaces the retired SEED_SRC=nl fork — one id space, a display overlay on top.
 *
 *   - a cocktail's `variations` are overlaid too, keyed by CocktailVariation.key (NOT by array
 *     index): authored on either source as { variations: { '<key>': { name?, description? } } }.
 *     Every emitted key is checked against the built catalog and an unknown one FAILS the run —
 *     a silent skip here is exactly how a hand-written Dutch variation string went missing before.
 *
 * Re-run after editing translations-nl-ingredients.mjs or seed-data.mjs, then rebuild the
 * catalog. Usage:
 *   node scripts/build-translations-nl.mjs            # write scripts/translations-nl.json
 *   node scripts/build-translations-nl.mjs --check    # exit 1 if the file on disk is stale
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NL_INGREDIENTS } from './translations-nl-ingredients.mjs';
import { resolveDutchCocktails } from './translations-nl-text.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

// Read the freshly built catalog so we only emit overlay entries for ids that actually exist.
const catalog = JSON.parse(
  readFileSync(join(root, 'frontend', 'public', 'catalog.json'), 'utf8'),
);
const ingredientIds = new Set(catalog.ingredients.map((i) => i.id));
const check = process.argv.includes('--check');

const ingredients = {};
for (const [id, name] of Object.entries(NL_INGREDIENTS)) {
  if (ingredientIds.has(id)) ingredients[id] = { name };
}
const missing = [...ingredientIds].filter((id) => !ingredients[id]);
if (missing.length) console.warn(`  ⚠ no NL name for base id(s): ${missing.join(', ')}`);

// The merge itself lives in translations-nl-text.mjs, shared with validate-seed.mjs rule 18 — a gate
// that resolved the text differently from this harvester would gate text that never ships.
const { entries: cocktails, stats, keyErrors } = resolveDutchCocktails(catalog.cocktails);

if (keyErrors.length) {
  console.error(`✗ build-translations-nl: ${keyErrors.length} stale variation key(s):`);
  for (const e of keyErrors) console.error(`  - ${e}`);
  console.error('  Fix the key (or the source entry) — Dutch text is never dropped silently.');
  process.exit(1);
}

const out = { ingredients, cocktails };
const target = join(here, 'translations-nl.json');
const rendered = JSON.stringify(out, null, 2) + '\n';

if (check) {
  let onDisk = '';
  try {
    onDisk = readFileSync(target, 'utf8');
  } catch {
    /* a missing file counts as stale */
  }
  if (onDisk !== rendered) {
    console.error('✗ scripts/translations-nl.json is stale — run: npm run build:translations');
    process.exit(1);
  }
  console.log('✓ scripts/translations-nl.json is up to date.');
  process.exit(0);
}

writeFileSync(target, rendered, 'utf8');
console.log('Dutch overlay source → scripts/translations-nl.json:');
console.log(`  ingredients: ${Object.keys(ingredients).length}/${ingredientIds.size} translated`);
console.log(
  `  cocktails:   ${stats.curated + stats.supplement}/${catalog.cocktails.length} with Dutch text ` +
    `(${stats.curated} curated + ${stats.supplement} supplement; rest fall back to English)`,
);
