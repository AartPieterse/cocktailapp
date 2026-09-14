import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environments/environment';
import { migrateLegacyStorageKeys } from './app/core/storage-migration';

// Carry a pre-rename install's cabinet, favourites and preferences over to the `barkaart.*`
// keys. Must run before bootstrap: the services read their key once, at construction.
migrateLegacyStorageKeys();

// Capture the browser's install prompt as early as possible — it can fire before Angular
// has bootstrapped. We stash it on window and re-broadcast so PwaService can pick it up
// whenever it initialises. See core/pwa.service.ts.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as unknown as { __barkaartInstallPrompt?: Event }).__barkaartInstallPrompt = e;
  window.dispatchEvent(new Event('barkaart:installable'));
});

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

// Register the service worker (production only) so the site is installable and works offline.
// In dev it stays off to avoid serving stale bundles from the cache.
if (environment.production && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => undefined);
  });
}
