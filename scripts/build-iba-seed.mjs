/**
 * Generator: iba-cocktails-web.json  ->  iba-cocktails-seed.json
 *
 * Transforms the raw IBA export into a seed document shaped like the app schema
 * (@cocktailapp/shared). Decisions baked in (agreed with the user):
 *   - Language: English, verbatim IBA wording (names, methods, garnish, notes).
 *   - Ingredient catalog: MODERATE normalization — merge only casing/whitespace
 *     and obvious spelling variants (Whisky/Whiskey); keep type/brand distinctions.
 *   - Amounts kept in ml (source unit); the schema enum supports ml.
 *   - Trailing "Note:" / "NOTE:" / "Notes:" text is split out of the method into
 *     a separate `notes` field; the rest becomes `instructions` (one step / sentence).
 *   - `glass`, `method`, `difficulty` inferred from the method text (heuristic,
 *     easily overridden later).
 *   - IBA grouping kept in `category`.
 *
 * Output: { ingredients: [{name, category, isStaple?}], cocktails: [...] }
 * The catalog is DERIVED from the (normalized) ingredient names actually used, so
 * every cocktail line resolves against it — db-seed.mjs will never throw "unknown
 * ingredient".
 *
 * Re-run with:  node scripts/build-iba-seed.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
const SRC = join(ROOT, 'iba-cocktails-web.json');
const OUT = join(ROOT, 'iba-cocktails-seed.json');

const src = JSON.parse(readFileSync(SRC, 'utf8'));

/* ------------------------------------------------------------------ units --- */
// Target enum (shared/src/measure-unit.ts) + 3 additive units this dataset needs:
// splash, pinch, barspoon.  Anything not here makes the script throw (fail loud).
const KNOWN_UNITS = new Set([
  'part', 'ml', 'cl', 'piece', 'cube', 'drop', 'dash', 'teaspoon', 'tablespoon',
  'slice', 'wedge', 'sprig', 'topup', 'splash', 'pinch', 'barspoon',
]);
const UNIT_MAP = {
  ml: 'ml', cl: 'cl', part: 'part', parts: 'part',
  piece: 'piece', pieces: 'piece', pcs: 'piece', pc: 'piece',
  cube: 'cube', cubes: 'cube',
  drop: 'drop', drops: 'drop',
  dash: 'dash', dashes: 'dash',
  teaspoon: 'teaspoon', teaspoons: 'teaspoon', tsp: 'teaspoon',
  tablespoon: 'tablespoon', tablespoons: 'tablespoon', 'table spoon': 'tablespoon',
  'bar spoon': 'barspoon', 'bar spoons': 'barspoon', barspoon: 'barspoon',
  slice: 'slice', slices: 'slice',
  wedge: 'wedge', wedges: 'wedge',
  sprig: 'sprig', sprigs: 'sprig',
  topup: 'topup', 'top up': 'topup', 'fill up': 'topup',
  splash: 'splash', splashes: 'splash',
  pinch: 'pinch', pinches: 'pinch',
  shot: 'piece', // only use: "1 strong Espresso" -> treat as 1 piece
};
function mapUnit(raw) {
  const key = String(raw).trim().toLowerCase();
  const mapped = UNIT_MAP[key];
  if (!mapped) throw new Error(`Unmapped unit: "${raw}"`);
  if (!KNOWN_UNITS.has(mapped)) throw new Error(`Mapped to unknown unit: "${mapped}"`);
  return mapped;
}

/* ---------------------------------------------------------------- amounts --- */
// Returns { amount:number, note?:string }. Handles decimals, "few", ranges
// ("6-8"), and fractions ("1/2"). Throws on anything else.
function parseAmount(raw, mappedUnit) {
  const s = String(raw).trim().toLowerCase();
  if (/^\d+(\.\d+)?$/.test(s)) return { amount: Number(s) };
  if (s === 'few') return { amount: mappedUnit === 'drop' ? 3 : 2, note: 'few (to taste)' };
  const range = s.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
  if (range) return { amount: Number(range[1]), note: `${range[1]}–${range[2]}` };
  const frac = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) return { amount: Number(frac[1]) / Number(frac[2]) };
  throw new Error(`Unparseable quantity: "${raw}"`);
}

/* ------------------------------------------------------ ingredient catalog --- */
// MODERATE: canonical key merges casing + whitespace; a tiny alias map folds
// obvious spelling variants. Display name = most-frequent original spelling.
const KEY_ALIASES = {
  'rye whisky': 'rye whiskey', // spelling variant of the same thing
};
function canonKey(name) {
  let k = name.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
  return KEY_ALIASES[k] || k;
}

