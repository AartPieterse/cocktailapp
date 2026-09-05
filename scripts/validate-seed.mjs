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
 *   8. build-twice non-determinism (the version hash must be stable);
 *   9. a cocktail with no required line at all (makeable from an empty bar);
 *  10. a decorative line measured by volume (you do not garnish with 360 ml);
 *  11. a missing or invalid `baseSpirit`;
 *  12. a decorative line carrying a whole-unit quantity (warns);
 *  13. a variation swap that doesn't describe this recipe (from/to sanity);
 *  14. a base no recipe can reach — orphaned by an edit (warns);
 *  15. a variation without a stable, clean, cocktail-unique `key`;
 *  16. an id that left the shipped catalog without a tombstone in the seed's `retired[]`.
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
  BASE_SPIRITS,
  isVolumeUnit,
} = shared;

const here = dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(
  readFileSync(join(here, '..', 'iba-cocktails-seed.json'), 'utf8'),
);

const errors = [];
const fail = (msg) => errors.push(msg);
const warnings = [];
const warn = (msg) => warnings.push(msg);

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

// ── 9–12: recipe-role sanity ─────────────────────────────────────────────────
// A `role` of garnish/seasoning excludes a line from the makeable check, so a mis-stamped role makes
// a drink claim to be makeable with ingredients you do not have. `scripts/import-mocktails.mjs`
// stamped roles from the ingredient's CATEGORY rather than its use in the recipe, which is how half a
// pineapple became a garnish and `pineapple-gingerale-smoothie` became makeable from an empty bar.
// These four rules exist so that class of error fails loudly instead of shipping green.
const DECORATIVE = new Set(['garnish', 'seasoning']);
const SMALL_UNITS = new Set(['dash', 'pinch', 'drop']);

for (const c of cocktails) {
  const lines = c.ingredients ?? [];

  // 9: at least one line must actually be required, or the drink is makeable out of thin air.
  const required = lines.filter((l) => !l.optional && !DECORATIVE.has(l.role));
  if (lines.length > 0 && required.length === 0) {
    fail(
      `cocktail "${c.name}" has no required ingredients — every line is optional/garnish/seasoning, ` +
        `so it reports as makeable with an empty bar`,
    );
  }

  for (const line of lines) {
    if (!DECORATIVE.has(line.role)) continue;

    // 10: a decorative line measured by volume is a contradiction — you do not garnish with 360 ml.
    if (isVolumeUnit(line.unit) || line.unit === 'tablespoon') {
      fail(
        `cocktail "${c.name}" line "${line.name}" is role="${line.role}" but measured in ` +
          `${line.amount} ${line.unit} — a volume that size is an ingredient, not a decoration`,
      );
    }

    // 12: whole units in quantity are suspicious rather than certainly wrong — surface, don't block.
    if (!SMALL_UNITS.has(line.unit) && !isVolumeUnit(line.unit) && (line.amount ?? 0) >= 1) {
      warn(
        `cocktail "${c.name}" line "${line.name}" is role="${line.role}" at ` +
          `${line.amount} ${line.unit} — check this is really decorative`,
      );
    }
  }

  // 11: baseSpirit is load-bearing for filtering and must be present and valid.
  if (!c.baseSpirit) {
    fail(`cocktail "${c.name}" has no baseSpirit (use "other" for alcoholic drinks with no single base)`);
  } else if (!BASE_SPIRITS.includes(c.baseSpirit)) {
    fail(`cocktail "${c.name}" has unknown baseSpirit "${c.baseSpirit}"`);
  }

  // difficulty is still missing on the imported mocktails; warn until that backfill lands, then
  // promote this to fail() — see docs/plans/next-phase.md step 10.
  if (!c.difficulty) warn(`cocktail "${c.name}" has no difficulty`);
}

