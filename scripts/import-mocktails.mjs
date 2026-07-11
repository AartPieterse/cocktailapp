/**
 * import-mocktails.mjs — one-time generator that folds the curated non-alcoholic mocktails
 * (scripts/mocktails-source.json, sourced from TheCocktailDB) into the hand-curated seed
 * (iba-cocktails-seed.json). Idempotent: it strips any previously-imported mocktails (tagged
 * `mocktail`) and their exclusively-mocktail ingredients before re-adding, so re-running produces
 * the same seed. After running, regenerate the catalog with `npm run build:catalog`.
 *
 * Only the 54 fully non-alcoholic drinks are imported; the 8 "optional_alcohol" entries are skipped
 * (they contain wine/rum/etc. and are not alcohol-free). Freeform community measures are mapped to
 * the app's MeasureUnit set (cups→ml, tsp/tblsp→spoons, cl/oz/parts kept, counts→piece); anything
 * unmappable keeps its original wording in the line `note`.
 *
 * Usage: node scripts/import-mocktails.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import shared from '@cocktailapp/shared';

const { slugify } = shared;
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const SEED = join(root, 'iba-cocktails-seed.json');
const SRC = join(here, 'mocktails-source.json');

const seed = JSON.parse(readFileSync(SEED, 'utf8'));
const src = JSON.parse(readFileSync(SRC, 'utf8'));

// ── Reuse near-duplicate existing bases instead of minting split ones. Keys are lowercased. ──
const ALIAS_TO_EXISTING = {
  'lemon juice': 'Fresh Lemon Juice',
  'lime juice': 'Fresh Lime Juice',
  'orange juice': 'Fresh Orange Juice',
  'sugar syrup': 'Simple Syrup',
  'coca-cola': 'Cola',
};

// ── Category for each NEW mocktail base (everything else already exists in the seed). ──
const CATEGORY = {
  // juices
  'Apple juice': 'juice', 'Fruit juice': 'juice', 'Grape juice': 'juice',
  'Guava juice': 'juice', 'Passion fruit juice': 'juice', 'Peach nectar': 'juice',
  // syrups / sweeteners
  'Chocolate syrup': 'syrup', 'Mint syrup': 'syrup', 'Honey': 'syrup',
  // mixers
  'Carbonated soft drink': 'mixer',
  // dairy & egg
  Butter: 'dairy', 'Condensed milk': 'dairy', 'Half-and-half': 'dairy',
  'Heavy cream': 'dairy', Milk: 'dairy', 'Whipped cream': 'dairy',
  'Whipping cream': 'dairy', Yoghurt: 'dairy', Egg: 'dairy',
  // seasoning / spices
  'Almond flavoring': 'seasoning', Asafoetida: 'seasoning', 'Black pepper': 'seasoning',
  'Brown sugar': 'seasoning', Cardamom: 'seasoning', 'Cayenne pepper': 'seasoning',
  Cinnamon: 'seasoning', Coriander: 'seasoning', Cornstarch: 'seasoning',
  'Cumin seed': 'seasoning', Nutmeg: 'seasoning', Vanilla: 'seasoning',
  // garnish
  'Lime peel': 'garnish', 'Maraschino cherry': 'garnish', 'Orange peel': 'garnish',
  Marshmallows: 'garnish',
  // other (fruit bodies, cocoa, tea, ice…)
  Apple: 'other', Banana: 'other', Berries: 'other', Cantaloupe: 'other',
  Carrot: 'other', Chocolate: 'other', 'Cocoa powder': 'other', Fruit: 'other',
  Grapes: 'other', Ice: 'other', Kiwi: 'other', Lime: 'other', Mango: 'other',
  Papaya: 'other', Sherbet: 'other', Strawberries: 'other', Tea: 'other',
};
const STAPLE = new Set(['Ice', 'Milk']);

const GLASS = {
  'highball glass': 'highball', 'collins glass': 'collins', 'cocktail glass': 'coupe',
  'coffee mug': 'mug', 'coffee glass': 'mug', 'white wine glass': 'wine',
  'irish coffee cup': 'mug', 'parfait glass': 'hurricane',
  // punch bowl / pitcher have no matching glass → left undefined
};

/** Category → default line role, so garnishes/seasonings never block "wat kan ik maken". */
const ROLE_BY_CATEGORY = { garnish: 'garnish', seasoning: 'seasoning' };

// Existing base names (lowercased) so we reuse rather than duplicate.
const existingByLower = new Map(seed.ingredients.map((i) => [i.name.toLowerCase(), i]));

