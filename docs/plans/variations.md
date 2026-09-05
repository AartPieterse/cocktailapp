# Variations: how they are stored, and how to add or remove catalog entries safely

_Decision snapshot, 5 Sep 2026. The living reference is [`docs/data-model.md`](../data-model.md) —
where this plan and the code disagree, the code is true._

## The question

Ingredients, cocktails, and variations: what is the right storage shape? Specifically — a list of
variations **inside** a cocktail, or a reference to a separately stored cocktail object?

## The answer

**Embedded, and permanently so.** The reason is asymmetry, not taste: a variation is the only catalog
object with **no id**, so it is the only one that can be deleted without stranding stored user data.
Cabinets are ingredient ids and favourites are cocktail ids, both in `localStorage` with no runtime
remapping; `missingLines` never reads `variations`. Promoting a variation to its own object mints a
permanent id in that space.

Both shapes already existed in the code: `Cocktail.variations` (embedded, in use) **and**
`makesCocktailId` — the reference form — which was built, unit-tested, rendered by the detail page,
and used by **zero** seed entries. So the question was never either/or. It is a **ladder**, climbed
per variation: prose, then prose plus a structured swap, then promoted to its own `cocktails[]` entry.
The rungs, the three promotion criteria, the prose-only doctrine and the ~25-variation reversal
trigger are written up in [`docs/data-model.md`](../data-model.md).

Rejected: promoting every variation (half of them cannot be — their ingredient is not a stockable
base, and parent instructions name the swapped-out ingredient verbatim, so every derived child needs
hand-written prose anyway), and modelling a variation as a build-time recipe delta (same blockage, and
its only user-visible output would be a makeability badge present on half the variations of a single
card, which reads as "you cannot make this").

## What was actually broken

Not the shape — the **identity**. A variation had no key, so the Dutch overlay was index-aligned:
inserting or reordering a variation moved translated text onto its neighbour. The harvester emitted no
`variations` at all, leaving the one shipped Dutch variation string a single
`npm run build:translations` away from deletion.

Separately, and blocking: the `abv` / `color` / `alcoholFreeCounterpartId` / `alcoholFreeOfId` fields
added for the experience layer were resolved by `buildCatalog` but present in **none** of the other
sinks — not the Mongoose schemas, not the `CatalogService` reverse map, not `db-seed.mjs`. Measured
before the fix: the bundle hashed `f6bdfe22f5a3` while the same data through the API round-trip hashed
`8b9e0bf3b8fb`, with 38 cocktails losing fields. That is the invariant that lets a client switch
between the offline bundle and the API without invalidating a cabinet.

## Done

1. **Cross-sink parity restored.** The four new fields carried in `ingredient.schema.ts`,
   `cocktail.schema.ts`, the `CatalogService` reverse map (counterpart mapped back to a *name*, since
   `buildCatalog` re-stamps the inverse itself) and `db-seed.mjs`.
2. **Validator: swap sanity (hard fail).** `buildCatalog` only ever checked that a swap base
   *exists*, never that it belonged to this recipe — so a Gin-to-Vodka swap authored on a Bellini
   validated green and rendered a literal arrow on the detail page.
3. **Validator: orphan bases (warning).** Reachability counts recipe lines, `alternatives`,
   `parentId` **and** `substitutes` — the last two matter because `expandCabinet` matches through
   them, so a rule ignoring them would have turned the planned substitutes-family work into a build
   failure. It warns rather than fails, because the compliant fix for an orphan created by deleting a
   cocktail would otherwise be deleting a base, the one operation that silently drops drinks out of
   "wat kan ik maken".
4. **Variation identity.** `CocktailVariation.key`, authored in the seed and immutable once shipped;
   `CatalogTranslations` variations went from an index-aligned array to a `Record` keyed on it;
   `CATALOG_SCHEMA_VERSION` 1 to 2; the detail page tracks by `key` instead of by translated name.
   Regression test: a reordered `variations` array keeps each variation its own Dutch text.
5. **The harvester stops eating Dutch.** Both merge loops carry `variations`; the supplement loop
   merges **per field** so it can contribute variations to a cocktail the curated set already covers;
   an unknown variation key **fails** the run; `--check` gates it in CI.
6. **Tombstones.** A committed `catalog-ids.lock.json` (written by `build-catalog.mjs`, diffed by CI)
   is the baseline; removing an id without a `retired[]` entry in the seed now fails the build.
7. **Documentation.** The five-mechanism decision table, the ladder, the prose-only doctrine, the
   `key` rule and the full add/remove contract in `docs/data-model.md`; hard-coded counts replaced by
   a pointer to `npm run validate:seed`.

`next-phase.md` step 11 is done — and was **corrected**. Its prescribed fix (move the Dutch text into
`translations-nl-cocktails.json`) would have deleted the very string it existed to save, because
`caipirinha` is in the curated `seed-data.mjs` set and the supplement loop skipped the whole entry for
any id the curated loop had already produced.

## Not done — deliberate, owner's call

- **Promote the four eligible variations** (Caipiroska, Kir Royal, Campari Spritz, Cynar Spritz) to
  real `cocktails[]` entries and set `makesCocktail` on their parents. Roughly 40 lines of JSON, zero
  new code, and the only part of this work that changes a hero answer: a bar of the staples plus
  vodka, lime juice and sugar currently makes **nothing**. Cost: four permanently undeletable ids and
  four cards sitting next to their parents — the same near-duplicate noise step 10 is spending effort
  to remove. Do it once step 10 curation has settled what "near-duplicate" means. The promotion
  honesty rule (a promoted variant lines must equal the parent lines with the swap applied, compared
  as full line objects rather than derived id sets) lands in that same commit; it has no reachable
  cases before then.
- **Runtime id remapping.** The tombstone gate is build-time only. It does not prune or rewrite a
  stale id already sitting in someone `barkast.cabinet` or `barkast.favorites`. That needs `retired[]`
  shipped in the bundle plus changes to `cabinet.service.ts` and `favorites.service.ts` — worth doing
  before the step 10 deletions land.
- **Backfill authored cocktail ids.** Most cocktails have none, so renaming one changes its id and
  orphans stored favourites with a green build. Verified a no-op today (every id already equals
  `slugify(name)`, no collisions), but it is large seed churn — take a quiet moment.
- **Orphan bases.** `validate-seed` currently warns about the handful left behind by the alcohol-free
  rewrite. Re-reference or retire them, and promote the rule to a hard failure for *newly added* bases
  once the lock provides a new-versus-shipped baseline.
