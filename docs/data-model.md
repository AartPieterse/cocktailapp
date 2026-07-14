# Barkast data model

_Reference for the shipped catalog data model. The domain types and logic live in `@cocktailapp/shared`
(`shared/src`); this document explains the shape and the reasoning behind it._

The whole app is organized around one question — **"what can I make with what I have?"** — so the data
model is designed to make that matching reliable.

## Two-level ingredients: base + call

The core idea is a **two-level ingredient model**:

- A small set of canonical, stockable **base** ingredients. Your cabinet is a set of base ids, and
  makeable-matching runs **only** against these. There is one `Gin`, not four.
- Each recipe line keeps a per-line **`call`** — the recipe's own verbatim wording (e.g. *"fresh lime
  juice"*, *"Old Tom gin"*) — for display, while still matching on the base `ingredientId`.

This is why matching works: without it, hyper-specific per-recipe ingredients fragment the id space and
almost nothing shows as makeable.

```ts
// shared/src/ingredient.ts — a stockable base ingredient
interface Ingredient {
  id: string;              // authored immutable slug (never a DB ObjectId)
  name: string;
  category?: IngredientCategory;
  isStaple?: boolean;      // pantry basic, pre-checked in the wizard
  parentId?: string;       // a specific base (old-tom-gin) → a broader one (gin)
  substitutes?: string[];  // explicit swap ids
  aliases?: string[];
  createdAt?: string;
  updatedAt?: string;
}
```

```ts
// shared/src/cocktail.ts — an embedded recipe line
type CocktailIngredientRole = 'ingredient' | 'garnish' | 'seasoning'; // default 'ingredient'

interface CocktailIngredient {
  ingredientId: string;       // the base id, matched against the cabinet
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
  baseSpirit?: BaseSpirit;        // gin | vodka | rum | tequila | whisky | brandy | other | none
  glass?: Glassware;
  method?: Method;
  difficulty?: Difficulty;
  garnish?: string;
  notes?: string;
  servings?: number;              // defaults to 1
  tags?: string[];                // typed CocktailTag vocabulary exists but tags are not yet narrowed
  image?: { assetId: string; blurhash?: string };  // bundled, offline-safe (see "Open" below)
  imageUrl?: string;              // legacy
  createdAt?: string;
  updatedAt?: string;
}
```

## Vocabularies

Every enumeration is a **string-literal union** (not a TS `enum`) with a companion runtime array and a
Dutch label map (`shared/src/*.ts`):

| Type | Values |
| --- | --- |
| `MeasureUnit` (16) | `part` `ml` `cl` `piece` `cube` `drop` `dash` `splash` `pinch` `teaspoon` `tablespoon` `barspoon` `slice` `wedge` `sprig` `topup` |
| `IngredientCategory` (11) | `spirit` `liqueur` `wine` `mixer` `juice` `syrup` `bitters` `dairy` `seasoning` `garnish` `other` |
| `Glassware` (11) | `coupe` `martini` `rocks` `highball` `collins` `nick_and_nora` `flute` `wine` `hurricane` `mug` `shot` |
| `Method` (6) | `build` `shaken` `stirred` `blended` `muddled` `layered` |
| `Difficulty` (3) | `easy` `medium` `advanced` |
| `BaseSpirit` (8) | `gin` `vodka` `rum` `tequila` `whisky` `brandy` `other` `none` |

