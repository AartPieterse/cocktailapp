/* Barkast service worker — makes the website installable (PWA) and offline-capable.
 *
 * Strategy:
 *   - navigations: network-first, falling back to the cached app shell (`/index.html`) so the SPA
 *     still loads with no connection;
 *   - content-hashed build assets (…-<hash>.js/.css): cache-first — the URL changes when content
 *     changes, so a cached hit can never be stale; serving it without a network revalidation saves
 *     a request/bandwidth/battery on every repeat load;
 *   - other same-origin GET assets (un-hashed catalog.json, icons) and cross-origin (fonts):
 *     stale-while-revalidate — instant from cache, refreshed in the background;
 *   - the API (`/api/…`): passthrough, so the app's own HTTP handling and error interceptor stay in
 *     control and data is never served stale from the shell cache.
 *
 * CACHE_VERSION is stamped with a unique per-build id (scripts/stamp-sw.mjs), so every production
 * deploy ships a byte-changed sw.js. The browser then installs a new worker on its next check, which
 * waits (see the install handler) until the app prompts the user to refresh — see
 * core/sw-update.service.ts. No manual version bump needed.
 */
const BUILD_ID = '__BARKAST_BUILD__'; // replaced at build time; stays literal (harmless) in dev
const CACHE_VERSION = `barkast-${BUILD_ID}`;

/** Content-hashed, immutable build output (e.g. `chunk-O62CME4F.js`, `styles-A1B2C3D4.css`). */
const IMMUTABLE_ASSET = /-[A-Z0-9]{8,}\.(?:js|css)$/i;
const SHELL = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  // No self.skipWaiting() here on purpose: a new worker stays "waiting" until the app posts
  // 'skip-waiting' (see the message handler), so an update only takes over after the user taps
  // "Vernieuwen" and we do a controlled reload. On the very first install there is no active worker
  // to wait behind, so it still activates right away and the app works offline immediately.
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL).catch(() => undefined)),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Never intercept the API — let the app's HTTP client handle it (fresh data + error handling).
  if (sameOrigin && url.pathname.startsWith('/api/')) return;

  // App navigations → network-first, fall back to the cached shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put('/index.html', copy)).catch(() => undefined);
          return res;
        })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/'))),
    );
    return;
  }

  // Content-hashed build assets → cache-first: the hash guarantees the cached copy matches the URL,
  // so there is nothing to revalidate. A new build ships new URLs, which miss and get cached fresh.
  if (sameOrigin && IMMUTABLE_ASSET.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => undefined);
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Cross-origin (e.g. Google Fonts) → stale-while-revalidate too, but tolerate opaque failures.
  // Other same-origin assets (un-hashed, e.g. catalog.json) → stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && (res.status === 200 || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => undefined);
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});

// Let the page trigger an immediate activation after an update.
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});
