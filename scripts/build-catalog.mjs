/**
 * build-catalog.mjs — generate the static catalog every client ships.
 *
 * Reads the curated source of truth (iba-cocktails-seed.json) and emits the catalog to two
 * sinks: frontend/public/catalog.json (the Angular static-first app) and app/assets/catalog.json
 * (the Expo app's offline bundle). The catalog is SHAPED by the shared `buildCatalog` — the exact
 * same function the backend's GET /api/catalog uses — so every sink agrees byte-for-byte and shares
 * one stable slug-id space (a user's cabinet stays valid across offline bundle ⇄ API).
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

const { buildCatalog } = shared;

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const SRC = join(root, 'iba-cocktails-seed.json');
// All sinks receive byte-identical catalog content (same version hash).
const OUTPUTS = [
  join(root, 'frontend', 'public', 'catalog.json'),
  join(root, 'app', 'assets', 'catalog.json'),
];

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

const catalog = { version, generatedFrom: 'iba-cocktails-seed.json', counts, ingredients, cocktails };

const json = JSON.stringify(catalog, null, 2) + '\n';
for (const out of OUTPUTS) {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, json, 'utf8');
}

const staples = ingredients.filter((i) => i.isStaple).length;
console.log(`Catalog v${version} written to ${OUTPUTS.length} sinks:`);
for (const out of OUTPUTS) console.log(`  - ${out.slice(root.length + 1).replace(/\\/g, '/')}`);
console.log(`  ingredients: ${ingredients.length} (${staples} staples)`);
console.log(`  cocktails:   ${cocktails.length}`);
