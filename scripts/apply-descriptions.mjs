/**
 * One-shot: write the English descriptions from `descriptions-en.json` into the seed, and fix three
 * Dutch words that leaked into the canonical English layer.
 *
 * English is the source layer and Dutch is the overlay on top of it, so an empty English description
 * is the real gap even though the Dutch UI reads fine — `applyCatalogTranslations` falls back to
 * English, and a reader in English got nothing at all. This fills every IBA classic; the 24
 * alcohol-free recipes were written with theirs.
 *
 * Run once: `node scripts/apply-descriptions.mjs`. Re-running only fills what is still empty.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import shared from '@cocktailapp/shared';

const { slugify } = shared;
const here = dirname(fileURLToPath(import.meta.url));
const seedPath = join(here, '..', 'iba-cocktails-seed.json');
const seed = JSON.parse(readFileSync(seedPath, 'utf8'));

const descriptions = JSON.parse(readFileSync(join(here, 'descriptions-en.json'), 'utf8'));
delete descriptions._comment;

/** The seed authors most classics without an id, so match the way buildCatalog derives one. */
const idOf = (c) => c.id ?? slugify(c.name);

// Dutch names that leaked into the canonical English layer during the overlay work. The `call` is
// the recipe's own wording and is shown verbatim, so these read as Dutch inside an English recipe.
const CALL_FIXES = {
  Citroenwodka: 'Citron Vodka',
  Vanillewodka: 'Vanilla Vodka',
};

let filled = 0;
let calls = 0;
const unmatched = new Set(Object.keys(descriptions));

for (const c of seed.cocktails) {
  const id = idOf(c);
  unmatched.delete(id);

  const text = descriptions[id];
  if (text && !c.description?.trim()) {
    c.description = text;
    filled += 1;
  }

  for (const line of c.ingredients ?? []) {
    const fixed = CALL_FIXES[line.call];
    if (fixed) {
      line.call = fixed;
      calls += 1;
    }
  }
}

if (unmatched.size) {
  throw new Error(`description written for unknown cocktail id(s): ${[...unmatched].join(', ')}`);
}

const stillEmpty = seed.cocktails.filter((c) => !c.description?.trim()).map(idOf);
writeFileSync(seedPath, JSON.stringify(seed, null, 2) + '\n', 'utf8');

console.log(`filled ${filled} English descriptions, fixed ${calls} Dutch call names`);
console.log(stillEmpty.length ? `still empty: ${stillEmpty.join(', ')}` : 'every recipe now has one');
