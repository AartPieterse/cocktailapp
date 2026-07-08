import { MongoClient } from 'mongodb';
import { requireUri } from './_load-uri.mjs';

const uri = requireUri();
const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db();
  const res = await db.admin().ping();
  console.log('Ping OK:', JSON.stringify(res));
  const collections = await db.listCollections().toArray();
  console.log(`Database "${db.databaseName}" collections:`, collections.map((c) => c.name));
} catch (err) {
  console.error('Connection failed:', err.message);
  process.exitCode = 1;
} finally {
  await client.close();
}
