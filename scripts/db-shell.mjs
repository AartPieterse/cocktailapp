import { spawnSync } from 'node:child_process';
import { requireUri } from './_load-uri.mjs';

// Opens an interactive mongosh shell against MONGODB_URI (downloads mongosh on first run via npx).
const uri = requireUri();
const result = spawnSync('npx', ['-y', 'mongosh', uri], { stdio: 'inherit', shell: true });
process.exitCode = result.status ?? 0;
