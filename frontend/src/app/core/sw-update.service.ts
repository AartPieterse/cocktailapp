import { Injectable, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { environment } from '../../environments/environment';

/**
 * Detects a newly-deployed version of the app and lets the UI offer a one-tap refresh.
 *
 * The custom service worker (public/sw.js) is byte-stamped per build (scripts/stamp-sw.mjs), so a
 * deploy makes the browser install a new worker that then sits in the "waiting" state — sw.js no
 * longer calls skipWaiting() at install. We surface that as {@link available}; {@link applyUpdate}
 * tells the waiting worker to take over and reloads the page once it does.
 *
 * Only the cached app shell/bundles are replaced — localStorage (cabinet, favourites, theme) is left
 * untouched, so a refresh never costs the user their data.
 *
 * Inert outside a production build, where no service worker is registered (see main.ts). Started once
 * at bootstrap via provideAppInitializer in app.config.ts. The app is zoneless, so writing the
 * `available`/`activating` signals is enough to update the UI — no NgZone dance needed.
 */
@Injectable({ providedIn: 'root' })
export class SwUpdateService {
  private readonly document = inject(DOCUMENT);

  /** A newer version is installed and waiting to activate. */
  readonly available = signal(false);
  /** A refresh is in flight (button pressed, reload imminent). */
  readonly activating = signal(false);

  private registration: ServiceWorkerRegistration | null = null;

  // Whether this page was already controlled by a worker at load. Combined with `claimHandled`
  // below, this lets us ignore the one controllerchange from a first-install clients.claim() while
  // still reloading on every genuine later takeover.
  private readonly initiallyControlled =
    this.supported() && !!navigator.serviceWorker.controller;
  private claimHandled = false;
  private userTriggered = false;
  private reloading = false;

  // Backstop poll for a fresh sw.js; the main trigger is the tab regaining focus (visibilitychange).
  private static readonly POLL_MS = 30 * 60 * 1000;

  init(): void {
    if (!this.supported()) return;

    // Reload once when a new worker takes control. Swallow exactly one controllerchange for the
    // first-install claim on a page that loaded uncontrolled (that isn't an update); every later
    // takeover — triggered by this tab or by another tab on the same origin — does reload.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (this.reloading) return;
      if (!this.initiallyControlled && !this.userTriggered && !this.claimHandled) {
        this.claimHandled = true;
        return;
      }
      this.reloading = true;
      this.document.defaultView?.location.reload();
    });

    navigator.serviceWorker.ready
      .then((reg) => {
        this.registration = reg;
        // Catch a worker that is already waiting, or one still installing when we attach (the
        // browser may have started its own update check before this ran), as well as future installs.
        if (reg.waiting) this.markAvailable();
        if (reg.installing) this.trackInstalling(reg.installing);
        reg.addEventListener('updatefound', () => {
          if (reg.installing) this.trackInstalling(reg.installing);
        });

        const check = () => reg.update().catch(() => undefined);
        this.document.addEventListener('visibilitychange', () => {
          if (this.document.visibilityState === 'visible') check();
        });
        setInterval(check, SwUpdateService.POLL_MS);
      })
      .catch(() => undefined);
  }

  /** Activate the waiting worker; the controllerchange listener then reloads the page. */
  applyUpdate(): void {
    if (this.activating()) return;
    this.userTriggered = true;
    this.activating.set(true);
    const waiting = this.registration?.waiting;
    if (waiting) {
      waiting.postMessage('skip-waiting');
    } else {
      // No worker waiting (shouldn't happen once `available` is set) — a plain reload still pulls the
      // newest shell via the network-first navigation handler.
      this.document.defaultView?.location.reload();
    }
  }

  private trackInstalling(worker: ServiceWorker): void {
    worker.addEventListener('statechange', () => {
      // "installed" while a worker is already controlling the page ⇒ an update (not the first install).
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        this.markAvailable();
      }
    });
  }

  private markAvailable(): void {
    this.available.set(true);
  }

  private supported(): boolean {
    return environment.production && typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
  }
}
