import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';
// Default-import the CommonJS shared build, then destructure (robust across the CJS/ESM boundary).
import shared from '@cocktailapp/shared';
import { requireUri } from './_load-uri.mjs';

const { buildCatalog } = shared;
const here = dirname(fileURLToPath(import.meta.url));

// Seed from the frozen, hand-curated source of truth, SHAPED by the shared buildCatalog — the exact
// same function scripts/build-catalog.mjs and the backend GET /api/catalog use. This stores the
// authored slug ids (as Mongo `_id`) and slug line `ingredientId`s, so the API, the offline bundle,
// and every client share one id space and the /api/catalog version matches the committed bundle.
const raw = JSON.parse(
  readFileSync(join(here, '..', 'iba-cocktails-seed.json'), 'utf8'),
);
const { ingredients, cocktails } = buildCatalog(
  raw.ingredients ?? [],
  raw.cocktails ?? [],
);

const uri = requireUri();
const client = new MongoClient(uri);

/** Case-insensitive index for ingredient names (matches the backend schema). */
const CI = { locale: 'en', strength: 2 };

try {
  await client.connect();
  const db = client.db();
  const ingredientsCol = db.collection('ingredients');
  const cocktailsCol = db.collection('cocktails');

  console.log('Clearing catalog collections…');
  // NOTE: only the catalog collections — never users / me-data / analytics.
  await Promise.all([ingredientsCol.deleteMany({}), cocktailsCol.deleteMany({})]);

  await ingredientsCol.dropIndexes().catch(() => {});
  await cocktailsCol.dropIndexes().catch(() => {});
  await ingredientsCol.createIndex(
    { name: 1 },
    { unique: true, name: 'name_ci_unique', collation: CI },
  );
  await cocktailsCol.createIndex({ name: 1 });
  await cocktailsCol.createIndex({ category: 1 });
  await cocktailsCol.createIndex({ tags: 1 });
  await cocktailsCol.createIndex({ 'ingredients.ingredientId': 1 });

  const now = new Date();

  console.log(`Inserting ${ingredients.length} ingredients…`);
  const ingredientDocs = ingredients.map((ing) => ({
    _id: ing.id, // authored slug id
    name: ing.name,
    ...(ing.category ? { category: ing.category } : {}),
    isStaple: ing.isStaple ?? false,
    ...(ing.parentId ? { parentId: ing.parentId } : {}),
    ...(ing.substitutes?.length ? { substitutes: ing.substitutes } : {}),
    ...(ing.aliases?.length ? { aliases: ing.aliases } : {}),
    createdAt: now,
    updatedAt: now,
  }));
  await ingredientsCol.insertMany(ingredientDocs);

  console.log(`Inserting ${cocktails.length} cocktails…`);
  const cocktailDocs = cocktails.map((c) => ({
    _id: c.id, // authored slug id
    name: c.name,
    ...(c.category ? { category: c.category } : {}),
    ...(c.baseSpirit ? { baseSpirit: c.baseSpirit } : {}),
    description: c.description ?? '',
    instructions: c.instructions ?? [],
    ingredients: c.ingredients, // already resolved to slug ingredientId + call/role/alternativeIds
    ...(c.glass ? { glass: c.glass } : {}),
    ...(c.method ? { method: c.method } : {}),
    ...(c.difficulty ? { difficulty: c.difficulty } : {}),
    ...(c.garnish ? { garnish: c.garnish } : {}),
    ...(c.notes ? { notes: c.notes } : {}),
    servings: c.servings ?? 1,
    tags: c.tags ?? [],
    ...(c.imageUrl ? { imageUrl: c.imageUrl } : {}),
    createdAt: now,
    updatedAt: now,
  }));
  await cocktailsCol.insertMany(cocktailDocs);

  const staples = ingredientDocs.filter((i) => i.isStaple).length;
  console.log('\nSeed complete:');
  console.log(`  ingredients: ${ingredientDocs.length} (${staples} staples)`);
  console.log(`  cocktails:   ${cocktailDocs.length}`);
} catch (err) {
  console.error('Seed failed:', err.message);
  process.exitCode = 1;
} finally {
  await client.close();
}
