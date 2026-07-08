import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';
import { requireUri } from './_load-uri.mjs';

const here = dirname(fileURLToPath(import.meta.url));

// Seed source: the IBA dataset (iba-cocktails-seed.json) by default; set
// SEED_SRC=nl to use the curated Dutch set in seed-data.mjs instead.
let ingredients, cocktails;
if (process.env.SEED_SRC === 'nl') {
  ({ ingredients, cocktails } = await import('./seed-data.mjs'));
  console.log('Seed source: seed-data.mjs (curated NL set)');
} else {
  ({ ingredients, cocktails } = JSON.parse(
    readFileSync(join(here, '..', 'iba-cocktails-seed.json'), 'utf8'),
  ));
  console.log('Seed source: iba-cocktails-seed.json (IBA set)');
}

const uri = requireUri();
const client = new MongoClient(uri);

/** Case-insensitive index for ingredient names (matches the backend schema). */
const CI = { locale: 'en', strength: 2 };

try {
  await client.connect();
  const db = client.db();
  const ingredientsCol = db.collection('ingredients');
  const cocktailsCol = db.collection('cocktails');

  console.log('Clearing existing collections…');
  await Promise.all([ingredientsCol.deleteMany({}), cocktailsCol.deleteMany({})]);

  // Drop stale indexes, then (re)create the ones the app relies on.
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
    name: ing.name.trim(),
    category: ing.category,
    isStaple: ing.isStaple ?? false,
    createdAt: now,
    updatedAt: now,
  }));
  const { insertedIds } = await ingredientsCol.insertMany(ingredientDocs);

  // name (lowercased) -> { _id, name }
  const byName = new Map();
  ingredientDocs.forEach((doc, i) => {
    byName.set(doc.name.toLowerCase(), { _id: insertedIds[i], name: doc.name });
  });

  console.log(`Inserting ${cocktails.length} cocktails…`);
  const cocktailDocs = cocktails.map((c) => {
    const lines = (c.ingredients ?? []).map((line) => {
      const found = byName.get(line.name.trim().toLowerCase());
      if (!found) {
        throw new Error(
          `Cocktail "${c.name}" references unknown ingredient "${line.name}". Add it to the seed source.`,
        );
      }
      return {
        ingredientId: found._id,
        name: found.name,
        amount: line.amount,
        unit: line.unit,
        ...(line.note ? { note: line.note } : {}),
        optional: line.optional ?? false,
      };
    });

    return {
      name: c.name,
      ...(c.category ? { category: c.category } : {}),
      description: c.description ?? '',
      instructions: c.instructions ?? [],
      ingredients: lines,
      glass: c.glass,
      method: c.method,
      difficulty: c.difficulty,
      garnish: c.garnish,
      ...(c.notes ? { notes: c.notes } : {}),
      servings: c.servings ?? 1,
      tags: c.tags ?? [],
      ...(c.imageUrl ? { imageUrl: c.imageUrl } : {}),
      createdAt: now,
      updatedAt: now,
    };
  });
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
