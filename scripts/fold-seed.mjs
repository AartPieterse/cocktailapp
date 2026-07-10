/**
 * fold-seed.mjs — the ONE-SHOT fold that mints the frozen, hand-curated seed.
 *
 * Reads the archived IBA draft (scripts/iba-cocktails-raw.json, the output of the retired
 * build-iba-seed.mjs) and the raw-name → base map (scripts/canonical-map.json), and rewrites it
 * into the two-level model described in docs/data-model-refinement.md:
 *
 *   - ingredients collapse from ~152 verbatim specifics to ~93 canonical BASES with authored,
 *     immutable slug ids; folded spellings/brands are preserved as `aliases[]` for search;
 *   - every cocktail line keeps the BASE identity (`name`) and carries the recipe's verbatim wording
 *     as `call`; ranges in notes become `amount`/`amountMax`; "X or Y" lines gain `alternatives`;
 *   - `role` is set for seasoning bases and `optional` is derived from "to taste"/"optional" notes,
 *     with a small hand-audit override table for the cases a note can't express.
 *
 * The result is written to iba-cocktails-seed.json, which becomes the FROZEN, hand-curated source
 * of truth — you edit that JSON directly from now on; nothing regenerates it. This script and its
 * inputs are kept only as documentation of the one-time fold.
 *
 * Idempotent: it reads the archived raw draft (never its own output), so re-running reproduces the
 * same frozen seed. Usage: node scripts/fold-seed.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const raw = JSON.parse(readFileSync(join(here, 'iba-cocktails-raw.json'), 'utf8'));
const canonical = JSON.parse(readFileSync(join(here, 'canonical-map.json'), 'utf8'));
delete canonical.__doc__;

/**
 * The canonical BASE catalog: one row per stockable bottle/item a home bar actually keeps.
 * `id` is authored + immutable; `name` is the canonical English display; `aliases[]` is filled
 * automatically below from every raw name that folds into the base.
 *
 * Staples (isStaple) are the non-perishable pantry core only — water/sugar/simple-syrup/cola/
 * soda-water — pre-checked in the wizard. Fresh citrus and eggs are perishable and left unchecked
 * (see docs/data-model-refinement.md §5 / open decision 7).
 */