// ── Idempotency: drop previously-imported mocktails and their mocktail-only bases. ──
seed.cocktails = seed.cocktails.filter((c) => !(c.tags ?? []).includes('mocktail'));

// Which bases are still referenced by the remaining (IBA) cocktails?
const referenced = new Set();
for (const c of seed.cocktails) for (const l of c.ingredients ?? []) referenced.add(l.name.toLowerCase());
// Keep an ingredient if it is referenced OR was not one we minted (heuristic: minted ones carry no
// aliases/parent and match our CATEGORY map names). Simplest safe rule: only prune bases whose name
// is in CATEGORY (i.e. ones this importer introduces) and are now unreferenced.
const mintedNames = new Set(Object.keys(CATEGORY).map((n) => n.toLowerCase()));
seed.ingredients = seed.ingredients.filter(
  (i) => referenced.has(i.name.toLowerCase()) || !mintedNames.has(i.name.toLowerCase()),
);

// Rebuild the lookup after pruning.
existingByLower.clear();
for (const i of seed.ingredients) existingByLower.set(i.name.toLowerCase(), i);

const usedIds = new Set(seed.ingredients.map((i) => i.id));

/** Resolve a raw mocktail ingredient name to a seed base name, adding a new base if needed. */
function resolveBase(rawName) {
  const key = rawName.toLowerCase();
  if (ALIAS_TO_EXISTING[key]) return ALIAS_TO_EXISTING[key];
  if (existingByLower.has(key)) return existingByLower.get(key).name;

  // New base — mint it.
  const category = CATEGORY[rawName] ?? 'other';
  let id = slugify(rawName) || 'item';
  let n = 2;
  while (usedIds.has(id)) id = `${slugify(rawName)}-${n++}`;
  usedIds.add(id);
  const base = {
    id,
    name: rawName,
    category,
    ...(STAPLE.has(rawName) ? { isStaple: true } : {}),
  };
  seed.ingredients.push(base);
  existingByLower.set(key, base);
  return rawName;
}

const FRAC = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };

/** Parse a leading quantity → { amount, amountMax? } or null. Handles "1 1/2", "3/4", "3-4". */
function parseQty(text) {
  const t = text.trim().replace(/[½¼¾⅓⅔]/g, (c) => ` ${FRAC[c]}`).trim();
  // range a-b (integers/decimals)
  const range = t.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
  if (range) return { amount: +range[1], amountMax: +range[2] };
  // mixed "1 1/2"
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)/);
  if (mixed) return { amount: +mixed[1] + +mixed[2] / +mixed[3] };
  // fraction "3/4"
  const frac = t.match(/^(\d+)\/(\d+)/);
  if (frac) return { amount: +frac[1] / +frac[2] };
  // plain number
  const num = t.match(/^(\d+(?:\.\d+)?)/);
  if (num) return { amount: +num[1] };
  return null;
}

const round = (n) => Math.round(n * 100) / 100;

/**
 * Map a freeform measure string to { amount?, amountMax?, unit, note? }. Volume cooking units are
 * converted to ml; spoons/parts/counts kept; unmappable qualifiers preserved in `note`.
 */
