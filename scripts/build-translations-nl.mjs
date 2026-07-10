/**
 * build-translations-nl.mjs — one-shot harvester for the Dutch overlay source.
 *
 * Produces scripts/translations-nl.json: an id-keyed Dutch overlay (CatalogTranslations without the
 * version — build-catalog.mjs stamps the current catalog version when it emits catalog.nl.json).
 *
 *   - ingredient names come from the authored NL_INGREDIENTS map below (one line per base id);
 *   - cocktail name/description/instructions/notes/garnish are harvested from the curated Dutch set
 *     in scripts/seed-data.mjs, matched to catalog ids by slug. Cocktails with no Dutch source keep
 *     their canonical English text (the overlay simply omits them; applyCatalogTranslations falls
 *     back). This replaces the retired SEED_SRC=nl fork — one id space, a display overlay on top.
 *
 * Re-run after editing NL_INGREDIENTS or seed-data.mjs, then rebuild the catalog. Usage:
 *   node scripts/build-translations-nl.mjs
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
  'grapefruit-soda': 'Grapefruitfrisdrank',
  // juices
  'lime-juice': 'Vers limoensap', 'lemon-juice': 'Vers citroensap', 'orange-juice': 'Vers sinaasappelsap',
  'pineapple-juice': 'Ananassap', 'cranberry-juice': 'Cranberrysap', 'grapefruit-juice': 'Grapefruitsap',
  'tomato-juice': 'Tomatensap', 'sugar-cane-juice': 'Suikerrietsap', 'peach-puree': 'Perzikpuree',
  'passion-fruit-puree': 'Passievruchtpuree',
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
  'vanilla-extract': 'Vanille-extract',
  // produce
  mint: 'Munt', ginger: 'Gember', 'chili-pepper': 'Rode peper', basil: 'Basilicum',
  pineapple: 'Ananas', orange: 'Sinaasappel', lemon: 'Citroen', cloves: 'Kruidnagel',
  sherry: 'Sherry',
  // pantry & other
  sugar: 'Suiker', water: 'Water', coffee: 'Koffie', espresso: 'Espresso',
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
  cocktails[id] = {
    name: c.name,
    ...(c.description ? { description: c.description } : {}),
    ...(c.instructions?.length ? { instructions: c.instructions } : {}),
    ...(c.notes ? { notes: c.notes } : {}),
    ...(c.garnish ? { garnish: c.garnish } : {}),
  };
}

const out = { ingredients, cocktails };
writeFileSync(
  join(here, 'translations-nl.json'),
  JSON.stringify(out, null, 2) + '\n',
  'utf8',
);
console.log('Dutch overlay source → scripts/translations-nl.json:');
console.log(`  ingredients: ${Object.keys(ingredients).length}/${ingredientIds.size} translated`);
console.log(`  cocktails:   ${matched}/${cocktailIds.size} with Dutch text (rest fall back to English)`);
