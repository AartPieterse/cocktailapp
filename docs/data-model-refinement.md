# Barkast — data model & dataset refinement

> Design plan. Status: **the two-level model is BUILT (Steps 1–7).** Only Step 8 (post-launch id
> tombstones, bundled images, abv/dietary flags — all needing real user data first) remains.
> Companion to `docs/mobile-app-plan.md` (Part A). Synthesis of a 4-dimension analysis (substitution
> model, shared schema, pipeline, classification), reconciled against an adversarial review **and
> verified against the working tree**.
>
> **What shipped (this change):** the seed is FROZEN and folded from 152 verbatim specifics to **93
> canonical bases** with authored, immutable slug ids; every cocktail line carries `base` + `call`
> (+ `role`/`optional`/`alternatives` where needed). One id space and **one `computeMakeable` engine**
> now span web/Expo/backend — the backend's Mongo `$aggregate` makeable is gone. `wine`/`dairy`/
> `seasoning` categories added; alcohols reclassified; blank glasses/Mojito method fixed; staples
> reduced to the non-perishable core. A **Dutch display overlay** (`catalog.nl.json`, same version,
> applied via shared `applyCatalogTranslations`) renames ingredients + 25 popular cocktails over the
> one English id space, replacing the old `SEED_SRC=nl` fork; and the **substitution toggle**
> (`expandCabinet`, default-on) is wired into the bar. `scripts/validate-seed.mjs` + a real cross-sink
> version check guard the seed in CI. One-shot fold inputs: `scripts/canonical-map.json` +
> `scripts/fold-seed.mjs` (over the archived `scripts/iba-cocktails-raw.json`); the Dutch overlay is
> harvested by `scripts/build-translations-nl.mjs`; `build-iba-seed.mjs` is archived.

## 1. The core problem — two of them

