# Barkast data model

_Reference for the shipped catalog data model. Types and logic live in `@cocktailapp/shared`
(`shared/src`); this document explains the shape and the reasoning._

The app is organized around **"what can I make with what I have?"** — the model makes that matching
reliable.

## Two-level ingredients: base + call

- A small set of canonical, stockable **base** ingredients. Your cabinet is a set of base ids; matching
  runs **only** against these.
- Each recipe line keeps a per-line **`call`** — the recipe's verbatim wording (e.g. *"fresh lime
  juice"*) — for display, while matching on the base `ingredientId`.

```ts
// shared/src/ingredient.ts
interface Ingredient {
  id: string;              // authored immutable slug (never a DB ObjectId)
  name: string;
  category?: IngredientCategory;
  isStaple?: boolean;      // pantry basic, pre-checked in the wizard
  parentId?: string;       // specific base (old-tom-gin) → broader (gin)
  substitutes?: string[];
  aliases?: string[];
  createdAt?: string;
  updatedAt?: string;
}
```

```ts
// shared/src/cocktail.ts
type CocktailIngredientRole = 'ingredient' | 'garnish' | 'seasoning'; // default 'ingredient'

interface CocktailIngredient {
  ingredientId: string;       // base id, matched against the cabinet
  name: string;               // denormalized base name (shown in "missing")
  call?: string;              // verbatim recipe wording; UI shows `call ?? name`
  amount?: number;
  amountMax?: number;         // upper bound of a range
  unit: MeasureUnit;
  note?: string;
  optional?: boolean;
  role?: CocktailIngredientRole;
  alternativeIds?: string[];  // "X or Y" — any one satisfies the line
}

interface Cocktail {
  id: string;
  name: string;
  description: string;
  instructions: string[];
  ingredients: CocktailIngredient[];
  category?: string;
  baseSpirit?: BaseSpirit;
  glass?: Glassware;
  method?: Method;
  difficulty?: Difficulty;
  garnish?: string;
  notes?: string;
  servings?: number;              // defaults to 1
  tags?: string[];                // CocktailTag vocabulary exists; not yet narrowed
  variations?: CocktailVariation[]; // named swaps + prose, resolved to base ids by buildCatalog
  image?: { assetId: string; blurhash?: string };  // bundled, offline-safe (none shipped yet)
  imageUrl?: string;              // legacy
  createdAt?: string;
  updatedAt?: string;
}
```

## Vocabularies

Every enumeration is a **string-literal union** (not a TS `enum`) with a companion runtime array and
label maps keyed by `Locale` (`'en' | 'nl'`) in `shared/src/*.ts`:

| Type | Values |
| --- | --- |
| `MeasureUnit` (17) | `part` `ml` `cl` `oz` `piece` `cube` `drop` `dash` `splash` `pinch` `teaspoon` `tablespoon` `barspoon` `slice` `wedge` `sprig` `topup` |
| `IngredientCategory` (11) | `spirit` `liqueur` `wine` `mixer` `juice` `syrup` `bitters` `dairy` `seasoning` `garnish` `other` |
| `Glassware` (11) | `coupe` `martini` `rocks` `highball` `collins` `nick_and_nora` `flute` `wine` `hurricane` `mug` `shot` |
| `Method` (6) | `build` `shaken` `stirred` `blended` `muddled` `layered` |
| `Difficulty` (3) | `easy` `medium` `advanced` |
| `BaseSpirit` (8) | `gin` `vodka` `rum` `tequila` `whisky` `brandy` `other` `none` |

Vocabulary labels (`MEASURE_LABELS`, `CATEGORY_LABELS`/`_PLURAL`/`_HINTS`, `GLASSWARE_LABELS`,
`METHOD_LABELS`, `DIFFICULTY_LABELS`) are bilingual. Catalog **content** (names, descriptions,
instructions) is translated separately — see [Localization](#localization).

## Makeable matching

`computeMakeable(cocktails, availableIngredientIds, maxMissing = 0)` (`shared/src/makeable.ts`) is a
pure, non-mutating function returning `MakeableResult[]` (`{ cocktail, missing[], missingCount }`):

- A line is **available** if the cabinet contains its `ingredientId` **or any of its `alternativeIds`**.
- A line counts as **missing** only when it is **not `optional`**, its `role` is **not** `garnish`/
  `seasoning`, and it is not available.
- Cocktails with **zero** ingredient lines are excluded.
- Results with `missingCount > maxMissing` are dropped; results are sorted by `missingCount` then name.

So: **"makeable now"** = `maxMissing 0`; **"bijna — je mist er één"** = `maxMissing 1`.
`computeMakeable` does **not** apply staples or substitutes — its 3-arg signature is locked.

## Substitutes (opt-in)

`expandCabinet(availableIngredientIds, ingredients, opts)` runs **before** `computeMakeable` (UI
*"Vervangers meetellen"* toggle, default **on**). With substitutes off it de-duplicates ids. With
substitutes on it is **bidirectional**:

1. stocking a **child** adds its `parentId`,
2. explicit `substitutes` ids are added,
3. a second pass adds every **child** whose `parentId` is now present.

`isStaple` is not referenced by either function — staples are only pre-ticked into the cabinet by the
wizard.

## Catalog build & versioning

`buildCatalog(rawIngredients, rawCocktails)` (`shared/src/catalog.ts`) shapes raw seed data into
`CatalogContent`. It is **pure and dependency-free** (no crypto, no DB). The **same** function feeds
`scripts/build-catalog.mjs` and the backend `GET /api/catalog`; callers stamp `version` (and other
`CatalogMeta`) on top.

- **Ids** prefer an authored immutable `id`, else `slugify(name)` with numeric-suffix collision
  handling. Both lists are sorted by name **before** ids are assigned, so derivation is
  order-independent.
- **Fails loud:** duplicate authored id, unknown line ingredient name, or unknown alternative name
  throws.
- **`version`** is a `sha256` of `JSON.stringify({ ingredients, cocktails })` sliced to 12 hex chars
  (computed in `build-catalog.mjs`, `validate-seed.mjs`, and `CatalogService`). Recipe must stay
  byte-identical so the offline bundle and API report the same version for the same seed.

Frozen source of truth: **`iba-cocktails-seed.json`** — currently **156 ingredients / 156 cocktails**,
**7 staples** (Cola, Soda Water, Simple Syrup, Sugar, Water, Milk, Ice). See the root
[`README.md`](../README.md#build--catalog-pipeline) for the build pipeline.

## Localization

- Canonical id space is **English** (`Locale = 'en' | 'nl'`).
- Dutch is a **display overlay**, not a separate seed. `applyCatalogTranslations` overlays
  names/descriptions/instructions/notes/garnish and rewrites each line's denormalized `name` (so
  `missing[]` reads in Dutch) — leaving ids, `call`, matching, and the version untouched.
- **A stale overlay can never corrupt display:** if the overlay `version` ≠ the catalog `version` (or
  the overlay is missing), the English catalog is returned unchanged. The build emits
  `catalog.nl.json` with the **same** version as `catalog.json`.
