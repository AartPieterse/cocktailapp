/**
 * build-catalog.mjs — generate the static catalog every client ships.
 *
 * Reads the curated source of truth (iba-cocktails-seed.json) and emits the catalog to
 * frontend/public/catalog.json (the Angular static-first PWA's offline bundle). The catalog is
 * SHAPED by the shared `buildCatalog` — the exact same function the backend's GET /api/catalog
 * uses — so the bundle agrees byte-for-byte with the API and shares one stable slug-id space
 * (a user's cabinet stays valid across offline bundle ⇄ API).
 *
 * The catalog is stamped with a `version` — a SHA-256/12 over the resolved ingredients + cocktails.
 * The backend computes it with the IDENTICAL recipe (see backend CatalogService.buildPayload), so
 * bundle.version === /api/catalog.version whenever both are seeded from the same source. The hash
 * is content-only (no timestamps), so a regenerated catalog only diffs when the data changed.
 *
 * Requires the shared package to be built first (npm run build:shared).
 * Usage: node scripts/build-catalog.mjs   (or: npm run build:catalog)
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// Default-import the CommonJS shared build, then destructure (robust across the CJS/ESM boundary).
import shared from '@cocktailapp/shared';

const { buildCatalog, CATALOG_SCHEMA_VERSION } = shared;

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const SRC = join(root, 'iba-cocktails-seed.json');
const NL_SRC = join(here, 'translations-nl.json');
const OUTPUTS = [join(root, 'frontend', 'public', 'catalog.json')];
// The Dutch overlay ships alongside the catalog, carrying the SAME version so a stale overlay is
// ignored by applyCatalogTranslations (which falls back to canonical English).
const NL_OUTPUTS = [join(root, 'frontend', 'public', 'catalog.nl.json')];

const raw = JSON.parse(readFileSync(SRC, 'utf8'));
const { counts, ingredients, cocktails } = buildCatalog(
  raw.ingredients ?? [],
  raw.cocktails ?? [],
);

// Content hash over the resolved catalog only (ids + lines) — deterministic and independent of the
// wrapping metadata below. IMPORTANT: keep this recipe identical to the backend CatalogService.
const version = createHash('sha256')
  .update(JSON.stringify({ ingredients, cocktails }))
  .digest('hex')
  .slice(0, 12);

const catalog = {
  version,
  schemaVersion: CATALOG_SCHEMA_VERSION,
  generatedFrom: 'iba-cocktails-seed.json',
  locale: 'en',
  counts,
  ingredients,
  cocktails,
};

const json = JSON.stringify(catalog, null, 2) + '\n';
for (const out of OUTPUTS) {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, json, 'utf8');
}

// Emit the Dutch overlay stamped with THIS catalog's version (id-keyed CatalogTranslations).
const nlSource = JSON.parse(readFileSync(NL_SRC, 'utf8'));
const nlOverlay = { version, ...nlSource };
const nlJson = JSON.stringify(nlOverlay, null, 2) + '\n';
for (const out of NL_OUTPUTS) {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, nlJson, 'utf8');
}

const staples = ingredients.filter((i) => i.isStaple).length;
console.log(`Catalog v${version} written to ${OUTPUTS.length} sinks (+ nl overlay):`);
for (const out of OUTPUTS) console.log(`  - ${out.slice(root.length + 1).replace(/\\/g, '/')}`);
console.log(`  ingredients: ${ingredients.length} (${staples} staples)`);
console.log(`  cocktails:   ${cocktails.length}`);
console.log(
  `  nl overlay:  ${Object.keys(nlSource.cocktails ?? {}).length} cocktails, ${Object.keys(nlSource.ingredients ?? {}).length} ingredients`,
);
