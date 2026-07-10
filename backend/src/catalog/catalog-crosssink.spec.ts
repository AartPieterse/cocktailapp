/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildCatalog } from '@cocktailapp/shared';
import { CatalogService } from './catalog.service';

/**
 * Cross-sink integration check (docs/data-model-refinement.md §3.4): prove that the DB round-trip
 * reproduces the committed offline bundle's version, using the REAL frozen seed — not a fixture.
 *
 * It simulates the full path the authored-id gap (§2.8) hides in:
 *   frozen seed → buildCatalog → Mongo docs (db-seed) → findAll → CatalogService.getCatalog().
 * If CatalogService failed to carry the authored `id` (or the alternatives id→name mapping), the
 * re-slugged names would diverge from the bundle and this test would fail — which is exactly the
 * regression the tautological "bundle === buildCatalog(seed)" assertion could never catch.
 */
const ROOT = join(__dirname, '..', '..', '..');
const seed = JSON.parse(readFileSync(join(ROOT, 'iba-cocktails-seed.json'), 'utf8'));
const bundle = JSON.parse(
  readFileSync(join(ROOT, 'frontend', 'public', 'catalog.json'), 'utf8'),
);

/** Reshape the resolved catalog into the doc shape Mongo stores + findAll returns (with `id`). */
function toMongoDocs() {
  const { ingredients, cocktails } = buildCatalog(seed.ingredients, seed.cocktails);
  const ingDocs = ingredients.map((i) => ({ ...i })); // id, name, category, isStaple, parentId, substitutes, aliases
  const cktDocs = cocktails.map((c) => ({ ...c })); // id + lines with ingredientId/alternativeIds/etc.
  return { ingDocs, cktDocs };
}

describe('CatalogService cross-sink parity (real seed)', () => {
  it('serves the exact version of the committed bundle after a Mongo round-trip', async () => {
    const { ingDocs, cktDocs } = toMongoDocs();
    const service = new CatalogService(
      { findAll: jest.fn().mockResolvedValue(ingDocs) } as any,
      { findAll: jest.fn().mockResolvedValue(cktDocs) } as any,
    );

    const payload = await service.getCatalog();
    expect(payload.version).toBe(bundle.version);
    expect(payload.counts).toEqual(bundle.counts);
  });

  it('preserves authored slug ids through the round-trip (no re-slugging of names)', async () => {
    const { ingDocs, cktDocs } = toMongoDocs();
    const service = new CatalogService(
      { findAll: jest.fn().mockResolvedValue(ingDocs) } as any,
      { findAll: jest.fn().mockResolvedValue(cktDocs) } as any,
    );
    const payload = await service.getCatalog();
    const ids = new Set(payload.ingredients.map((i) => i.id));
    // These authored ids differ from slugify(name) — the whole point of authoring them.
    expect(ids.has('lime-juice')).toBe(true); // name "Fresh Lime Juice"
    expect(ids.has('triple-sec')).toBe(true); // folds Cointreau/Curaçao
    // Exactly one gin base (the fold worked), not four.
    expect(payload.ingredients.filter((i) => i.name === 'Gin')).toHaveLength(1);
  });
});
