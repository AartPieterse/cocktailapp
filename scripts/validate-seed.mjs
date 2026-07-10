/**
 * validate-seed.mjs — the guard that keeps the FROZEN, hand-curated seed honest.
 *
 * Runs before build:catalog (and in CI). It fails the build on the structural mistakes that a
 * two-level, hand-edited seed is prone to, so a bad edit can never reach a bundle:
 *
 *   1. a base `id` that is missing, not a clean slug, or duplicated;
 *   2. a duplicated base name (case-insensitive) — would split matching across "duplicate" bases;
 *   3. a base `category` outside the IngredientCategory enum;
 *   4. a base name that still reads like an unresolved compound ("… or …") or a known brand;
 *   5. a cocktail line whose `base`/`name` or any `alternatives` doesn't resolve (via buildCatalog);
 *   6. a unit/glass/method/difficulty outside its enum;
 *   7. a `parentId`/`substitutes` id that points at no base;
 *   8. build-twice non-determinism (the version hash must be stable).
 *
 * Usage: node scripts/validate-seed.mjs   (or: npm run validate:seed)
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import shared from '@cocktailapp/shared';

const {
  buildCatalog,
  slugify,
  INGREDIENT_CATEGORIES,
  MEASURE_UNITS,
  GLASSWARE,
  METHODS,
  DIFFICULTIES,
} = shared;

const here = dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(
  readFileSync(join(here, '..', 'iba-cocktails-seed.json'), 'utf8'),
);

const errors = [];
const fail = (msg) => errors.push(msg);

// Brand tokens that must never become a base name (fold to the generic, keep the brand as `call`).
const BRAND_BLOCKLIST = [
  'smirnoff',
  'kahlúa',
  'kahlua',
  'cointreau',
  'luxardo',
  'goslings',
  'lagavulin',
  'monin',
];
// Bases that are legitimately proprietary (no generic name exists) — exempt from the brand check.
const BRAND_EXEMPT = new Set(['drambuie', 'campari', 'aperol', 'galliano', 'falernum']);

const ingredients = seed.ingredients ?? [];
const cocktails = seed.cocktails ?? [];

// ── 1–4, 7: base catalog integrity ──────────────────────────────────────────
const ids = new Set();
const namesLower = new Map();
for (const ing of ingredients) {
  if (!ing.id) fail(`ingredient "${ing.name}" has no authored id`);
  else {
    if (ing.id !== slugify(ing.id)) fail(`ingredient id "${ing.id}" is not a clean slug`);
    if (ids.has(ing.id)) fail(`duplicate ingredient id "${ing.id}"`);
    ids.add(ing.id);
  }
  if (!ing.name?.trim()) fail(`ingredient "${ing.id}" has no name`);
  else {
    const key = ing.name.trim().toLowerCase();
    if (namesLower.has(key)) fail(`duplicate ingredient name "${ing.name}" (also "${namesLower.get(key)}")`);
    namesLower.set(key, ing.id);
    if (/\bor\b/i.test(ing.name)) fail(`base name "${ing.name}" reads like an unresolved "X or Y" compound`);
    if (
      !BRAND_EXEMPT.has(ing.id) &&
      BRAND_BLOCKLIST.some((b) => ing.name.toLowerCase().includes(b))
    ) {
      fail(`base name "${ing.name}" looks like a brand — fold to the generic and keep the brand as a call`);
    }
  }
  if (ing.category && !INGREDIENT_CATEGORIES.includes(ing.category)) {
    fail(`ingredient "${ing.id}" has unknown category "${ing.category}"`);
  }
}
// parentId / substitutes must resolve.
for (const ing of ingredients) {
  if (ing.parentId && !ids.has(ing.parentId)) {
    fail(`ingredient "${ing.id}" parentId "${ing.parentId}" points at no base`);
  }
  for (const s of ing.substitutes ?? []) {
    if (!ids.has(s)) fail(`ingredient "${ing.id}" substitute "${s}" points at no base`);
  }
}

// ── 6: cocktail-level enum validity ──────────────────────────────────────────
for (const c of cocktails) {
  if (c.glass && !GLASSWARE.includes(c.glass)) fail(`cocktail "${c.name}" has unknown glass "${c.glass}"`);
  if (c.method && !METHODS.includes(c.method)) fail(`cocktail "${c.name}" has unknown method "${c.method}"`);
  if (c.difficulty && !DIFFICULTIES.includes(c.difficulty)) {
    fail(`cocktail "${c.name}" has unknown difficulty "${c.difficulty}"`);
  }
  for (const line of c.ingredients ?? []) {
    if (!MEASURE_UNITS.includes(line.unit)) {
      fail(`cocktail "${c.name}" line "${line.name}" has unknown unit "${line.unit}"`);
    }
  }
}

// ── 5: every line + alternative resolves (buildCatalog throws on the first unknown ref) ───
let versionA;
try {
  const { ingredients: bi, cocktails: bc } = buildCatalog(ingredients, cocktails);
  versionA = hash(bi, bc);
  // ── 8: determinism — a second build must produce the same version ──
  const { ingredients: bi2, cocktails: bc2 } = buildCatalog(ingredients, cocktails);
  const versionB = hash(bi2, bc2);
  if (versionA !== versionB) fail(`buildCatalog is non-deterministic (${versionA} != ${versionB})`);
} catch (err) {
  fail(`buildCatalog rejected the seed: ${err.message}`);
}

function hash(ingredients, cocktails) {
  return createHash('sha256')
    .update(JSON.stringify({ ingredients, cocktails }))
    .digest('hex')
    .slice(0, 12);
}

if (errors.length) {
  console.error(`✗ validate-seed: ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `✓ validate-seed: ${ingredients.length} bases, ${cocktails.length} cocktails OK (catalog v${versionA}).`,
);
