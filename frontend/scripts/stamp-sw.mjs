// Post-build: stamp a unique per-build id into the emitted service worker.
//
// public/sw.js ships with a `__BARKAST_BUILD__` placeholder in its CACHE_VERSION. Angular copies it
// to the build output verbatim (it's a static asset), so without this step every deploy would ship a
// byte-identical sw.js and the browser would never notice a new version. Here we replace the
// placeholder with a hash of ALL shipped output — JS/CSS bundles, the catalog data (catalog.json),
// icons, index.html, the manifest — so sw.js changes whenever anything ships changed, including
// data-only deploys where no JS/CSS content hash moves. That's what lets core/sw-update.service.ts
// detect a deploy and prompt to refresh. The hash is deterministic (same files + same bytes ⇒ same
// id), so an unchanged rebuild produces an identical sw.js and never nags the user.
//
// Runs from the frontend workspace as the second half of `npm run build` (see package.json). Fails
// loudly rather than shipping an un-stamped worker, so a broken build is caught in CI, not in the wild.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const PLACEHOLDER = '__BARKAST_BUILD__';

// ng build (application builder) emits to dist/frontend/browser. cwd is the frontend workspace when
// run via `npm run build --workspace frontend`; tolerate a run from the repo root too.
const browserDir = [resolve('dist/frontend/browser'), resolve('frontend/dist/frontend/browser')].find(
  (dir) => existsSync(resolve(dir, 'sw.js')),
);

if (!browserDir) {
  console.error('[stamp-sw] could not find sw.js in the build output — did `ng build` run first?');
  process.exit(1);
}

const swPath = resolve(browserDir, 'sw.js');
const source = readFileSync(swPath, 'utf8');

if (!source.includes(PLACEHOLDER)) {
  console.error(`[stamp-sw] placeholder ${PLACEHOLDER} not found in ${swPath} — nothing to stamp.`);
  process.exit(1);
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

// Every shipped file except the worker itself, keyed by OS-normalised relative path so the id is
// stable regardless of build platform.
const files = walk(browserDir)
  .filter((full) => full !== swPath)
  .map((full) => ({ full, rel: relative(browserDir, full).replaceAll('\\', '/') }))
  .sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));

if (!files.some((f) => f.rel.endsWith('.js'))) {
  console.error('[stamp-sw] no JS bundles in the build output — refusing to stamp a suspect build.');
  process.exit(1);
}

const hash = createHash('sha256');
for (const { full, rel } of files) {
  hash.update(rel);
  hash.update('\0');
  hash.update(readFileSync(full));
}
const buildId = hash.digest('hex').slice(0, 12);

writeFileSync(swPath, source.replaceAll(PLACEHOLDER, buildId));
console.log(`[stamp-sw] stamped sw.js → build id ${buildId} (hashed ${files.length} output files)`);
