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

    // Name the drift before asserting the hash. `version` is a hash over exactly these objects, so a
    // field CatalogService forgets to reverse-map fails the test either way — but as a bare hash
    // mismatch, which says nothing about what broke. This has now bitten three times in one week
    // (abv, color/alcoholFreeCounterpartId, family): every field buildCatalog can emit must also be
    // carried by the Mongoose schema, this reverse map AND scripts/db-seed.mjs.
    const drift = new Set<string>();
    for (const [i, served] of payload.cocktails.entries()) {
      const expected = bundle.cocktails[i];
      if (!expected) continue;
      for (const key of new Set([...Object.keys(served), ...Object.keys(expected)])) {
        if (JSON.stringify((served as any)[key]) !== JSON.stringify(expected[key])) drift.add(key);
      }
    }
    expect([...drift].sort()).toEqual([]);

    expect(payload.version).toBe(bundle.version);
    expect(payload.counts).toEqual(bundle.counts);
  });

  /**
   * A separate fixture, deliberately NOT the real seed: every seed key is authored as
   * `slugify(name)`, so a dropped `key` in CatalogService's reverse map would still be re-derived
   * identically and the parity test above could never catch it. A key that diverges from its name
   * (a variation renamed after shipping) is the case that makes carrying it load-bearing.
   */
  it('round-trips a variation key that diverges from slugify(name)', async () => {
    const { ingredients, cocktails } = buildCatalog(
      [
        { id: 'cachaca', name: 'Cachaça', category: 'spirit' },
        { id: 'vodka', name: 'Vodka', category: 'spirit' },
      ],
      [
        {
          id: 'caipirinha',
          name: 'Caipirinha',
          baseSpirit: 'rum',
          ingredients: [{ name: 'Cachaça', amount: 60, unit: 'ml' }],
          variations: [
            {
              key: 'caipiroska',
              name: 'Caipiroska (met wodka)',
              swaps: [{ from: 'Cachaça', to: 'Vodka' }],
            },
          ],
        },
      ],
    );
    const service = new CatalogService(
      { findAll: jest.fn().mockResolvedValue(ingredients.map((i) => ({ ...i }))) } as any,
      { findAll: jest.fn().mockResolvedValue(cocktails.map((c) => ({ ...c }))) } as any,
    );

    const payload = await service.getCatalog();
    const variation = payload.cocktails[0].variations![0];
    // slugify('Caipiroska (met wodka)') would be 'caipiroska-met-wodka' — the authored key must win.
    expect(variation.key).toBe('caipiroska');
    expect(variation.swaps).toEqual([{ fromId: 'cachaca', toId: 'vodka' }]);
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