const BASES = [
  // ── Spirits ──────────────────────────────────────────────────────────────
  { id: 'gin', name: 'Gin', category: 'spirit' },
  { id: 'vodka', name: 'Vodka', category: 'spirit' },
  { id: 'white-rum', name: 'White Rum', category: 'spirit' },
  { id: 'dark-rum', name: 'Dark Rum', category: 'spirit' },
  { id: 'tequila', name: 'Tequila', category: 'spirit' },
  { id: 'mezcal', name: 'Mezcal', category: 'spirit' },
  { id: 'bourbon', name: 'Bourbon', category: 'spirit' },
  { id: 'rye-whiskey', name: 'Rye Whiskey', category: 'spirit' },
  { id: 'irish-whiskey', name: 'Irish Whiskey', category: 'spirit' },
  { id: 'scotch', name: 'Scotch Whisky', category: 'spirit' },
  { id: 'brandy', name: 'Brandy', category: 'spirit' },
  { id: 'cognac', name: 'Cognac', category: 'spirit', parentId: 'brandy' },
  { id: 'calvados', name: 'Calvados', category: 'spirit' },
  { id: 'pisco', name: 'Pisco', category: 'spirit' },
  { id: 'cachaca', name: 'Cachaça', category: 'spirit' },
  { id: 'grappa', name: 'Grappa', category: 'spirit' },
  { id: 'absinthe', name: 'Absinthe', category: 'spirit' },
  { id: 'pernod', name: 'Pernod', category: 'spirit' },

  // ── Liqueurs ─────────────────────────────────────────────────────────────
  { id: 'triple-sec', name: 'Triple Sec', category: 'liqueur' },
  { id: 'amaretto', name: 'Amaretto', category: 'liqueur' },
  { id: 'amaro', name: 'Amaro', category: 'liqueur' },
  { id: 'aperol', name: 'Aperol', category: 'liqueur' },
  { id: 'apricot-brandy', name: 'Apricot Brandy', category: 'liqueur' },
  { id: 'benedictine', name: 'Bénédictine', category: 'liqueur' },
  { id: 'cherry-liqueur', name: 'Cherry Liqueur', category: 'liqueur' },
  { id: 'coffee-liqueur', name: 'Coffee Liqueur', category: 'liqueur' },
  { id: 'creme-de-cacao', name: 'Crème de Cacao', category: 'liqueur' },
  { id: 'creme-de-cassis', name: 'Crème de Cassis', category: 'liqueur' },
  { id: 'creme-de-menthe', name: 'Crème de Menthe', category: 'liqueur' },
  { id: 'creme-de-mure', name: 'Crème de Mûre', category: 'liqueur' },
  { id: 'creme-de-violette', name: 'Crème de Violette', category: 'liqueur' },
  { id: 'drambuie', name: 'Drambuie', category: 'liqueur' },
  { id: 'fernet-branca', name: 'Fernet Branca', category: 'liqueur' },
  { id: 'galliano', name: 'Galliano', category: 'liqueur' },
  { id: 'green-chartreuse', name: 'Green Chartreuse', category: 'liqueur' },
  { id: 'yellow-chartreuse', name: 'Yellow Chartreuse', category: 'liqueur' },
  { id: 'maraschino', name: 'Maraschino Liqueur', category: 'liqueur' },
  { id: 'peach-schnapps', name: 'Peach Schnapps', category: 'liqueur' },
  { id: 'raspberry-liqueur', name: 'Raspberry Liqueur', category: 'liqueur' },
  { id: 'campari', name: 'Campari', category: 'liqueur' },
  { id: 'grand-marnier', name: 'Grand Marnier', category: 'liqueur' },

  // ── Wine, vermouth & fortified ────────────────────────────────────────────
  { id: 'sweet-vermouth', name: 'Sweet Vermouth', category: 'wine' },
  { id: 'dry-vermouth', name: 'Dry Vermouth', category: 'wine' },
  { id: 'lillet-blanc', name: 'Lillet Blanc', category: 'wine' },
  { id: 'sparkling-wine', name: 'Sparkling Wine', category: 'wine' },
  { id: 'white-wine', name: 'Dry White Wine', category: 'wine' },
  { id: 'red-wine', name: 'Red Wine', category: 'wine' },
  { id: 'port', name: 'Tawny Port', category: 'wine' },

  // ── Mixers & soft drinks ──────────────────────────────────────────────────
  { id: 'cola', name: 'Cola', category: 'mixer', isStaple: true },
  { id: 'soda-water', name: 'Soda Water', category: 'mixer', isStaple: true },
  { id: 'ginger-ale', name: 'Ginger Ale', category: 'mixer' },
  { id: 'ginger-beer', name: 'Ginger Beer', category: 'mixer' },
  { id: 'grapefruit-soda', name: 'Grapefruit Soda', category: 'mixer' },

  // ── Juices & purées ───────────────────────────────────────────────────────
  { id: 'lime-juice', name: 'Fresh Lime Juice', category: 'juice' },
  { id: 'lemon-juice', name: 'Fresh Lemon Juice', category: 'juice' },
  { id: 'orange-juice', name: 'Fresh Orange Juice', category: 'juice' },
  { id: 'pineapple-juice', name: 'Pineapple Juice', category: 'juice' },
  { id: 'cranberry-juice', name: 'Cranberry Juice', category: 'juice' },
  { id: 'grapefruit-juice', name: 'Grapefruit Juice', category: 'juice' },
  { id: 'tomato-juice', name: 'Tomato Juice', category: 'juice' },
  { id: 'sugar-cane-juice', name: 'Sugar Cane Juice', category: 'juice' },
  { id: 'peach-puree', name: 'Peach Purée', category: 'juice' },

  // ── Syrups & cordials ─────────────────────────────────────────────────────
  { id: 'simple-syrup', name: 'Simple Syrup', category: 'syrup', isStaple: true },
  { id: 'grenadine', name: 'Grenadine', category: 'syrup' },
  { id: 'orgeat', name: 'Orgeat', category: 'syrup' },
  { id: 'honey-syrup', name: 'Honey Syrup', category: 'syrup' },
  { id: 'agave-syrup', name: 'Agave Syrup', category: 'syrup' },
  { id: 'elderflower-cordial', name: 'Elderflower Cordial', category: 'syrup' },
  { id: 'falernum', name: 'Falernum', category: 'syrup' },
  { id: 'raspberry-syrup', name: 'Raspberry Syrup', category: 'syrup' },
  { id: 'donns-mix', name: "Donn's Mix", category: 'syrup' },
  { id: 'chamomile-cordial', name: 'Chamomile Cordial', category: 'syrup' },

  // ── Bitters ───────────────────────────────────────────────────────────────
  { id: 'angostura-bitters', name: 'Angostura Bitters', category: 'bitters' },
  { id: 'orange-bitters', name: 'Orange Bitters', category: 'bitters' },
  { id: 'peychauds-bitters', name: "Peychaud's Bitters", category: 'bitters' },

  // ── Dairy & egg ───────────────────────────────────────────────────────────
  { id: 'cream', name: 'Cream', category: 'dairy' },
  { id: 'coconut-cream', name: 'Coconut Cream', category: 'dairy' },
  { id: 'egg-white', name: 'Egg White', category: 'dairy' },
  { id: 'egg-yolk', name: 'Egg Yolk', category: 'dairy' },

  // ── Seasonings (never block — role:'seasoning') ───────────────────────────
  { id: 'salt', name: 'Salt', category: 'seasoning' },
  { id: 'pepper', name: 'Pepper', category: 'seasoning' },
  { id: 'celery-salt', name: 'Celery Salt', category: 'seasoning' },
  { id: 'tabasco', name: 'Tabasco', category: 'seasoning' },
  { id: 'worcestershire-sauce', name: 'Worcestershire Sauce', category: 'seasoning' },
  { id: 'orange-flower-water', name: 'Orange Flower Water', category: 'seasoning' },
  { id: 'vanilla-extract', name: 'Vanilla Extract', category: 'seasoning' },

  // ── Fresh produce (muddled/incorporated → role:'ingredient', so they block) ─
  { id: 'mint', name: 'Mint', category: 'garnish' },
  { id: 'ginger', name: 'Ginger', category: 'garnish' },
  { id: 'chili-pepper', name: 'Chili Pepper', category: 'garnish' },

  // ── Pantry & other ────────────────────────────────────────────────────────
  { id: 'sugar', name: 'Sugar', category: 'other', isStaple: true },
  { id: 'water', name: 'Water', category: 'other', isStaple: true },
  { id: 'coffee', name: 'Coffee', category: 'other' },
  { id: 'espresso', name: 'Espresso', category: 'other' },
];