Dutch labels (`MEASURE_LABELS`, `CATEGORY_LABELS`/`_PLURAL`/`_HINTS`, `GLASSWARE_LABELS`,
`METHOD_LABELS`, `DIFFICULTY_LABELS`) translate the **vocabularies**; the seeded catalog **content**
(names, descriptions, instructions) is translated separately — see [Localization](#localization).

## Makeable matching

`computeMakeable(cocktails, availableIngredientIds, maxMissing = 0)` (`shared/src/makeable.ts`) is a
pure, non-mutating function returning `MakeableResult[]` (`{ cocktail, missing[], missingCount }`):

- A line is **available** if the cabinet contains its `ingredientId` **or any of its `alternativeIds`**.
- A line counts as **missing** only when it is **not `optional`**, its `role` is **not** `garnish`/
  `seasoning`, and it is not available.
- Cocktails with **zero** ingredient lines are excluded.
- Results with `missingCount > maxMissing` are dropped; results are sorted by `missingCount` then name.

So: **"makeable now"** = `maxMissing 0` (0 missing); **"bijna — je mist er één"** = query with
`maxMissing 1`. `computeMakeable` does **not** itself apply staples or substitutes — its 3-arg
signature is deliberately locked.

## Substitutes (opt-in)

`expandCabinet(availableIngredientIds, ingredients, opts)` is a separate, opt-in pass run **before**
`computeMakeable` (behind the UI's *"Vervangers meetellen"* toggle, default **on**). With substitutes
off it just de-duplicates ids. With substitutes on it is **bidirectional**:

1. stocking a **child** adds its `parentId` (a specific base satisfies a generic call),
2. explicit `substitutes` ids are added,
3. a second pass adds every **child** whose `parentId` is now present (stocking the generic satisfies
   specific calls).

`isStaple` is not referenced by either function — staples factor in only by being ticked into the
cabinet during the wizard.

## Catalog build & versioning

`buildCatalog(rawIngredients, rawCocktails)` (`shared/src/catalog.ts`) shapes raw seed data into the
resolved catalog. It is **pure and dependency-free** (no crypto, no DB), which is why the **same**
function feeds both `scripts/build-catalog.mjs` (the committed offline bundle) and the backend
`GET /api/catalog`.

- **Ids** prefer an authored immutable `id` verbatim, else `slugify(name)` with numeric-suffix
  collision handling. Both lists are sorted by name **before** ids are assigned, so id derivation is
  order-independent (seed-file order or Mongo query order resolve identically).
- **Fails loud:** a duplicate authored id, an unknown line ingredient name, or an unknown alternative
  name throws — a seed typo breaks the build instead of shipping a broken catalog.
- **`version`** is a `sha256` of `JSON.stringify({ ingredients, cocktails })` sliced to 12 hex chars.
  It doubles as the `GET /api/catalog` **ETag**. The recipe is duplicated in `build-catalog.mjs`,
  `validate-seed.mjs`, and the backend `CatalogService` and **must stay byte-identical** so the offline
  bundle and the API report the same version for the same seed.

The frozen source of truth is **`iba-cocktails-seed.json`** (repo root) — the official IBA 2024 list,
currently **104 ingredients / 102 cocktails** (5 staples: Cola, Soda Water, Simple Syrup, Sugar,
Water). See the root [`README.md`](../README.md#build--catalog-pipeline) for the build pipeline.

## Localization

- The canonical id space is **English** (`Locale = 'en' | 'nl'`).
- Dutch is a **display overlay**, not a separate seed. `CatalogTranslations` (`{ version, ingredients,
  cocktails }`, keyed by id) is applied at display time by `applyCatalogTranslations`, which overlays
  names/descriptions/instructions/notes/garnish and rewrites each line's denormalized `name` to the
  translated base name (so `missing[]` reads in Dutch) — leaving ids, `call`, matching, and the version
  untouched.
- **A stale overlay can never corrupt display:** if the overlay `version` ≠ the catalog `version` (or
  the overlay is missing), the canonical English catalog is returned unchanged. The build emits
  `catalog.nl.json` with the **same** version as `catalog.json`.

---

## Status & history

The two-level model shipped over commits `966b7ef`, `81e085a`, and `a5e798a` (July 2026). It replaced
an earlier design where the catalog fragmented into ~152 hyper-specific ingredients and the backend ran
a **separate** Mongo `$aggregate` makeable query over ObjectIds — a second, diverging id space that
broke matching. Today the frontend, the offline bundle, and the backend all share **one slug id space**
and **one** `computeMakeable` engine (the backend `$aggregate` was deleted), asserted by a cross-sink
CI check.

**Open (post-launch):** id tombstones for renamed/removed ingredients, **bundled cocktail images**
(the `image` field type exists but no images are bundled yet — pending licensing), abv/dietary flags,
and narrowing `Cocktail.tags` from `string[]` to the typed `CocktailTag[]`.
