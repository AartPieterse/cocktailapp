import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Resolve the MongoDB connection string from the MONGODB_URI env var,
 * falling back to backend/.env. Returns null if not found.
 */
export function loadUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  try {
    const envFile = readFileSync(join(here, '..', 'backend', '.env'), 'utf8');
    const line = envFile.split(/\r?\n/).find((l) => l.trim().startsWith('MONGODB_URI='));
    if (line) {
      return line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');
    }
  } catch {
    // no .env yet
  }
  return null;
}

export function requireUri() {
  const uri = loadUri();
  if (!uri) {
    console.error(
      'No MONGODB_URI found. Set it in backend/.env (copy backend/.env.example) or export MONGODB_URI.',
    );
    process.exit(1);
  }
  return uri;
}