**Problem 1 — the data breaks matching.** The hero feature ("pick what's in your cabinet, see what
you can make") is broken in the **data**, not the algorithm. `computeMakeable` matches a recipe line
to your cabinet by exact `ingredientId`, and today every id is a slug of the recipe's verbatim
wording. The catalog therefore holds four "gins" (`Gin`, `London Dry Gin`, `Dry Gin`, `Old Tom Gin`),
**eleven** "rums", three "lime juices", two identical syrups (`Simple Syrup`, `Sugar Syrup`) as
distinct, unrelated ids. **96 of 152 ingredients appear in exactly one cocktail.** A real home bar
that stocks "Gin", "White Rum", "Simple Syrup", "Fresh Lime Juice" matches almost nothing — the Old
Fashioned literally requires the id `bourbon-or-rye-whiskey` that no cabinet will ever contain. On
top of that, ~14 required lines are garnishes/seasonings (muddled mint, "Lime cut into small wedges",
Tabasco, Celery Salt) that count as "missing", so even a correctly-stocked user is told they *can't*
make a drink they can.

**Problem 2 — two makeable engines on two id spaces (verified).** The plan's invariant is "web, Expo,
and the backend all agree via one shared `computeMakeable`." That is **not true on the backend today**:

- Offline / web / Expo use the shared `computeMakeable` over **slug ids** (`shared/src/makeable.ts`,
  `shared/src/catalog.ts` `buildCatalog`).
- The backend `GET /api/cocktails/makeable` uses a **separate Mongo `$aggregate` pipeline**
  (`backend/src/cocktails/cocktails.service.ts:138-177`) that (a) coerces the cabinet to `ObjectId`
  (`.filter(Types.ObjectId.isValid).map(new Types.ObjectId)`, lines 139-141), (b) matches stored
  `ingredientId` which `scripts/db-seed.mjs:77` persists as the Mongo `_id` (an **ObjectId**), and
  (c) checks only `optional` + `$in` — it knows nothing about garnishes, seasonings, or "X or Y".

So a slug-id cabinet (what the whole client uses) matches **nothing** on the API, and even if the id
spaces agreed, the API would count garnishes as missing while the offline bundle would not. Any data
fix must be paired with a backend-parity fix, or the two surfaces will disagree.

The fix is a **two-level ingredient model** (a small canonical *base* catalog that the cabinet and
matching operate on, plus a per-line *call* string that preserves the recipe's exact wording),
**authored stable ids**, and **one makeable engine** shared by the backend.

---

## 2. Refined data model (`@cocktailapp/shared`)

Design rule throughout: **`computeMakeable`'s three-arg signature and its locked contract are
preserved.** Every change is a strict superset — with the new fields absent, the function behaves
byte-for-byte as today, and all existing `makeable.spec.ts` cases stay green.

### 2.1 Two-level model — decision: collapse to bases + `call`

The specialists split on *how* to unfragment: keep all 152 specifics and link each to a generic via
`canonicalId`, **or** collapse specifics into ~95 canonical bases and demote the specific wording to a
per-line `call`.

**Decision: collapse to bases + `call`.** The cabinet, the wizard, and analytics all operate on the
base; if the 96 single-use specifics remain as catalog rows, the wizard *still* lists four gins and
eleven rums to toggle — the exact noise the hero feature needs gone. The recipe still prints "London
Dry Gin" because that lives on the line as `call`.

### 2.2 `Ingredient` — the base (stockable) catalog

```ts
export interface Ingredient {
  id: string;              // AUTHORED, immutable slug — NO LONGER derived from the display name
  name: string;            // canonical English display: 'Gin', 'White Rum', 'Simple Syrup'
  category?: IngredientCategory;
  isStaple?: boolean;      // wizard pre-check hint — a property of the base
  parentId?: string;       // broader base that may substitute this ('old-tom-gin'.parentId = 'gin')
  substitutes?: string[];  // explicit acceptable swaps, used sparingly (NOT sweet<->dry vermouth)
  aliases?: string[];      // folded spellings & brands, for search ('Sugar Syrup', 'Smirnoff Vodka')
  createdAt?: string;
  updatedAt?: string;
}
```

`aliases[]` preserves the fold for the search box and documents what merged into each base. (The
post-launch tombstone fields `retired`/`mergedInto` are **deferred** — see §7 and the migration note.)

### 2.3 `CocktailIngredient` — line keeps the base identity, adds the call

```ts
export interface CocktailIngredient {
  ingredientId: string;    // BASE id — the ONLY thing the cabinet & computeMakeable compare
  name: string;            // BASE canonical name — what missing[] surfaces ("go stock Gin")
  call?: string;           // verbatim recipe wording ('London Dry Gin'); detail shows call ?? name
  amount?: number;         // OPTIONAL (topup / decorative lines carry no number)
  amountMax?: number;      // upper bound for authored ranges ('6-8'), instead of hiding it in a note
  unit: MeasureUnit;
  note?: string;           // 'vers geperst' / 'goed gekoeld' — home for fresh/chilled qualifiers
  optional?: boolean;      // to taste — never blocks (LOCKED, unchanged)
  role?: 'ingredient' | 'garnish' | 'seasoning'; // garnish/seasoning never block (default 'ingredient')
  alternativeIds?: string[];// recipe 'X or Y': any of these base ids also satisfies the line
}
```

- **`role` enum, per line** (not a category flag): muddled mint in a Mojito is `role:'ingredient'` and
  *must* block; a mint sprig on top is not a line at all (it lives in `Cocktail.garnish` text).
  Makeable keys off `line.role`, **never** the ingredient's category — that is what makes the
  Caipirinha ("Lime cut into small wedges", category *garnish* but a structural line) come out right.
- **`amount` optional**: the seven `topup` lines carry a meaningless `amount:1` today.

### 2.4 `computeMakeable` — the only change is the missing predicate

```ts
export function computeMakeable(cocktails, availableIngredientIds, maxMissing = 0) {
  const available = new Set(availableIngredientIds);
  return cocktails
    .filter((ck) => ck.ingredients.length > 0)                 // zero-ingredient exclusion (LOCKED)
    .map((ck) => {
      const missing = ck.ingredients
        .filter(
          (line) =>
            !line.optional &&                                  // LOCKED
            line.role !== 'garnish' &&                         // new — extends the optional rule
            line.role !== 'seasoning' &&                       // new
            !(available.has(line.ingredientId) ||
              line.alternativeIds?.some((id) => available.has(id))), // new — recipe "X or Y"
        )
        .map((line) => ({ ingredientId: line.ingredientId, name: line.name }));
      return { cocktail: ck, missing, missingCount: missing.length };
    })
    .filter((r) => r.missingCount <= maxMissing)               // LOCKED
    .sort((a, b) => a.missingCount - b.missingCount ||
                    a.cocktail.name.localeCompare(b.cocktail.name)); // LOCKED
}
```

With `role`/`alternativeIds` absent this is identical to today's function — the spec suite is untouched.

### 2.5 User substitution rides on cabinet expansion, never inside `computeMakeable`

Baking a substitution graph into `computeMakeable` would break its locked 3-arg signature. Instead a
pure helper expands the cabinet *before* the call:

```ts
export function expandCabinet(availableIngredientIds, ingredients, opts = {}) {
  const set = new Set(availableIngredientIds);
  if (!opts.substitutes) return [...set];
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  for (const id of [...set]) {
    const ing = byId.get(id);
    if (!ing) continue;
    if (ing.parentId) set.add(ing.parentId);        // stock a child -> the generic recipe is satisfied
    ing.substitutes?.forEach((s) => set.add(s));
  }
  for (const ing of ingredients)                    // stock the generic -> its specific calls satisfied
    if (ing.parentId && set.has(ing.parentId)) set.add(ing.id);
  return [...set];
}
// call site: computeMakeable(cocktails, expandCabinet(cabinet, ingredients, { substitutes }), maxMissing)
```

This is a **phase-7 nicety, not a hero prerequisite** — because we fold aggressively, most matching
works on bases alone and recipe-authored ORs are handled by `alternativeIds`.

### 2.6 Keep-distinct vs fold — the policy

- **Fold to one base** (home bar keeps one slot): all gins → `gin` (`call` carries "London
  Dry"/"Old Tom"); all sugars + `Sugar Cube` → `sugar`; `Simple Syrup`+`Sugar Syrup` → `simple-syrup`;
  honey variants → `honey-syrup`; three lime-juice spellings → `lime-juice`; two lemon → `lemon-juice`;
  `Cola`+`Coca Cola` → `cola`; `Egg White`+`Raw Egg White` → `egg-white`; brands → generic
  (`Smirnoff Vodka`→`vodka`, `Lagavulin 16 y Whisky`→`scotch`, `DOM Bénédictine`→`benedictine`).
- **Orange-liqueur family (added after review):** fold `Cointreau`, `Triple Sec`, `Curacao`,
  `Orange Curacao` → one base **`triple-sec`** (`call` preserves the brand). Without this, a cabinet
  with Cointreau leaves Margarita, White Lady, Sidecar, Between the Sheets, Lemon Drop, Yellow Bird
  unmakeable — a verified hole in the earlier draft.
- **Keep distinct** (genuinely different bottle): `white-rum` vs `dark-rum` (fold aged/Demerara/
  Jamaican/gold into `dark-rum`); `bourbon` vs `rye-whiskey` vs `irish-whiskey` vs `scotch`;
  `sweet-vermouth` vs `dry-vermouth` — and these two are **not** linked as substitutes.
- **The four "X or Y" compounds** → a primary base + `alternativeIds`: `Bourbon or Rye Whiskey` →
  base `bourbon`, `alternativeIds:['rye-whiskey']`, `call:'Bourbon or Rye Whiskey'`. Removes four dead,
  unmatchable ids.

Result: **152 → ~95 canonical bases**, of which ~5 are pre-checked non-perishable staples and ~10 are
non-stockable seasonings/garnishes, leaving ~70–80 the user actually toggles — roughly half of today.

### 2.7 `Cocktail`, catalog envelope, and i18n

```ts
export interface Cocktail {
  id: string;              // AUTHORED, immutable
  name: string;
  category?: string;       // IBA group ('The Unforgettables') — demoted to a metadata badge
  baseSpirit?: BaseSpirit; // primary browse axis (derived from the dominant spirit line)
  description?: string;    // was required + always '' -> optional (stop shipping 90 empty strings)
  instructions: string[];
  ingredients: CocktailIngredient[];
  glass?: Glassware; method?: Method; difficulty?: Difficulty;
  garnish?: string;        // free text — the SOLE home for decorative garnishes
  notes?: string; servings?: number;
  tags?: CocktailTag[];    // typed vocabulary, actually populated for the filter UI
  image?: { assetId: string; blurhash?: string }; // bundled asset (offline-safe); replaces imageUrl
  createdAt?: string; updatedAt?: string;
}
export type BaseSpirit = 'gin'|'vodka'|'rum'|'tequila'|'whisky'|'brandy'|'other'|'none';
export type CocktailTag = 'iba-official'|'classic'|'refreshing'|'sour'|'bitter'|'citrus'|'creamy'|'sparkling'|'strong'|'hot';
```

**Catalog envelope** — promote the object literal in `build-catalog.mjs` to a shared type, and add a
hand-bumped `schemaVersion` distinct from the content-hash `version`:

```ts
export type Locale = 'en' | 'nl';
export interface CatalogMeta {
  version: string;        // SHA-256/12 content hash over {ingredients,cocktails} == strong ETag
  schemaVersion: number;  // hand-bumped ONLY on breaking shape changes; the app can gate on it
  generatedFrom: string;
  locale: Locale; counts: { ingredients: number; cocktails: number };
}
export interface Catalog extends CatalogMeta { ingredients: Ingredient[]; cocktails: Cocktail[]; }
```

**i18n — decision:** keep **English as the single canonical id space** and ship a separate, id-keyed
Dutch **overlay** `catalog.nl.json` carrying the *same* `version`. Reject inlining `LocalizedString`
on every field (repaints the schema + the hash path) and reject the current `SEED_SRC=nl` parallel
seed (it forks ids — `wodka` vs `vodka` — breaking the version-hash gate and making cabinets/analytics
non-portable across languages).

```ts
export interface CatalogTranslations {
  version: string;        // must equal the catalog it overlays; on mismatch the UI falls back to canonical
  ingredients: Record<string /*id*/, { name: string }>;
  cocktails: Record<string /*id*/, { name?: string; description?: string; instructions?: string[]; notes?: string; garnish?: string }>;
}
// UI: overlay?.cocktails[id]?.name ?? cocktail.name
```

**Sort caveat (from review):** `computeMakeable` and `listCocktails` sort by the canonical English
`name` via `localeCompare`, but the overlay renames at display time — so Dutch users would see a list
sorted by English names, and the backend Mongo `$sort:{name:1}` uses plain collation, not
`localeCompare`. Fix: **sort on the resolved display name in the UI layer** after `computeMakeable`,
and align the backend `$sort` collation with `localeCompare` (moot if the backend loads-and-filters
in JS — see §4).

### 2.8 Id stability — decision: author explicit immutable ids

**Author an explicit, immutable `id` on every base and cocktail in the seed; `buildCatalog` reads
`entry.id` (validated unique) instead of `slugify(name)`.** Today ids are `slugify(name)` at build
time, so the very fold that fixes matching ("London Dry Gin" → "Gin") would rename ids and orphan
saved cabinets/favorites/analytics — violating the plan's "ids STABLE across reseeds". Pre-live is the
moment to mint clean slug ids once and freeze them.

> **This id round-trip must be closed on the backend too (verified gap).** `buildCatalog` reads
> `entry.id ?? slugify(name)`, but `catalog.service.ts` maps Mongo docs **without** an `id`, and
> `db-seed.mjs` persists only `name/category/isStaple` — so server-side it falls back to
> `slugify(name)`. The moment an authored id ≠ `slugify(name)` (the whole point of authoring), the
> bundle and `/api/catalog` produce **different ids and a different hash**. Fix in §4.

Post-launch merges (tombstones + `redirectId`) are **deferred** — no analytics rollup or persisted
user data exists yet; authoring immutable ids now is enough.

---

## 3. Turning the datasets into usable data

### 3.0 Ground truth (corrected against the working tree)

- **`build-catalog.mjs` already imports the shared `buildCatalog`** (lines 23-25) — it no longer
  duplicates the logic. Only **`db-seed.mjs` still duplicates** (its own name→id resolution, lines
  62-84) and stores line `ingredientId` as a Mongo **ObjectId** (`found._id`, line 77).
- `GET /api/catalog` re-derives via the backend `CatalogService` using `buildCatalog`, so stored
  ObjectIds don't reach the catalog hash. The real ObjectId break is on `/api/cocktails/makeable`
  (§1, §4).

### 3.1 Durability — decision: freeze the seed, retire the generator

The specialists proposed a permanent `raw → heuristics → overrides → canonical-map → id-registry → seed`
merge layer so hand-fixes survive regeneration. **Choose the leaner durable path: promote
`iba-cocktails-seed.json` to the hand-curated source of truth and retire `build-iba-seed.mjs` to a
one-shot bootstrap.** There is **no recurring IBA feed** — the generator existed only to avoid typing
90 cocktails by hand the first time. Freezing makes curation durable *by construction* (you edit the
JSON; nothing overwrites it) and deletes the "regen clobbered my fix" bug class. The canonical map is
the **input to a one-shot fold**, after which its content is baked into the seed (as base ids +
`aliases[]`), not a permanent runtime layer.

### 3.2 The pipeline, after

**One-shot bootstrap (run once, then archive `build-iba-seed.mjs`):**
```
iba-cocktails-web.json ──build-iba-seed.mjs (existing heuristics)──▶ draft seed
draft seed + scripts/canonical-map.json ──scripts/fold-seed.mjs (one time)──▶ draft frozen seed
   (rewrites lines to base+call+alternativeIds, mints explicit ids, reclassifies, de-dups staples)
                       ──▶ HAND-AUDIT pass (roles, optional, glass/method fixes) ──▶ FROZEN seed
```

**Steady state (every catalog change from now on):**
```
iba-cocktails-seed.json  (FROZEN, hand-curated, explicit ids, base+call+role)
   └─▶ shared buildCatalog()  (validate ids unique, resolve base names→ids, stamp version+schemaVersion)
         ├─▶ app/assets/catalog.json          (offline bundle)
         ├─▶ frontend/public/catalog.json      (until Angular is retired)
         ├─▶ Mongo via db-seed  (stores the slug id; NEVER touches users/me-data/analytics)
         └─▶ backend GET /api/catalog  (re-runs buildCatalog → byte-identical version)
   catalog.nl.json  (id-keyed overlay, same version)  ─▶ shipped alongside
```

### 3.3 Authoring surfaces & the role/optional gap (from review)

`canonical-map.json` is keyed by **raw ingredient name** and can only express base/call/alternatives —
it **cannot** set per-line `role` or `optional`, which vary per cocktail. So the fold produces
bases/calls/OR-alternatives, but **`role` and `optional` are set in an explicit hand-audit pass on the
frozen seed** (this is real work in Step 3, not a byproduct). Two auto-rules seed that pass:

- any line whose `note`/direction matches `/to taste|smaak|optional/i` → `optional: true`;
- any line whose base is a pure decoration/seasoning (`salt`, `pepper`, `tabasco`, …) → `role:'seasoning'`.

The 4 non-optional "to taste" lines that currently block (Old Fashioned: Angostura + Plain Water;
Clover Club & New York Sour: Egg White) are fixed here.

**`canonical-map.json`** — `Record<rawName, { baseId, call?, note?, alternativeNames? }>`:
```json
{
  "Gin":                          { "baseId": "gin" },
  "London Dry Gin":               { "baseId": "gin",          "call": "London Dry Gin" },
  "Simple Syrup":                 { "baseId": "simple-syrup" },
  "Sugar Syrup":                  { "baseId": "simple-syrup", "call": "Sugar Syrup" },
  "Cointreau":                    { "baseId": "triple-sec",   "call": "Cointreau" },
  "Fresh Lime Juice":             { "baseId": "lime-juice" },
  "Bourbon or Rye Whiskey":       { "baseId": "bourbon",      "call": "Bourbon or Rye Whiskey", "alternativeNames": ["Rye Whiskey"] },
  "Lime cut into small wedges":   { "baseId": "lime",         "note": "in partjes gesneden" }
}
```

**Frozen seed — a base and lines** (author `alternativeIds` as **base NAMES**, consistent with the
`base` field; `buildCatalog` resolves + validates name→id, throwing on unknown):
```json
// ingredients[]
{ "id": "gin", "name": "Gin", "category": "spirit", "aliases": ["London Dry Gin", "Dry Gin", "Old Tom Gin"] }

// cocktail lines
{ "base": "Gin", "call": "London Dry Gin", "amount": 45, "unit": "ml" }
{ "base": "Bourbon", "call": "Bourbon or Rye Whiskey", "amount": 60, "unit": "ml", "alternatives": ["Rye Whiskey"] }
{ "base": "Lime", "amount": 1, "unit": "piece", "note": "in partjes gesneden", "role": "ingredient" }
{ "base": "Angostura Bitters", "amount": 2, "unit": "dash", "optional": true }
```

### 3.4 Validation / CI gate — `scripts/validate-seed.mjs`, before `build:catalog`

Fails the build on: (1) a base `id` missing, non-slug, or duplicated; (2) a line whose `base` or any
`alternatives` name doesn't resolve; (3) any **base name containing `/\bor\b/`** or on the brand
blocklist; (4) any `category`/`unit`/`glass`/`method`/`difficulty` outside its enum, or a cocktail
`category` outside the three IBA groups; (5) two staples that are aliases of each other;
(6) build-twice non-determinism.

**Replace the tautological hash assertion with a real cross-sink integration check (from review):**
spin up Mongo, run `db-seed`, call the backend `CatalogService.getCatalog()`, and assert its `version`
equals the committed bundle `version`. (Asserting `bundle.version === buildCatalog(seed).version`
merely restates the existing `git diff --exit-code` and never exercises the DB round-trip where the
authored-id gap bites.) Keep the existing regenerate-and-diff step.

---

## 4. Backend parity — one makeable engine (the verified must-fix)

Data fixes alone leave `/api/cocktails/makeable` wrong. Close it as part of this work:

1. **One engine.** Delete the Mongo `$aggregate` makeable (`cocktails.service.ts:138-177`) and have the
   backend **load cocktails and run the shared `computeMakeable` in JS** (≈90 rows — trivial, and now
   the single source of truth). Drop the `ObjectId` coercion at lines 139-141. *(Alternative: replicate
   every §2.4 rule into the pipeline — `$ne role`, `$in` over `ingredientId`+`alternativeIds` — and
   keep it in lockstep. Not worth it for 90 rows.)*
2. **Slug id space in Mongo.** `db-seed.mjs` writes the shared slug `id` (as a string field, ideally
   also `_id`) on ingredients and stores it as the line `ingredientId` — so the API and the bundle
   compare like-for-like. Have `catalog.service.ts` include `id: d.id` in its raw mapping so
   `buildCatalog`'s `entry.id ?? slugify` sees the authored id and the hash matches the bundle.
3. **Specs.** Update `backend/src/cocktails/cocktails.service.spec.ts` (the mirror of `makeable.spec.ts`)
   to the shared-engine behaviour, and add the cross-sink CI test from §3.4.

---

## 5. Categorization & content cleanup (data-only unless noted)

- **Widen `IngredientCategory`** (small enum + labels/order edit): add `wine` (vermouths, Lillet —
  mis-filed as `liqueur`), `dairy` (Cream, Coconut Cream, Egg White/Yolk — dumped in `other`), and
  `seasoning` (Salt, Pepper, Celery Salt, Tabasco, Worcestershire). Shrinks the 21-item `other`
  dumping ground to a genuine catch-all and makes the wizard sections meaningful.
- **Reclassify misfiled alcohols:** `Grand Marnier`→`liqueur`, `Bitter Campari`→`liqueur`,
  `Pernod`→`spirit`, `Martinique Molasses Rhum`→`spirit` (the classifier's `/\brum\b/` misses "Rhum").
- **Garnish rule:** a stockable *line* only if physically incorporated (poured, muddled, juiced,
  rinsed); pure decoration lives **only** in `Cocktail.garnish` free text. Normalize prep-in-name
  entries to the stockable noun + a line `note`: `"Lime cut into small wedges"`→`lime`,
  `"quarter size Sliced Fresh Ginger"`→`ginger`, `"thin Slices Red Chili Pepper"`→`chili-pepper`.
  Removes ~8–10 unmatchable single-use strings.
- **Seasonings never block:** Tabasco, Worcestershire, Celery Salt, Salt, Pepper, chili rim get
  `role:'seasoning'` — fixing the Bloody Mary / Paloma false-"missing".
- **Staples → the non-perishable core only (from review):** pre-check `water, sugar, simple-syrup,
  soda-water, cola`. **Leave fresh citrus (`lemon-juice`, `lime-juice`) and eggs UNCHECKED** — they are
  perishable, not pantry staples; auto-checking them produces false-positive makeables (the earlier
  trace only "worked" because lemon-juice was auto-checked). Drop the false `sugar-cane-juice` staple.
- **glass/method/difficulty:** now that the seed is frozen, the heuristic output *is* editable data.
  Fix the 4 blank glasses (Mojito/Canchánchara→highball, Piña Colada→hurricane, KIR→wine/flute),
  correct Mojito's method (`stirred`→`build`), hand-audit the over-assigned `coupe` bucket. Treat
  `difficulty` as a soft hint (it's a synthetic egg→"advanced" proxy), or curate the obvious wrongs.
- **Browse axis:** populate `tags` and derive `baseSpirit`; keep the IBA group as an "IBA Official"
  badge. Post-hero polish.

---

## 6. Sequenced plan (hero-first, each step small and shippable)

| # | Step | Kind | Unblocks |
|---|------|------|----------|
| **1** | **Shared types + `computeMakeable`.** Add `call`/`role`/`alternativeIds`/`amount?`/`amountMax` to `CocktailIngredient`; `id`/`parentId`/`substitutes`/`aliases` to `Ingredient`; superset `computeMakeable` (spec stays green) + `expandCabinet` (+spec); export `Catalog`/`CatalogMeta`/`Locale`/`CatalogTranslations`/`BaseSpirit`/`CocktailTag`. `buildCatalog` reads authored `id ?? slugify` and passes new line fields; resolve+validate `alternatives` name→id. | code | everything below; ships safely with old data |
| **2** | **One id space, one engine.** `db-seed` stores the slug id (drop ObjectId lines); `catalog.service.ts` maps `id: d.id`; backend `makeable` uses shared `computeMakeable` in JS (delete the `$aggregate`); update `cocktails.service.spec.ts`. | code | web/Expo/backend actually agree |
| **3** | **The fold + hand-audit (hero unblock).** Author `canonical-map.json`; run `fold-seed.mjs` once; **hand-audit roles + convert "to taste" lines to `optional`**; fix decorative garnishes → text, prep-in-name → base+note; the 4 OR→`alternatives`; de-dup staples. Regenerate bundles. | **data** | **the hero feature starts working** |
| **4** | **Freeze + guard.** Retire `build-iba-seed.mjs` to a documented one-shot; add `validate-seed.mjs` + the real cross-sink version check to CI. | code + data | durable curation; no regressions |
| **5** | **Category & content polish.** Add `wine`/`dairy`/`seasoning` (+NL labels/hints/order); reclassify alcohols; fix glass/method; populate `tags`+`baseSpirit`. | data (+tiny enum edit) | trustworthy wizard & browse |
| **6** | **Dutch overlay.** Build `catalog.nl.json` keyed by id (harvest wording from `seed-data.mjs`); UI resolves overlay + sorts on display name; retire `SEED_SRC=nl`. | data + small code | Dutch UI over one id space |
| **7** | **Substitution toggle.** Wire `expandCabinet` behind a default-on setting; add `parentId`/`substitutes` where bases stay distinct (rum family, Old Tom → gin). | code + data | generous "bijna te maken" |
| **8** | **Later:** post-launch id tombstones (`retired`/`mergedInto`/`redirectId`) once real user data/analytics exist; bundled cocktail images (pending licensing); `abv`/dietary flags. | code + data | nice-to-have |

The hero feature is fixed at the end of **Step 3**; steps 1–2 are enabling refactors that ship without
changing user-visible behaviour.

## 7. Open decisions for the owner (with recommended default)

1. **Durability — freeze the seed vs keep generator + overrides.** → **Freeze.** No recurring IBA feed.
2. **Rum granularity.** → **Two bases: `white-rum`, `dark-rum`** (fold aged/Demerara/Jamaican/gold into dark).
3. **Sub-types (Old Tom Gin, Vodka Citron, Reposado).** → **Fold to `call` for v1**; promote later with `parentId`, no id break.
4. **Orange liqueur.** → **Fold Cointreau/Triple Sec/Curacao → `triple-sec`** (call keeps the brand). *(Was missing; unblocks 6 cocktails.)*
5. **Substitution toggle default.** → **ON** (generous), surfaced as a setting later.
6. **`difficulty`.** → **Keep as a soft hint**, curate the egg-forced "advanced" cases.
7. **Staples for a Dutch audience.** → Pre-check **water, sugar, simple-syrup, cola, soda-water only**; leave citrus + eggs unchecked (perishable).
8. **Primary browse axis.** → **Base spirit + flavour tags**, IBA group as a badge.
9. **Images & IBA-content licensing** (plan §9). → Confirm rights **before** any imagery; model as bundled `assetId`, never a remote URL.
10. **`schemaVersion` policy.** → App **soft-warns** (runs from cache) on an unknown `schemaVersion`; hard-refuse only if a shape change would make matching wrong.

## 8. Backward-compat & migration note

Step 2/3 change the id space (ObjectId→slug on the API; verbatim slug→canonical base on the client).
**Pre-live this is free:** existing cabinets/favorites are throwaway `localStorage`
(`barkast.*`) and the backend `UserData` collection is unused — they get wiped on reslug, no
production data exists. If any real cabinets exist before this ships, add a one-time slug-remap.
Specs to update alongside: `shared/src/makeable.spec.ts` (stays green — verified),
`backend/src/cocktails/cocktails.service.spec.ts` (must change — gains the shared engine),
`backend/src/catalog/catalog.service.spec.ts` (authored-id round-trip).

---

*Files this proposal touches: `shared/src/{ingredient,cocktail,catalog,makeable,ingredient-category}.ts`
+ a new `i18n.ts`; `scripts/{build-catalog,db-seed}.mjs`, new `scripts/{canonical-map.json,fold-seed.mjs,validate-seed.mjs}`;
`backend/src/cocktails/cocktails.service.ts` (+specs), `backend/src/catalog/catalog.service.ts`;
the frozen `iba-cocktails-seed.json`; `.github/workflows/ci.yml`. `build-iba-seed.mjs` archived; `scripts/seed-data.mjs` retired.*