// Keyword classifier -> IngredientCategory. Order matters (first match wins).
function classify(name) {
  const n = name.toLowerCase();
  if (/bitters?\b/.test(n)) return 'bitters';
  if (/juice|puree|purée|nectar/.test(n)) return 'juice';
  if (/syrup|grenadine|orgeat|honey|agave (syrup|nectar)|cordial|falernum|donn/.test(n)) return 'syrup';
  if (/crème de|creme de|liqueur|triple sec|cointreau|curacao|curaçao|campari|aperol|vermouth|chartreuse|maraschino|galliano|kahl|drambuie|bénédictine|benedictine|amaretto|amaro|schnapps|lillet|cassis|mûre|mure|violette|menthe|fernet|chambord|elderflower|apricot brandy/.test(n)) return 'liqueur';
  if (/\bgin\b|vodka|\brum\b|\bron\b|whisk|bourbon|\brye\b|tequila|mezcal|cognac|brandy|cacha|aguardiente|grappa|calvados|absinthe|pisco|scotch/.test(n)) return 'spirit';
  if (/soda|cola|tonic|ginger (beer|ale)|prosecco|champagne|sparkling|\bwine\b|grapefruit soda/.test(n)) return 'mixer';
  if (/mint|lime|lemon|orange|cherry|nutmeg|salt|pepper|chili|chilli|ginger|grape|pineapple|celery|olive|zest/.test(n)) return 'garnish';
  return 'other';
}
function isStaple(name) {
  const n = name.toLowerCase();
  return /plain water|^water$|sugar|egg (white|yolk)|soda water|^cola$|coca cola|fresh (lemon|lime) juice|simple syrup|sugar syrup/.test(n);
}