/** Bases whose lines are seasonings — never counted as "missing" by computeMakeable. */
const SEASONING_BASES = new Set([
  'salt',
  'pepper',
  'celery-salt',
  'tabasco',
  'worcestershire-sauce',
  'orange-flower-water',
  'vanilla-extract',
]);

/**
 * Per-cocktail glass/method corrections (hand-audit, docs §5). Keyed by cocktail name.
 * Only the fields that need fixing are listed.
 */
const COCKTAIL_FIXES = {
  Mojito: { glass: 'highball', method: 'muddled' },
  Canchanchara: { glass: 'highball' },
  'Canchánchara': { glass: 'highball' },
  'Pina Colada': { glass: 'hurricane' },
  KIR: { glass: 'wine' },
};

const byId = new Map(BASES.map((b) => [b.id, b]));

// ── Build aliases from the fold: every distinct raw name that maps to a base and differs from the
//    base's own name becomes a search alias (accent/case-insensitive de-dup).
const aliasSets = new Map(BASES.map((b) => [b.id, new Map()]));
for (const [rawName, m] of Object.entries(canonical)) {
  const base = byId.get(m.baseId);
  if (!base) throw new Error(`canonical-map: "${rawName}" → unknown baseId "${m.baseId}"`);
  if (rawName.toLowerCase() !== base.name.toLowerCase()) {
    aliasSets.get(base.id).set(rawName.toLowerCase(), rawName);
  }
  // A distinct `call` spelling is also a useful search alias.
  if (m.call && m.call.toLowerCase() !== base.name.toLowerCase()) {
    aliasSets.get(base.id).set(m.call.toLowerCase(), m.call);
  }
}

const ingredients = BASES.map((b) => {
  const aliases = [...aliasSets.get(b.id).values()].sort((a, z) => a.localeCompare(z));
  return {
    id: b.id,
    name: b.name,
    category: b.category,
    ...(b.isStaple ? { isStaple: true } : {}),
    ...(b.parentId ? { parentId: b.parentId } : {}),
    ...(b.substitutes ? { substitutes: b.substitutes } : {}),
    ...(aliases.length ? { aliases } : {}),
  };
});

// ── Rewrite cocktail lines ──────────────────────────────────────────────────
const OPTIONAL_NOTE = /to taste|smaak|optional|optioneel/i;
const RANGE = /^(\d+(?:\.\d+)?)\s*[–\-]\s*(\d+(?:\.\d+)?)$/;

/** BaseSpirit family for a base id, or null if the base is not a spirit. */
function spiritFamily(baseId) {
  const b = byId.get(baseId);
  if (!b || b.category !== 'spirit') return null;
  if (baseId === 'gin') return 'gin';
  if (baseId === 'vodka') return 'vodka';
  if (baseId === 'white-rum' || baseId === 'dark-rum' || baseId === 'cachaca') return 'rum';
  if (baseId === 'tequila' || baseId === 'mezcal') return 'tequila';
  if (['bourbon', 'rye-whiskey', 'irish-whiskey', 'scotch'].includes(baseId)) return 'whisky';
  if (['brandy', 'cognac', 'calvados', 'pisco', 'grappa'].includes(baseId)) return 'brandy';
  return 'other';
}

