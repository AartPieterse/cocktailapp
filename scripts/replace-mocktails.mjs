/**
 * One-shot: swap the scraped alcohol-free import for 24 hand-written recipes.
 *
 * The 54 records tagged `mocktail` were a raw recipe dump — smoothies, milkshakes, lassi's, six
 * near-identical hot chocolates — carrying 0/54 garnish, 0/54 difficulty, 0/54 description, 0/54
 * Dutch translation, and typos left in the instructions. They were also the app's ONLY alcohol-free
 * content: none of the 102 IBA classics is alcohol-free, so deleting them without replacements would
 * leave the filter empty.
 *
 * This removes them, adds the 24 replacements from `zero-proof-recipes.json`, links 14 of them to
 * the classic they are the counterpart of, and drops the ingredients that existed only to serve the
 * import — keeping the pantry staples and anything the new recipes use.
 *
 * Run once: `node scripts/replace-mocktails.mjs`. Re-running is a no-op once the tag is gone.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const seedPath = join(here, '..', 'iba-cocktails-seed.json');
const seed = JSON.parse(readFileSync(seedPath, 'utf8'));
const plan = JSON.parse(readFileSync(join(here, 'zero-proof-recipes.json'), 'utf8'));

const isImport = (c) => (c.tags ?? []).includes('mocktail') && !plan.cocktails.some((n) => n.id === c.id);
const removed = seed.cocktails.filter(isImport);
if (!removed.length) {
  console.log('nothing to do — the scraped import is already gone');
  process.exit(0);
}

// --- cocktails -------------------------------------------------------------
const kept = seed.cocktails.filter((c) => !isImport(c));
const byName = new Map(kept.map((c) => [c.name, c]));

for (const [parentName, counterpartName] of Object.entries(plan.counterparts)) {
  const parent = byName.get(parentName);
  if (!parent) throw new Error(`counterpart parent "${parentName}" is not in the seed`);
  if (!plan.cocktails.some((c) => c.name === counterpartName)) {
    throw new Error(`counterpart "${counterpartName}" is not among the new recipes`);
  }
  parent.alcoholFreeCounterpart = counterpartName;
}

const cocktails = [...kept, ...plan.cocktails].sort((a, b) => a.name.localeCompare(b.name, 'en'));

// --- ingredients -----------------------------------------------------------
const ingredients = [...seed.ingredients];
for (const add of plan.newIngredients) {
  if (!ingredients.some((i) => i.id === add.id)) ingredients.push(add);
}

// Anything a surviving recipe names, by name or alias.
const alias = new Map();
for (const i of ingredients) {
  alias.set(i.name.toLowerCase(), i.id);
  for (const a of i.aliases ?? []) alias.set(a.toLowerCase(), i.id);
}
const stillUsed = new Set();
for (const c of cocktails) {
  for (const line of c.ingredients ?? []) {
    const id = alias.get(line.name.trim().toLowerCase());
    if (!id) throw new Error(`"${c.name}" references unknown ingredient "${line.name}"`);
    stillUsed.add(id);
    for (const alt of line.alternatives ?? []) {
      const altId = alias.get(alt.trim().toLowerCase());
      if (altId) stillUsed.add(altId);
    }
  }
}
// Substitution targets and parents must survive too, or expandCabinet breaks.
for (const i of ingredients) {
  if (!stillUsed.has(i.id)) continue;
  if (i.parentId) stillUsed.add(i.parentId);
  for (const sub of i.substitutes ?? []) stillUsed.add(sub);
}

const keepIngredient = (i) => i.isStaple || stillUsed.has(i.id);
const droppedIngredients = ingredients.filter((i) => !keepIngredient(i));
const finalIngredients = ingredients.filter(keepIngredient);

writeFileSync(
  seedPath,
  JSON.stringify({ ingredients: finalIngredients, cocktails }, null, 2) + '\n',
  'utf8',
);

console.log(`removed ${removed.length} scraped records, added ${plan.cocktails.length} written ones`);
console.log(`linked ${Object.keys(plan.counterparts).length} counterparts to their classic`);
console.log(`ingredients ${seed.ingredients.length} → ${finalIngredients.length} (dropped ${droppedIngredients.length})`);
console.log('dropped:', droppedIngredients.map((i) => i.name).join(', '));
