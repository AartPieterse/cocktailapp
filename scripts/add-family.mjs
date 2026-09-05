/**
 * One-shot: author `family` — the structural template — on every recipe.
 *
 * Derived where the data is unambiguous and overridden by hand where it is not. Deriving alone gets
 * roughly four in five right; the misses are all the same kind, where an ingredient plays a role its
 * category does not reveal. Triple sec is both a spirit and the sweetener in a Margarita, orange
 * juice is not a souring agent even though it is a citrus juice, and a Bloody Mary has lemon in it
 * without being a sour in any useful sense.
 *
 * Family is orthogonal to whether a drink contains alcohol: a Virgin Mojito is a fizz and a Virgin
 * Mary is savoury. Folding "alcohol-free" in as a family would rebuild the separation this catalog
 * just removed.
 *
 * Run once: `node scripts/add-family.mjs`. Re-running only fills what is missing.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const seedPath = join(here, '..', 'iba-cocktails-seed.json');
const seed = JSON.parse(readFileSync(seedPath, 'utf8'));

const byName = new Map();
for (const i of seed.ingredients) {
  byName.set(i.name.toLowerCase(), i);
  for (const a of i.aliases ?? []) byName.set(a.toLowerCase(), i);
}
const idOf = (line) => byName.get(line.name.trim().toLowerCase())?.id;
const catOf = (line) => byName.get(line.name.trim().toLowerCase())?.category;

const pours = (c) =>
  (c.ingredients ?? []).filter((l) => !l.optional && l.role !== 'garnish' && l.role !== 'seasoning');
const hasId = (c, ids) => pours(c).some((l) => ids.includes(idOf(l)));
const hasCat = (c, cats) => pours(c).some((l) => cats.includes(catOf(l)));

const CITRUS = ['lemon-juice', 'lime-juice', 'grapefruit-juice'];
const LONG = ['cola', 'soda-water', 'ginger-ale', 'ginger-beer', 'grapefruit-soda', 'tonic-water'];
const CREAM = ['cream', 'coconut-cream', 'egg-yolk', 'milk'];
const HOT = ['coffee', 'espresso', 'tea'];
const RUMS = ['white-rum', 'dark-rum', 'aged-rum', 'jamaican-rum', 'demerara-rum', 'cachaca'];

/** Ambiguous by structure — an ingredient is playing a role its category does not show. */
const OVERRIDES = {
  // Lemon juice, but seasoning rather than sweetness carries these.
  'Bloody Mary': 'savoury',
  'Virgin Mary': 'savoury',
  // Long fruit drinks: the juice is the length, not the acid.
  'Sea Breeze': 'highball',
  Garibaldi: 'highball',
  'Tequila Sunrise': 'highball',
  Sunrise: 'highball',
  'Sex on the Beach': 'highball',
  'Cranberry Breeze': 'highball',
  'Apple and Ginger': 'highball',
  'Espresso Tonic': 'highball',
  'Roy Rogers': 'highball',
  'Shirley Temple': 'highball',
  'Arnold Palmer': 'highball',
  'Ginger Mule': 'highball',
  'Virgin Paloma': 'highball',
  'Passion Fruit Cooler': 'fizz',
  'Basil Lemonade': 'fizz',
  'Strawberry Lemonade': 'fizz',
  'Lemon Fizz': 'fizz',
  // Tropical builds the ingredient count alone does not catch.
  'Jungle Bird': 'tiki',
  'Chartreuse Swizzle': 'tiki',
  "Planter's Punch": 'tiki',
  "Missionary's Downfall": 'tiki',
  'Pineapple Swizzle': 'tiki',
  'Virgin Colada': 'creamy',
  // Fruit-forward but still sours: orange and pineapple stand in for the sweet, not the acid.
  'French Martini': 'sour',
  'Mary Pickford': 'sour',
  'Monkey Gland': 'sour',
  Paradise: 'sour',
  'Sherry Cobbler': 'sour',
  'Honey and Lemon': 'sour',
  'Agave and Lime': 'sour',
  'Chamomile and Honey': 'sour',
  'Raspberry Sour': 'sour',
  // Wine and coffee drinks that are their own shape.
  KIR: 'sparkling',
  'Espresso Martini': 'spirit-forward',
  'Cardamom Coffee': 'hot',
  'Cinnamon Orange': 'hot',
  'Vienna Coffee': 'hot',
};

function derive(c) {
  if (c.glass === 'mug' && hasId(c, HOT)) return 'hot';
  if (hasId(c, ['sparkling-wine'])) return 'sparkling';
  if (hasId(c, CREAM)) return 'creamy';
  const rums = pours(c).filter((l) => RUMS.includes(idOf(l))).length;
  if (rums >= 2 || pours(c).length >= 7) return 'tiki';
  const citrus = hasId(c, CITRUS);
  const long = hasId(c, LONG);
  if (citrus && long) return 'fizz';
  if (long) return 'highball';
  if (citrus) return 'sour';
  if (hasCat(c, ['spirit', 'liqueur', 'wine', 'bitters'])) return 'spirit-forward';
  return 'highball';
}

const unknownOverride = Object.keys(OVERRIDES).filter((n) => !seed.cocktails.some((c) => c.name === n));
if (unknownOverride.length) throw new Error(`override names no recipe: ${unknownOverride.join(', ')}`);

let derived = 0;
let overridden = 0;
const counts = {};

for (const c of seed.cocktails) {
  if (c.family) continue;
  const override = OVERRIDES[c.name];
  c.family = override ?? derive(c);
  if (override) overridden += 1;
  else derived += 1;
  counts[c.family] = (counts[c.family] ?? 0) + 1;
}

writeFileSync(seedPath, JSON.stringify(seed, null, 2) + '\n', 'utf8');
console.log(`family set on ${derived + overridden} recipes (${derived} derived, ${overridden} by hand)`);
for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(v).padStart(3)}  ${k}`);
}
