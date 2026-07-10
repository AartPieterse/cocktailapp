/* Barkast service worker — makes the website installable (PWA) and offline-capable.
 *
 * Strategy:
 *   - navigations: network-first, falling back to the cached app shell (`/index.html`) so the SPA
 *     still loads with no connection;
 *   - same-origin GET assets (hashed JS/CSS, icons, catalog.json, fonts): stale-while-revalidate —
 *     instant from cache, refreshed in the background;
 *   - the API (`/api/…`) and any cross-origin request: passthrough, so the app's own HTTP handling
 *     and error interceptor stay in control and data is never served stale from the shell cache.
 *
 * Bump CACHE_VERSION to invalidate old caches on the next visit.
 */
const CACHE_VERSION = 'barkast-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL).catch(() => undefined)),
  );
  self.skipWaiting();
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

  // Cross-origin (e.g. Google Fonts) → stale-while-revalidate too, but tolerate opaque failures.
  // Same-origin assets → stale-while-revalidate.
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
