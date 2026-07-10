/* Barkast service worker — makes the web/PWA build installable and offline-capable.
 *
 * Strategy:
 *   - navigations: network-first, falling back to the cached app shell (`/index.html`) so the SPA
 *     loads with no connection (the catalog is bundled into the JS, so the whole app works offline);
 *   - same-origin GET assets (JS/CSS/images/fonts): stale-while-revalidate — instant from cache,
 *     refreshed in the background;
 *   - everything else (e.g. API calls to another origin): passthrough, so the app's own local-first
 *     network handling and ETag revalidation stay in control.
 *
 * Bump CACHE_VERSION to invalidate old caches on the next visit.
 */
const CACHE_VERSION = 'barkast-v1';
const SHELL = ['/', '/index.html', '/manifest.json'];

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

  // Cross-origin (e.g. the API) → leave to the app's own local-first handling.
  if (!sameOrigin) return;

  // Same-origin assets → stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
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
