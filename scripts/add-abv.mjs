/**
 * One-shot: author `abv` on every alcoholic ingredient in the seed.
 *
 * Feeds `standardDrinks()`, which turns a recipe into one neutral line — "ongeveer 1,4
 * standaardglas alcohol per glas" — at the same visual weight as the glass line. It is deliberately
 * never a sort key, a badge or a "strongest cocktails" filter: strength is information, not a virtue.
 *
 * Figures are the common bottling strength for each category, not a specific brand. Where a range is
 * normal the middle of it is used, and the ones that vary most by producer are noted. A few points
 * either way move a serving by hundredths of a standaardglas, which is well inside the rounding the
 * UI does anyway — the number is honest about being an estimate, and the copy says "ongeveer".
 *
 * Run once: `node scripts/add-abv.mjs`. Re-running only fills what is still missing.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const seedPath = join(here, '..', 'iba-cocktails-seed.json');
const seed = JSON.parse(readFileSync(seedPath, 'utf8'));

const ABV = {
  // Spirits — the EU minimum is 37.5% for most white spirits; 40% is the usual bottling.
  gin: 40,
  vodka: 40,
  'white-rum': 37.5,
  'dark-rum': 40,
  tequila: 38,
  mezcal: 45,
  bourbon: 40,
  'rye-whiskey': 45,
  'irish-whiskey': 40,
  scotch: 40,
  brandy: 40,
  cognac: 40,
  calvados: 40,
  pisco: 42,
  cachaca: 40,
  grappa: 40,
  absinthe: 68, // varies wildly, 45–74; the classic Swiss bottling is around 68
  pernod: 40,

  // Liqueurs — the widest spread in the catalog, from 11% Aperol to 55% Chartreuse.
  'triple-sec': 30, // 15–40 depending on brand; Cointreau is 40, supermarket triple sec nearer 20
  amaretto: 28,
  amaro: 30, // an umbrella for a category that runs 16–40
  aperol: 11,
  'apricot-brandy': 24,
  benedictine: 40,
  'cherry-liqueur': 24,
  'coffee-liqueur': 20,
  'creme-de-cacao': 24,
  'creme-de-cassis': 20,
  'creme-de-menthe': 24,
  'creme-de-mure': 20,
  'creme-de-violette': 20,
  drambuie: 40,
  'fernet-branca': 39,
  'green-chartreuse': 55,
  'yellow-chartreuse': 40,
  maraschino: 32,
  'peach-schnapps': 20,
  'raspberry-liqueur': 20,
  campari: 25,
  'grand-marnier': 40,
  cynar: 16.5,
  frangelico: 20,
  'allspice-liqueur': 22,
  'passion-fruit-liqueur': 20,

  // Wine, vermouth and fortified.
  'sweet-vermouth': 16,
  'dry-vermouth': 18,
  'lillet-blanc': 17,
  'sparkling-wine': 12,
  'white-wine': 12,
  'red-wine': 13,
  port: 20,
  sherry: 17,

  // Bitters are strong but used in dashes, so they barely move a serving.
  'angostura-bitters': 44.7,
  'orange-bitters': 28,
  'peychauds-bitters': 35,
};

const ALCOHOLIC = new Set(['spirit', 'liqueur', 'wine', 'bitters']);
let filled = 0;
const missing = [];

for (const ing of seed.ingredients) {
  if (!ALCOHOLIC.has(ing.category)) continue;
  if (typeof ing.abv === 'number') continue;
  const abv = ABV[ing.id];
  if (abv === undefined) {
    missing.push(ing.id);
    continue;
  }
  ing.abv = abv;
  filled += 1;
}

// A non-alcoholic ingredient must never carry an abv — standardDrinks() would count it.
const stray = seed.ingredients.filter((i) => !ALCOHOLIC.has(i.category) && typeof i.abv === 'number');
if (stray.length) throw new Error(`abv on non-alcoholic ingredient(s): ${stray.map((i) => i.id).join(', ')}`);
if (missing.length) throw new Error(`no abv authored for: ${missing.join(', ')}`);

writeFileSync(seedPath, JSON.stringify(seed, null, 2) + '\n', 'utf8');
console.log(`filled abv on ${filled} alcoholic ingredients`);