// ── 13: variation swap sanity ────────────────────────────────────────────────
// `buildCatalog` only checks that a swap's base EXISTS in the catalog, never that it has anything to
// do with this recipe. So `{"from":"Gin","to":"Vodka"}` on a Bellini validates green today and the
// detail page renders a literal "Gin → Vodka" arrow — the app stating a falsehood about a recipe.
// A swap is informational (it never reaches `computeMakeable`), which is exactly why nothing else
// catches it.
for (const c of cocktails) {
  const lineNames = new Set(
    (c.ingredients ?? []).map((l) => l.name?.trim().toLowerCase()).filter(Boolean),
  );
  for (const v of c.variations ?? []) {
    for (const swap of v.swaps ?? []) {
      const from = swap.from?.trim().toLowerCase();
      const to = swap.to?.trim().toLowerCase();
      if (from && !lineNames.has(from)) {
        fail(
          `cocktail "${c.name}" variation "${v.name}" swaps from "${swap.from}", which is not an ` +
            `ingredient line of this recipe`,
        );
      }
      if (from && to && from === to) {
        fail(`cocktail "${c.name}" variation "${v.name}" swaps "${swap.from}" to itself`);
      }
      if (to && lineNames.has(to)) {
        fail(
          `cocktail "${c.name}" variation "${v.name}" swaps to "${swap.to}", which this recipe ` +
            `already calls for`,
        );
      }
    }
  }
}

// ── 14: no orphan bases ──────────────────────────────────────────────────────
// Every base is a tile in the first-run wizard and in Mijn bar, so one that no recipe can reach is
// dead weight the user still has to scroll past. Reachability deliberately includes `parentId` and
// `substitutes`: `expandCabinet` matches through those, so a base reachable only that way DOES
// change a makeable answer (docs/plans/next-phase.md's substitutes-family work depends on it).
// A variation swap deliberately does NOT count — that is the case this rule exists to discourage
// ("just add Select as a base so the swap is structural"), since swaps never affect makeability.
//
// warn(), not fail(): an orphan is usually the residue of deleting a cocktail, and the compliant
// fixes are re-reference it or delete the base — and deleting a base silently drops drinks out of
// "wat kan ik maken" for anyone who stocked it. Promote to fail() for bases that are NEW in this
// build once ids.lock gives us a baseline to tell new from long-shipped.
{
  const idByName = new Map(
    ingredients.filter((i) => i.name).map((i) => [i.name.trim().toLowerCase(), i.id]),
  );
  const reachable = new Set();
  const reach = (name) => {
    const id = idByName.get(name?.trim().toLowerCase());
    if (id) reachable.add(id);
  };
  for (const c of cocktails) {
    for (const line of c.ingredients ?? []) {
      reach(line.name);
      for (const alt of line.alternatives ?? []) reach(alt);
    }
  }
  for (const ing of ingredients) {
    if (ing.parentId) reachable.add(ing.parentId);
    for (const s of ing.substitutes ?? []) reachable.add(s);
  }
  const orphans = ingredients.filter((i) => i.id && !reachable.has(i.id)).map((i) => i.id);
  if (orphans.length) {
    warn(
      `${orphans.length} base(s) are referenced by no recipe line, alternative, parentId or ` +
        `substitute — stocking them changes no makeable answer: ${orphans.join(', ')}`,
    );
  }
}

// ── 15: variation key hygiene ────────────────────────────────────────────────
// A variation has no id, so `key` IS its identity — and the Dutch overlay is keyed on it. Require it
// to be authored rather than letting `buildCatalog` derive it from the name: a derived key silently
// changes when the name is edited, which is precisely how translated text goes missing. Keys are
// immutable once shipped; rename the `name` freely, never the `key`.
for (const c of cocktails) {
  const keys = new Set();
  for (const v of c.variations ?? []) {
    if (!v.key) {
      fail(
        `cocktail "${c.name}" variation "${v.name}" has no authored key — add a stable slug ` +
          `(e.g. "${slugify(v.name ?? '')}"); the Dutch overlay is keyed on it`,
      );
      continue;
    }
    if (v.key !== slugify(v.key)) {
      fail(`cocktail "${c.name}" variation key "${v.key}" is not a clean slug`);
    }
    if (keys.has(v.key)) {
      fail(`cocktail "${c.name}" has a duplicate variation key "${v.key}"`);
    }
    keys.add(v.key);
  }
}

