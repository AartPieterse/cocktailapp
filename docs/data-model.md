# Barkast data model

_Reference for the shipped catalog data model. The domain types and logic live in `@cocktailapp/shared`
(`shared/src`); this document explains the shape and the reasoning behind it. It replaces the retired
`docs/data-model-refinement.md` — source comments in `shared/src`, `frontend/src`, `backend/src` and
`scripts/` still cite that filename, sometimes with section numbers (§2.5, §3.1, §3.3, §3.4, §5) that no
longer resolve anywhere._

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
  variations?: CocktailVariation[]; // named variants (Caipiroska, Kir Royal…): prose + base-id swaps,
                                    // resolved from names by buildCatalog; never affect makeable
  tags?: string[];                // typed CocktailTag vocabulary exists but tags are not yet narrowed
  image?: { assetId: string; blurhash?: string };  // bundled, offline-safe (see "Open" below)
  imageUrl?: string;              // legacy
  createdAt?: string;
  updatedAt?: string;
}
```

## Vocabularies

Every enumeration is a **string-literal union** (not a TS `enum`) with a companion runtime array and a
per-locale label map — `Record<Locale, Record<…, string>>`, filled for both `nl` and `en`
(`shared/src/*.ts`):

| Type | Values |
| --- | --- |
| `MeasureUnit` (17) | `part` `ml` `cl` `oz` `piece` `cube` `drop` `dash` `splash` `pinch` `teaspoon` `tablespoon` `barspoon` `slice` `wedge` `sprig` `topup` |
| `IngredientCategory` (11) | `spirit` `liqueur` `wine` `mixer` `juice` `syrup` `bitters` `dairy` `seasoning` `garnish` `other` |
| `Glassware` (11) | `coupe` `martini` `rocks` `highball` `collins` `nick_and_nora` `flute` `wine` `hurricane` `mug` `shot` |
| `Method` (6) | `build` `shaken` `stirred` `blended` `muddled` `layered` |
| `Difficulty` (3) | `easy` `medium` `advanced` |
| `BaseSpirit` (8) | `gin` `vodka` `rum` `tequila` `whisky` `brandy` `other` `none` |

These label maps (`MEASURE_LABELS`, `CATEGORY_LABELS`, `CATEGORY_LABELS_PLURAL`, `CATEGORY_HINTS`,
`GLASSWARE_LABELS`, `METHOD_LABELS`, `DIFFICULTY_LABELS`, `BASE_SPIRIT_LABELS`) translate the
**vocabularies** only. UI chrome lives in `UI_STRINGS` (`shared/src/i18n.ts`), and the seeded catalog
**content** (names, descriptions, instructions) is translated separately — see
[Localization](#localization).

`MeasureUnit` is the **authored** unit, not necessarily the displayed one. `shared/src/measure-convert.ts`
re-expresses volume amounts in the reader's preferred unit — `VolumeUnit` is `ml` | `cl` | `oz`, and
`convertMeasure` is driven by `frontend/src/app/core/unit-preference.service.ts`. `oz` is the round 30 ml
bartending jigger, deliberately **not** the 29.5735 ml US fluid ounce, and non-volume units are never
converted, so a `2 dash` line never becomes `2 oz`.

Alcohol is derived from the ingredient **category**, not from a per-ingredient flag:
`ALCOHOLIC_INGREDIENT_CATEGORIES` (`spirit` `liqueur` `wine` `bitters`, `shared/src/ingredient-category.ts`)
makes a cocktail alcohol-free when **no non-optional line** references an ingredient in one of those
categories — that is the whole mocktail filter. There is no `abv` field anywhere in the model (see
"Open" below).

## Makeable matching

`computeMakeable(cocktails, availableIngredientIds, maxMissing = 0)` (`shared/src/makeable.ts`) is a
pure, non-mutating function returning `MakeableResult[]` (`{ cocktail, missing[], missingCount }`):

- A line is **available** if the cabinet contains its `ingredientId` **or any of its `alternativeIds`**.
- A line counts as **missing** only when it is **not `optional`**, its `role` is **not** `garnish`/
  `seasoning`, and it is not available.
- Cocktails with **zero** ingredient lines are excluded.
- Results with `missingCount > maxMissing` are dropped; results are sorted by `missingCount` then name.


### When may a line carry a `role`? — the vessel rule

`role` is doing more work than its name suggests. It reads as *descriptive* ("what is this doing
here?") but `makeable.ts` treats it as *modal* ("must the user own this?"). Setting it is therefore an
assertion: **you can make this drink without this item in your cabinet.** Get it wrong and the app
tells someone they can make a drink they cannot.

Apply this test, in order:

1. **Position.** Look at every mention of the item in `instructions`. If all of them fall in a
   finishing clause applied to the already-built drink — *garnish, top with, float, rim, sprinkle
   over, express over, serve with* — it may carry a role. If it appears in **any** build verb —
   *combine, add, mix, heat, simmer, steep, brew, tie in, place in, blend, muddle* — it went into the
   vessel and it is **required**.
2. **Later removal is not exclusion.** A cinnamon stick pulled out of the milk, a cheesecloth sachet
   lifted from the pot, cardamom left behind in the filter cone, a peel discarded — all still
   required. You cannot make the drink without owning them. The IBA settles this: the Sazerac's
   absinthe is used to rinse the glass and the excess is explicitly discarded, and it is still listed
   as a quantity-bearing `10 ml Absinthe` **ingredient**, not a garnish.
3. **Identity.** Even if step 1 passes, the line is required when the item is the sole source of a
   flavour named in the drink's own name — *Khara* (salted) lassi, *Orange Scented* Hot Chocolate,
   *Spiced* Peach Punch, *Lemon*ade.
4. **Silence means undetermined**, not required. A line the instructions never mention (marshmallows
   on a hot chocolate) is a judgement call — leave it alone rather than promoting it.

Two things this rule deliberately does **not** do:

- **It does not ask "would requiring this be annoying?"** That question is answered on the *ingredient*
  via `isStaple`, never on the line — because a staple is pre-ticked and the user can untick it,
  whereas a role silently overrules them. This mirrors Difford's "Key Pantry Ingredients" and Cocktail
  Party App's "Pantry" category.
- **It does not introduce a category for infused-then-removed aromatics.** The distinction is real in
  cooking (*sachet d'épices*) and even in EU/Codex food law (*processing aid*), but no recipe data
  standard models it — not schema.org/Recipe, Cooklang, RecipeML, Open Recipe Format, h-recipe, FoodOn,
  TheCocktailDB or Bar Assistant. And it would change zero makeability answers, since every such line
  is required either way. If the UI wants to say "infused, then removed", put it in `note`.

Where a line is genuinely dispensable but not decorative, use **`optional: true`** — it is excluded
from the makeable check without misdescribing what the item does. Thai Coffee's cardamom is the worked
example: the vessel rule makes it required, but Thai oliang is traditionally made without it at all.

> Note that "garnish" in the source domain does not mean dispensable. The IBA's Pisco Sour garnish is
> "a few dashes of Amargo bitters **as an aromatic garnish**", and the IBA tags true optionality
> separately and explicitly. We borrowed the vocabulary without its semantics; `optional` is what
> carries the modal meaning here.


So: **"makeable now"** = `maxMissing 0` (0 missing); **"bijna — je mist er één"** = query with
`maxMissing 1`. `computeMakeable` does **not** itself apply staples or substitutes — its 3-arg
signature is deliberately locked.

`missingLines(cocktail, availableIngredientIds)` (same module) **is** that per-cocktail predicate;
`computeMakeable` just maps it over the catalog. A single-cocktail view — the detail page — must call it
directly instead of re-deriving the rule: that duplication is how the detail page once silently drifted
from the list. Like `computeMakeable` it expects an already-**expanded** cabinet if substitutions are to
count.

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

Today's seed authors this machinery sparsely: **1** ingredient has a `parentId` and **2** have
`substitutes`, so flipping the toggle changes almost nothing on current data. A substitution that
"doesn't work" is usually one that was never written.

## Catalog build & versioning

`buildCatalog(rawIngredients, rawCocktails)` (`shared/src/catalog.ts`) shapes raw seed data into the
resolved catalog. It is **pure and dependency-free** (no crypto, no DB), which is why the **same**
function feeds both `scripts/build-catalog.mjs` (the committed offline bundle) and the backend
`GET /api/catalog`.

- **Ids** prefer an authored immutable `id` verbatim, else `slugify(name)` with numeric-suffix
  collision handling. Both lists are sorted by name **before** ids are assigned, so id derivation is
  order-independent (seed-file order or Mongo query order resolve identically).
- **Fails loud:** a duplicate authored id (ingredient *or* cocktail), an unknown line ingredient name,
  an unknown alternative name, an unknown variation swap ingredient, or a variation `makesCocktail`
  naming no catalog cocktail all throw — a seed typo breaks the build instead of shipping a broken
  catalog.
- **`version`** is a `sha256` of `JSON.stringify({ ingredients, cocktails })` sliced to 12 hex chars.
  It doubles as the `GET /api/catalog` **ETag**. The recipe is duplicated in `build-catalog.mjs`,
  `validate-seed.mjs`, and the backend `CatalogService` and **must stay byte-identical** so the offline
  bundle and the API report the same version for the same seed.

Only **one** of those two sinks is live in production. The deployed SPA is static:
`frontend/src/environments/environment.prod.ts` sets `dataSource: 'static'` with
`catalogUrl: 'catalog.json'` and `translationsUrl: 'catalog.nl.json'`, so it reads the committed bundle
and never calls `GET /api/catalog`. The LAN box serves the identical catalog from the API, but a seed
change deployed only there reaches no user until the bundle is rebuilt and the frontend redeployed.

The frozen source of truth is **`iba-cocktails-seed.json`** (repo root) — the IBA 2024 official list
(tagged `iba-official`) plus an alcohol-free set (tagged `mocktail`). The seed file is the authority
on the catalog's size and on which ingredients are staples; `npm run build:catalog` prints the live
totals — ingredients, staples, cocktails and NL overlay coverage — on every run
(`scripts/build-catalog.mjs`). See the root [`README.md`](../README.md#build--catalog-pipeline) for
the build pipeline.

What the seed actually authors is thinner than the model allows: **4** recipe lines carry
`alternativeIds`, **4** cocktails carry `variations`, line roles are **19** `seasoning` and **5**
`garnish` with **14** lines marked `optional`, and `baseSpirit` is now set on **every** cocktail. Worth knowing before debugging a
feature that may simply have no data behind it.

### Changing the data

```bash
npm run build:translations   # scripts/build-translations-nl.mjs → scripts/translations-nl.json
npm run build:catalog        # build:shared + validate:seed + scripts/build-catalog.mjs
```

`build:catalog` regenerates `frontend/public/catalog.json` **and** `catalog.nl.json`, and both must be
committed: the CI step *"Regenerate catalog and verify both bundles are committed"*
(`.github/workflows/ci.yml`) re-runs the build, stages the two bundles and fails on any diff — including
an untracked one. Editing the seed without regenerating is a red build.

## Localization

- The canonical id space is **English** (`Locale = 'en' | 'nl'`).
- Dutch is a **display overlay**, not a separate seed. `CatalogTranslations` (`{ version, ingredients,
  cocktails }`, keyed by id) is applied at display time by `applyCatalogTranslations`, which overlays
  names/descriptions/instructions/notes/garnish and rewrites each line's denormalized `name` to the
  translated base name (so `missing[]` reads in Dutch) — leaving ids, `call`, matching, and the version
  untouched.
- **A stale overlay can never corrupt display:** if the overlay `version` ≠ the catalog `version` (or
  the overlay is missing), the canonical English catalog is returned unchanged. The same holds per
  *entry*: an id with no overlay entry keeps its canonical English text.
- **Version parity is stamped, not earned.** `build-catalog.mjs` writes the current catalog `version`
  onto whatever `scripts/translations-nl.json` contains, so an **incomplete** overlay still passes the
  version gate and silently falls back to English for the ids it does not cover. The overlay lags the
  seed today — the build's `nl overlay:` line prints the real coverage against the catalog totals
  right above it. To close a gap: add the ids to `NL_INGREDIENTS` /
  `scripts/translations-nl-cocktails.json`, then `npm run build:translations && npm run build:catalog`.

---

## Status & history

The two-level model shipped over commits `966b7ef`, `81e085a`, and `a5e798a` (July 2026). It replaced
an earlier design where 90 cocktails fragmented into 152 hyper-specific ingredients — nearly two per
drink, versus roughly one canonical base per drink today — and the backend ran
a **separate** Mongo `$aggregate` makeable query over ObjectIds — a second, diverging id space that
broke matching. Today the frontend, the offline bundle, and the backend all share **one slug id space**
and **one** `computeMakeable` engine (the backend `$aggregate` was deleted), asserted by a cross-sink
CI check.

**Open (post-launch):** id tombstones for renamed/removed ingredients, **bundled cocktail images**
(the `image` field type exists but no images are bundled yet — pending licensing), abv/dietary flags,
and narrowing `Cocktail.tags` from `string[]` to the typed `CocktailTag[]` — which first needs
`mocktail` added to `CocktailTag`/`COCKTAIL_TAGS`: the seed tags 54 cocktails with it and it is not a
member of the union today.