let lineCount = 0;
const cocktails = raw.cocktails.map((c) => {
  const lines = (c.ingredients ?? []).map((line) => {
    const m = canonical[line.name] ?? canonical[line.name.trim()];
    if (!m) throw new Error(`cocktail "${c.name}": raw ingredient "${line.name}" not in canonical-map.json`);
    const base = byId.get(m.baseId);
    lineCount++;

    // Merge the map note with the line note (map note wins as the prep qualifier).
    let note = m.note ?? line.note;
    let optional = line.optional === true;
    let amount = line.amount;
    let amountMax;

    // A "6–8" style note is a quantity range: fold it into amount/amountMax and drop the note.
    if (note) {
      const r = RANGE.exec(String(note).trim());
      if (r) {
        amount = Number(r[1]);
        amountMax = Number(r[2]);
        note = undefined;
      }
    }
    // Auto-rule: a "to taste"/"optional" note makes the line optional (docs §3.3).
    if (line.note && OPTIONAL_NOTE.test(line.note)) {
      optional = true;
      // Strip a note that only conveyed optionality so it doesn't read as a prep instruction.
      if (note && OPTIONAL_NOTE.test(note) && !/replace|shiraz|malbe|chilled|green|brown|white/i.test(note)) {
        note = undefined;
      }
    }

    const role = SEASONING_BASES.has(base.id) ? 'seasoning' : undefined;
    const alternatives = m.alternativeNames;

    return {
      name: base.name,
      ...(m.call ? { call: m.call } : {}),
      ...(amount !== undefined ? { amount } : {}),
      ...(amountMax !== undefined ? { amountMax } : {}),
      unit: line.unit,
      ...(note ? { note } : {}),
      ...(optional ? { optional: true } : {}),
      ...(role ? { role } : {}),
      ...(alternatives?.length ? { alternatives } : {}),
    };
  });

  // Derive the primary browse axis from the dominant (largest ml) spirit line.
  let baseSpirit = 'none';
  let best = -1;
  for (const line of lines) {
    const bid = [...byId.values()].find((b) => b.name === line.name)?.id;
    const fam = bid ? spiritFamily(bid) : null;
    if (!fam) continue;
    const ml = line.unit === 'ml' ? line.amount ?? 0 : 0;
    if (baseSpirit === 'none' || ml > best) {
      baseSpirit = fam;
      best = ml;
    }
  }

  const fix = COCKTAIL_FIXES[c.name] ?? {};

  return {
    name: c.name,
    ...(c.category ? { category: c.category } : {}),
    ...(baseSpirit !== 'none' ? { baseSpirit } : {}),
    ...(c.description ? { description: c.description } : {}),
    instructions: c.instructions ?? [],
    glass: fix.glass ?? c.glass,
    method: fix.method ?? c.method,
    ...(c.difficulty ? { difficulty: c.difficulty } : {}),
    ...(c.garnish ? { garnish: c.garnish } : {}),
    ...(c.notes ? { notes: c.notes } : {}),
    ...(c.servings ? { servings: c.servings } : {}),
    tags: ['iba-official'],
    ingredients: lines,
  };
});

// ── Report which raw ingredients folded away, and which bases are unused ───────
const usedBases = new Set();
for (const c of cocktails) for (const l of c.ingredients) {
  usedBases.add(byId.get([...byId.values()].find((b) => b.name === l.name)?.id ?? '')?.id);
}
const rawNames = new Set(raw.ingredients.map((i) => i.name));
for (const key of Object.keys(canonical)) {
  if (!rawNames.has(key)) console.warn(`  ⚠ canonical-map key "${key}" not present in the raw draft`);
}
for (const i of raw.ingredients) {
  if (!canonical[i.name]) console.warn(`  ⚠ raw ingredient "${i.name}" has no canonical-map entry`);
}

const seed = { ingredients, cocktails };
writeFileSync(join(root, 'iba-cocktails-seed.json'), JSON.stringify(seed, null, 2) + '\n', 'utf8');

const staples = ingredients.filter((i) => i.isStaple).length;
console.log('Fold complete → iba-cocktails-seed.json (frozen):');
console.log(`  ingredients: ${raw.ingredients.length} raw → ${ingredients.length} bases (${staples} staples)`);
console.log(`  cocktails:   ${cocktails.length}  (${lineCount} lines rewritten to base + call)`);
