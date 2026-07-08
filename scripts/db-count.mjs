import { MongoClient } from 'mongodb';
import { requireUri } from './_load-uri.mjs';

const uri = requireUri();
const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db();
  const cocktails = await db.collection('cocktails').countDocuments();
  const ingredients = await db.collection('ingredients').countDocuments();
  console.log(`Database "${db.databaseName}":`);
  console.log(`  cocktails:   ${cocktails}`);
  console.log(`  ingredients: ${ingredients}`);
} catch (err) {
  console.error('Connection failed:', err.message);
  process.exitCode = 1;
} finally {
  await client.close();
}