/* --------------------------------------------------------- method parsing --- */
function splitNotes(method) {
  const re = /\s*\bnotes?\b\s*:\s*/i;
  const idx = method.search(re);
  if (idx === -1) return { body: method.trim(), notes: undefined };
  const body = method.slice(0, idx).trim();
  const notes = method.slice(idx).replace(re, '').trim();
  return { body, notes: notes || undefined };
}
function toInstructions(body) {
  return body
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
function inferGlass(text) {
  const t = text.toLowerCase();
  const rules = [
    [/nick\s*&?\s*nora/, 'nick_and_nora'],
    [/irish coffee/, 'mug'],
    [/julep/, 'mug'],
    [/hurricane/, 'hurricane'],
    [/collins/, 'collins'],
    [/flute|champagne (glass|flute)/, 'flute'],
    [/martini/, 'martini'],
    [/coupe/, 'coupe'],
    [/wine glass|goblet/, 'wine'],
    [/old[\s-]?fashioned|rocks/, 'rocks'],
    [/mug|mule cup|copper|terracotta|clay/, 'mug'],
    [/shot glass/, 'shot'],
    [/tall tumbler|highball/, 'highball'],
    [/small tumbler|tumbler/, 'rocks'],
    [/cobbler/, 'coupe'],
    [/cocktail glass/, 'coupe'],
  ];
  for (const [re, g] of rules) if (re.test(t)) return g;
  return undefined;
}
function inferMethod(text) {
  const t = text.toLowerCase();
  if (/muddle/.test(t)) return 'muddled';
  if (/blend/.test(t)) return 'blended';
  if (/shake|shaken/.test(t)) return 'shaken';
  if (/\bstir\b|mixing glass/.test(t)) return 'stirred';
  if (/build|directly int|mix the ingredients directly|combine/.test(t)) return 'build';
  if (/float|layer/.test(t)) return 'layered';
  return 'build';
}
function inferDifficulty(lines, methodText, methodKey) {
  const hasEgg = lines.some((l) => /egg/i.test(l.name));
  if (lines.length >= 6 || hasEgg || /dry shake|two minutes|one minute|double.?strain|rinse|30 bartenders/i.test(methodText)) {
    return 'advanced';
  }
  if (lines.length <= 3 && (methodKey === 'build' || methodKey === 'stirred')) return 'easy';
  if (lines.length <= 3) return 'easy';
  return 'medium';
}
function isOptional(direction, note) {
  return /optional|to taste|if requested|if desired/i.test(`${direction} ${note || ''}`);
}

/* ------------------------------------------------------------------ build --- */
const catalog = new Map(); // key -> { display counts, category, isStaple }
function registerIngredient(rawName) {
  const key = canonKey(rawName);
  const clean = rawName.trim().replace(/\s+/g, ' ');
  const display = clean.normalize('NFC');
  if (!catalog.has(key)) catalog.set(key, { counts: new Map() });
  const entry = catalog.get(key);
  entry.counts.set(display, (entry.counts.get(display) || 0) + 1);
  return key;
}
function displayFor(key) {
  const { counts } = catalog.get(key);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

const cocktails = [];
const coerced = [];        // report: non-numeric quantities
const noGlass = [];        // report: glass could not be inferred
const usedUnits = new Set();

for (const c of src) {
  const { body, notes } = splitNotes(c.method || '');
  const lines = (c.ingredients || []).map((ing) => {
    const unit = mapUnit(ing.unit);
    usedUnits.add(unit);
    const { amount, note: amtNote } = parseAmount(ing.quantity, unit);
    if (!/^\d+(\.\d+)?$/.test(String(ing.quantity).trim())) {
      coerced.push(`${c.name}: "${ing.quantity} ${ing.unit} ${ing.ingredient}" -> amount=${amount}`);
    }
    const key = registerIngredient(ing.ingredient);
    const notesArr = [ing.note, amtNote].filter(Boolean);
    const line = { _key: key, amount, unit };
    if (notesArr.length) line.note = notesArr.join('; ');
    if (isOptional(ing.direction, ing.note)) line.optional = true;
    return line;
  });

  const glass = inferGlass(c.method || '');
  const methodKey = inferMethod(c.method || '');
  if (!glass) noGlass.push(c.name);

  cocktails.push({
    _raw: c,
    name: c.name,
    category: c.category,
    glass,
    method: methodKey,
    difficulty: inferDifficulty(lines.map((l) => ({ name: l._key })), c.method || '', methodKey),
    garnish: c.garnish ? c.garnish.trim() : undefined,
    notes,
    instructions: toInstructions(body),
    lines,
  });
}

// Assign category + staple to each catalog entry now that all names are known.
const ingredients = [...catalog.keys()]
  .map((key) => {
    const name = displayFor(key);
    const out = { name, category: classify(name) };
    if (isStaple(name)) out.isStaple = true;
    return { key, ...out };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const keyToDisplay = new Map(ingredients.map((i) => [i.key, i.name]));

// Materialize final cocktail objects (resolve line keys -> display names, drop temp fields).
const finalCocktails = cocktails.map((c) => {
  const obj = { name: c.name, category: c.category };
  if (c.glass) obj.glass = c.glass;
  obj.method = c.method;
  obj.difficulty = c.difficulty;
  if (c.garnish) obj.garnish = c.garnish;
  if (c.notes) obj.notes = c.notes;
  obj.instructions = c.instructions;
  obj.ingredients = c.lines.map((l) => {
    const line = { name: keyToDisplay.get(l._key), amount: l.amount, unit: l.unit };
    if (l.note) line.note = l.note;
    if (l.optional) line.optional = true;
    return line;
  });
  return obj;
});

const finalIngredients = ingredients.map(({ key, ...rest }) => rest);

writeFileSync(
  OUT,
  JSON.stringify({ ingredients: finalIngredients, cocktails: finalCocktails }, null, 2) + '\n',
  'utf8',
);

/* ----------------------------------------------------------------- report --- */
const byCat = {};
for (const i of finalIngredients) byCat[i.category] = (byCat[i.category] || 0) + 1;
const catCount = {};
for (const c of finalCocktails) catCount[c.category] = (catCount[c.category] || 0) + 1;

console.log('=== IBA seed generated ===');
console.log(`cocktails: ${finalCocktails.length}`, catCount);
console.log(`ingredients: ${finalIngredients.length}`, byCat);
console.log(`units used: ${[...usedUnits].sort().join(', ')}`);
console.log(`\nnon-numeric quantities coerced (${coerced.length}):`);
coerced.forEach((l) => console.log('  ' + l));
console.log(`\nno glass inferred (${noGlass.length}): ${noGlass.join(', ')}`);

// Near-duplicate clusters: catalog names sharing a significant token, so the
// user can see what MODERATE left un-merged (candidates for LEAN later).
const stop = new Set(['fresh', 'the', 'of', 'a', 'juice', 'white', 'red', 'dry', 'sweet', 'or', 'and', 'up', 'with']);
const byToken = {};
for (const i of finalIngredients) {
  for (const tok of i.name.toLowerCase().split(/[^a-z]+/).filter((t) => t.length > 3 && !stop.has(t))) {
    (byToken[tok] ||= new Set()).add(i.name);
  }
}
console.log('\npossible near-duplicates (MODERATE kept these distinct):');
for (const [tok, names] of Object.entries(byToken)) {
  if (names.size > 1) console.log(`  ${tok}: ${[...names].join(' | ')}`);
}
