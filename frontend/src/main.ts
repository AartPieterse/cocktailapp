import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environments/environment';

// Capture the browser's install prompt as early as possible — it can fire before Angular
// has bootstrapped. We stash it on window and re-broadcast so PwaService can pick it up
// whenever it initialises. See core/pwa.service.ts.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as unknown as { __barkastInstallPrompt?: Event }).__barkastInstallPrompt = e;
  window.dispatchEvent(new Event('barkast:installable'));
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