// ── 16: id tombstones — nothing leaves the catalog silently ──────────────────
// A cabinet is a list of ingredient ids in localStorage and favourites are cocktail ids
// (frontend/src/app/core/{cabinet,favorites}.service.ts), with no server copy and no migration hook:
// a service-worker update leaves them intact, so a removed id lingers forever and the drink it
// pointed at just disappears. `catalog-ids.lock.json` (written by build-catalog.mjs, committed, and
// diffed by CI) is the previous shipped id set — the baseline that makes an intentional removal
// distinguishable from an accident. Record the removal in the seed's top-level `retired[]` as
// { id, kind: 'ingredient' | 'cocktail', since: 'YYYY-MM-DD', why }.
{
  const retired = seed.retired ?? [];
  const retiredIds = new Map();
  for (const t of retired) {
    if (!t?.id) fail(`retired[] entry with no id: ${JSON.stringify(t)}`);
    else {
      if (retiredIds.has(t.id)) fail(`retired[] lists "${t.id}" twice`);
      retiredIds.set(t.id, t);
      if (!t.since) fail(`retired id "${t.id}" has no "since" date`);
      if (t.kind !== 'ingredient' && t.kind !== 'cocktail') {
        fail(`retired id "${t.id}" needs kind "ingredient" or "cocktail" (got ${JSON.stringify(t.kind)})`);
      }
    }
  }

  let lock;
  try {
    lock = JSON.parse(readFileSync(join(here, '..', 'catalog-ids.lock.json'), 'utf8'));
  } catch {
    warn('catalog-ids.lock.json is missing — run build:catalog and commit it to arm the tombstone check');
  }

  if (lock) {
    // Live ids as THIS seed would resolve them (authored id, else slugify(name)) — cheap and exact
    // enough for a set comparison; buildCatalog below is the authority on everything else.
    const liveIngredients = new Set(ingredients.map((i) => i.id ?? slugify(i.name ?? '')));
    const liveCocktails = new Set(cocktails.map((c) => c.id ?? slugify(c.name ?? '')));
    const surfaces = {
      ingredient: 'frontend/src/app/core/cabinet.service.ts (barkast.cabinet)',
      cocktail: 'frontend/src/app/core/favorites.service.ts (barkast.favorites)',
    };
    const gone = [
      ...(lock.ingredients ?? []).filter((id) => !liveIngredients.has(id)).map((id) => ['ingredient', id]),
      ...(lock.cocktails ?? []).filter((id) => !liveCocktails.has(id)).map((id) => ['cocktail', id]),
    ];
    for (const [kind, id] of gone) {
      if (!retiredIds.has(id)) {
        fail(
          `${kind} id "${id}" shipped in the last catalog and is gone from the seed, but has no ` +
            `retired[] tombstone — it is stored by id in ${surfaces[kind]} with no migration. ` +
            `Add { "id": "${id}", "kind": "${kind}", "since": "…", "why": "…" } to retired[], or ` +
            `restore the entry (prefer merging over deleting).`,
        );
      }
    }
    // A tombstone for something still present is a contradiction — usually a restored entry whose
    // tombstone was never cleaned up, which would mask a later real removal.
    for (const [id, t] of retiredIds) {
      const live = t.kind === 'ingredient' ? liveIngredients.has(id) : liveCocktails.has(id);
      if (live) fail(`retired ${t.kind} id "${id}" is still live in the seed — drop the tombstone`);
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

if (warnings.length) {
  console.warn(`⚠ validate-seed: ${warnings.length} warning(s):`);
  for (const w of warnings) console.warn(`  - ${w}`);
}

if (errors.length) {
  console.error(`✗ validate-seed: ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `✓ validate-seed: ${ingredients.length} bases, ${cocktails.length} cocktails OK (catalog v${versionA}).`,
);
