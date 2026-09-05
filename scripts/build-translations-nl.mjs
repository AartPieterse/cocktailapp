/**
 * build-translations-nl.mjs — one-shot harvester for the Dutch overlay source.
 *
 * Produces scripts/translations-nl.json: an id-keyed Dutch overlay (CatalogTranslations without the
 * version — build-catalog.mjs stamps the current catalog version when it emits catalog.nl.json).
 *
 *   - ingredient names come from the authored NL_INGREDIENTS map below (one line per base id);
 *   - cocktail name/description/instructions/notes/garnish come from two sources, merged: the curated
 *     Dutch set in scripts/seed-data.mjs (matched to catalog ids by slug), plus
 *     scripts/translations-nl-cocktails.json for every other cocktail (seed-data.mjs wins on overlap).
 *     Any cocktail still without Dutch text keeps its canonical English (applyCatalogTranslations
 *     falls back). This replaces the retired SEED_SRC=nl fork — one id space, a display overlay on top.
 *
 *   - a cocktail's `variations` are overlaid too, keyed by CocktailVariation.key (NOT by array
 *     index): authored on either source as { variations: { '<key>': { name?, description? } } }.
 *     Every emitted key is checked against the built catalog and an unknown one FAILS the run —
 *     a silent skip here is exactly how a hand-written Dutch variation string went missing before.
 *
 * Re-run after editing NL_INGREDIENTS or seed-data.mjs, then rebuild the catalog. Usage:
 *   node scripts/build-translations-nl.mjs            # write scripts/translations-nl.json
 *   node scripts/build-translations-nl.mjs --check    # exit 1 if the file on disk is stale
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import shared from '@cocktailapp/shared';
import { cocktails as nlCocktails } from './seed-data.mjs';

const { slugify } = shared;
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

// Read the freshly built catalog so we only emit overlay entries for ids that actually exist.
const catalog = JSON.parse(
  readFileSync(join(root, 'frontend', 'public', 'catalog.json'), 'utf8'),
);
const ingredientIds = new Set(catalog.ingredients.map((i) => i.id));
const cocktailIds = new Set(catalog.cocktails.map((c) => c.id));
// Valid variation keys per cocktail id — an overlay key outside this set is a stale hand-edit.
const variationKeys = new Map(
  catalog.cocktails.map((c) => [c.id, new Set((c.variations ?? []).map((v) => v.key))]),
);
const check = process.argv.includes('--check');
const keyErrors = [];

/** Keep only variation overlay entries whose key exists on that cocktail; record the rest as errors. */
function pickVariations(id, variations) {
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
}

// Dutch for cocktails the curated seed-data.mjs set doesn't cover (id-keyed { name, description?,
// instructions[], notes?, garnish? }). Optional file — absent is fine.
let supplement = {};
try {
  supplement = JSON.parse(readFileSync(join(here, 'translations-nl-cocktails.json'), 'utf8'));
} catch {
  /* no supplement — curated set only */
}