function parseMeasure(measure) {
  const raw = (measure ?? '').trim();
  if (!raw) return { unit: 'piece' };
  const low = raw.toLowerCase();
  const qty = parseQty(raw);
  const scale = (factor, unit) =>
    qty
      ? {
          amount: round(qty.amount * factor),
          ...(qty.amountMax !== undefined ? { amountMax: round(qty.amountMax * factor) } : {}),
          unit,
        }
      : { unit };

  // Volume units (some converted to ml).
  if (/\bcl\b/.test(low)) return withNote(scale(1, 'cl'), raw, /cl/);
  if (/\boz\b/.test(low)) return withNote(scale(1, 'oz'), raw, /oz/);
  if (/\bml\b/.test(low)) return withNote(scale(1, 'ml'), raw, /ml/);
  if (/\bdl\b/.test(low)) return withNote(scale(100, 'ml'), raw, /dl/);
  if (/\bgal\b/.test(low)) return withNote(scale(3785, 'ml'), raw, /gal/);
  if (/\bqt\b/.test(low)) return withNote(scale(946, 'ml'), raw, /qt/);
  if (/\bcups?\b/.test(low)) return withNote(scale(240, 'ml'), raw, /cups?/);
  if (/\bl\b/.test(low)) return withNote(scale(1000, 'ml'), raw, /l/);
  // Spoons / dashes / parts.
  if (/\bt(ea)?sp\b|teaspoon/.test(low)) return withNote(scale(1, 'teaspoon'), raw, /t(ea)?sp\.?|teaspoon/);
  if (/\btb(l)?sp\b|tablespoon/.test(low)) return withNote(scale(1, 'tablespoon'), raw, /tb(l)?sp\.?|tablespoon/);
  if (/\bparts?\b/.test(low)) return withNote(scale(1, 'part'), raw, /parts?/);
  if (/\bdash(es)?\b/.test(low)) return withNote(scale(1, 'dash'), raw, /dash(es)?/);
  if (/\bdrops?\b/.test(low)) return withNote(scale(1, 'drop'), raw, /drops?/);
  if (/\bpinch\b/.test(low)) return withNote(scale(1, 'pinch'), raw, /pinch/);
  if (/\bsplash\b/.test(low)) return withNote(scale(1, 'splash'), raw, /splash/);
  if (/\bslices?\b/.test(low)) return withNote(scale(1, 'slice'), raw, /slices?/);
  if (/\bsticks?\b/.test(low)) return withNote(scale(1, 'piece'), raw, /sticks?/);

  // A bare count ("1", "2", "1/2") → a piece; keep any trailing words as a note.
  if (qty) return withNote({ ...scale(1, 'piece') }, raw, /^\s*[\d/.\s-]+/);
  // Purely descriptive ("to taste", "garnish", "fresh") — no amount.
  return { unit: 'piece', note: tidy(raw) };
}

/** Attach the leftover descriptive words (after removing qty + the matched unit token) as a note. */
function withNote(parsed, raw, unitRe) {
  const leftover = tidy(
    raw
      .replace(/^\s*[\d/.\s½¼¾⅓⅔-]+/, ' ')
      .replace(unitRe, ' ')
      .replace(/\bcold|hot\b/g, (m) => m), // keep temperature words
  );
  return leftover ? { ...parsed, note: leftover } : parsed;
}

function tidy(s) {
  const out = s
    .replace(/[(),]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return out && !/^\d+$/.test(out) ? out : '';
}

function inferMethod(instr) {
  const t = instr.toLowerCase();
  if (/blend|liquif|whiz|blender/.test(t)) return 'blended';
  if (/shake/.test(t)) return 'shaken';
  if (/muddle/.test(t)) return 'muddled';
  if (/stir/.test(t)) return 'stirred';
  return 'build';
}

function splitSteps(instr) {
  return (instr ?? '')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ── Build the cocktail entries. ──
const usedCocktailIds = new Set(seed.cocktails.map((c) => c.id ?? slugify(c.name)));
let added = 0;
for (const m of src.mocktails ?? []) {
  const lines = m.ingredients.map((ing) => {
    const baseName = resolveBase(ing.ingredient);
    const base = existingByLower.get(baseName.toLowerCase());
    const parsed = parseMeasure(ing.measure);
    const role = ROLE_BY_CATEGORY[base?.category];
    const call = ing.ingredient !== baseName ? ing.ingredient : undefined;
    return {
      name: baseName,
      ...(call ? { call } : {}),
      ...(parsed.amount !== undefined ? { amount: parsed.amount } : {}),
      ...(parsed.amountMax !== undefined ? { amountMax: parsed.amountMax } : {}),
      unit: parsed.unit,
      ...(parsed.note ? { note: parsed.note } : {}),
      ...(role ? { role } : {}),
    };
  });

  let id = slugify(m.name);
  let n = 2;
  while (usedCocktailIds.has(id)) id = `${slugify(m.name)}-${n++}`;
  usedCocktailIds.add(id);

  const glass = GLASS[(m.glass ?? '').toLowerCase()];
  seed.cocktails.push({
    id,
    name: m.name,
    baseSpirit: 'none',
    ...(m.category ? { category: m.category } : {}),
    description: '',
    instructions: splitSteps(m.instructions),
    ingredients: lines,
    ...(glass ? { glass } : {}),
    method: inferMethod(m.instructions ?? ''),
    tags: ['mocktail'],
  });
  added++;
}

// Deterministic seed ordering (by name) is not required — buildCatalog re-sorts — but keep the
// file tidy: ingredients then cocktails, each preserving insertion order.
writeFileSync(SEED, JSON.stringify(seed, null, 2) + '\n', 'utf8');
console.log(
  `Imported ${added} mocktails. Seed now: ${seed.ingredients.length} ingredients, ${seed.cocktails.length} cocktails.`,
);