/** Dutch display name per base id (canonical English lives in the seed; this only renames display). */
const NL_INGREDIENTS = {
  // spirits
  gin: 'Gin', vodka: 'Wodka', 'white-rum': 'Witte rum', 'dark-rum': 'Donkere rum',
  tequila: 'Tequila', mezcal: 'Mezcal', bourbon: 'Bourbon whiskey', 'rye-whiskey': 'Rye whiskey',
  'irish-whiskey': 'Ierse whiskey', scotch: 'Scotch whisky', brandy: 'Brandy', cognac: 'Cognac',
  calvados: 'Calvados', pisco: 'Pisco', cachaca: 'Cachaça', grappa: 'Grappa', absinthe: 'Absint',
  pernod: 'Pernod',
  // liqueurs
  'triple-sec': 'Triple sec', amaretto: 'Amaretto', amaro: 'Amaro', aperol: 'Aperol',
  'apricot-brandy': 'Abrikozenlikeur', benedictine: 'Bénédictine', 'cherry-liqueur': 'Kersenlikeur',
  'coffee-liqueur': 'Koffielikeur', 'creme-de-cacao': 'Crème de cacao',
  'creme-de-cassis': 'Crème de cassis', 'creme-de-menthe': 'Crème de menthe',
  'creme-de-mure': 'Crème de mûre', 'creme-de-violette': 'Crème de violette', drambuie: 'Drambuie',
  'fernet-branca': 'Fernet-Branca', 'green-chartreuse': 'Groene Chartreuse',
  'yellow-chartreuse': 'Gele Chartreuse', maraschino: 'Maraschinolikeur',
  'peach-schnapps': 'Perziklikeur', 'raspberry-liqueur': 'Frambozenlikeur', campari: 'Campari',
  'grand-marnier': 'Grand Marnier', cynar: 'Cynar', frangelico: 'Frangelico',
  'allspice-liqueur': 'Pimentlikeur', 'passion-fruit-liqueur': 'Passievruchtlikeur',
  // wine & vermouth
  'sweet-vermouth': 'Rode vermout', 'dry-vermouth': 'Droge vermout', 'lillet-blanc': 'Lillet Blanc',
  'sparkling-wine': 'Mousserende wijn', 'white-wine': 'Droge witte wijn', 'red-wine': 'Rode wijn',
  port: 'Tawny port',
  // mixers
  cola: 'Cola', 'soda-water': 'Sodawater', 'ginger-ale': 'Ginger ale', 'ginger-beer': 'Ginger beer',
  'grapefruit-soda': 'Grapefruitfrisdrank', 'tonic-water': 'Tonic',
  // juices
  'lime-juice': 'Vers limoensap', 'lemon-juice': 'Vers citroensap', 'orange-juice': 'Vers sinaasappelsap',
  'pineapple-juice': 'Ananassap', 'cranberry-juice': 'Cranberrysap', 'grapefruit-juice': 'Grapefruitsap',
  'tomato-juice': 'Tomatensap', 'sugar-cane-juice': 'Suikerrietsap', 'peach-puree': 'Perzikpuree',
  'passion-fruit-puree': 'Passievruchtpuree', 'passion-fruit-juice': 'Passievruchtsap',
  'apple-juice': 'Appelsap',
  // syrups (passion fruit)
  'passion-fruit-syrup': 'Passievruchtsiroop',
  // syrups
  'simple-syrup': 'Suikersiroop', grenadine: 'Grenadine', orgeat: 'Orgeat (amandelsiroop)',
  'honey-syrup': 'Honingsiroop', 'agave-syrup': 'Agavesiroop', 'elderflower-cordial': 'Vlierbloesemsiroop',
  falernum: 'Falernum', 'raspberry-syrup': 'Framboossiroop', 'donns-mix': "Donn's Mix",
  'chamomile-cordial': 'Kamillesiroop',
  // bitters
  'angostura-bitters': 'Angostura bitters', 'orange-bitters': 'Orange bitters',
  'peychauds-bitters': "Peychaud's bitters",
  // dairy & egg
  cream: 'Room', 'coconut-cream': 'Kokosroom', 'egg-white': 'Eiwit', 'egg-yolk': 'Eidooier',
  // seasoning
  salt: 'Zout', pepper: 'Peper', 'celery-salt': 'Selderijzout', tabasco: 'Tabasco',
  'worcestershire-sauce': 'Worcestershiresaus', 'orange-flower-water': 'Oranjebloesemwater',
  'vanilla-extract': 'Vanille-extract', 'black-pepper': 'Zwarte peper', cardamom: 'Kardemom',
  cinnamon: 'Kaneel', nutmeg: 'Nootmuskaat', coriander: 'Koriander', vanilla: 'Vanille',
  // produce
  mint: 'Munt', ginger: 'Gember', 'chili-pepper': 'Rode peper', basil: 'Basilicum',
  'maraschino-cherry': 'Cocktailkers', strawberries: 'Aardbeien',
  pineapple: 'Ananas', orange: 'Sinaasappel', lemon: 'Citroen', cloves: 'Kruidnagel',
  sherry: 'Sherry',
  // pantry & other
  sugar: 'Suiker', water: 'Water', coffee: 'Koffie', espresso: 'Espresso',
  ice: 'IJs', milk: 'Melk', tea: 'Thee',
};

const ingredients = {};
for (const [id, name] of Object.entries(NL_INGREDIENTS)) {
  if (ingredientIds.has(id)) ingredients[id] = { name };
}
const missing = [...ingredientIds].filter((id) => !ingredients[id]);
if (missing.length) console.warn(`  ⚠ no NL name for base id(s): ${missing.join(', ')}`);

const cocktails = {};
let matched = 0;
for (const c of nlCocktails) {
  const id = slugify(c.name);
  if (!cocktailIds.has(id)) continue;
  matched++;
  const curatedVariations = pickVariations(id, c.variations);
  cocktails[id] = {
    name: c.name,
    ...(c.description ? { description: c.description } : {}),
    ...(c.instructions?.length ? { instructions: c.instructions } : {}),
    ...(c.notes ? { notes: c.notes } : {}),
    ...(c.garnish ? { garnish: c.garnish } : {}),
    ...(curatedVariations ? { variations: curatedVariations } : {}),
  };
}

// Fill in cocktails the curated set doesn't cover (curated seed-data.mjs wins on overlap).
let fromSupplement = 0;
for (const [id, entry] of Object.entries(supplement)) {
  if (!cocktailIds.has(id)) continue;
  const entryVariations = pickVariations(id, entry.variations);
  const existing = cocktails[id];
  if (!existing) {
    cocktails[id] = {
      ...(entry.name ? { name: entry.name } : {}),
      ...(entry.description ? { description: entry.description } : {}),
      ...(entry.instructions?.length ? { instructions: entry.instructions } : {}),
      ...(entry.notes ? { notes: entry.notes } : {}),
      ...(entry.garnish ? { garnish: entry.garnish } : {}),
      ...(entryVariations ? { variations: entryVariations } : {}),
    };
    fromSupplement++;
    continue;
  }
  // The curated set already produced this cocktail and wins on overlap — but merge per FIELD, not
  // per entry, so a supplement can still contribute variations the curated entry doesn't carry.
  // (Skipping the whole entry here is why moving Dutch variation text into the supplement file
  // silently dropped it for every cocktail the curated set covers, caipirinha included.)
  if (entryVariations) {
    existing.variations = { ...entryVariations, ...(existing.variations ?? {}) };
  }
}

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
  `  cocktails:   ${matched + fromSupplement}/${cocktailIds.size} with Dutch text ` +
    `(${matched} curated + ${fromSupplement} supplement; rest fall back to English)`,
);
