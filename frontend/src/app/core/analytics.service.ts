import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject, signal } from '@angular/core';
import type { AnalyticsEventType, AnalyticsIngestEvent } from '@cocktailapp/shared';
import { environment } from '../../environments/environment';

const OPTOUT_KEY = 'barkast.analyticsOptOut';
const FLUSH_AT = 10; // flush once this many events are buffered
const FLUSH_DELAY = 4000; // …or this long after the last event, whichever comes first

/**
 * Privacy-preserving product analytics (see docs/data-model.md / the backend AnalyticsModule).
 * Sends ONLY anonymous, aggregate events (`{ type, cocktailId?, ingredientId? }`) — no user id, no
 * device id, no personal data — batched to `POST {analyticsUrl}` (202, fire-and-forget).
 *
 * Two independent off-switches, both fully respected:
 *   - **Not configured**: when `environment.analyticsUrl` is empty (e.g. the static production build,
 *     which has no backend), the service is inert — it never buffers or sends anything.
 *   - **Opt-out**: the user can opt out; the choice is persisted and, once set, nothing is buffered
 *     or sent. Default is opted-in.
 * Network errors are swallowed (analytics must never affect the app), and a best-effort beacon
 * flushes the buffer when the page is hidden/closed.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly url = (environment.analyticsUrl ?? '').trim();
  /** Analytics is entirely inert when no endpoint is configured. */
  private readonly configured = this.url.length > 0;

  /** User opt-out, persisted to localStorage. Default: opted IN (send). */
  readonly optedOut = signal<boolean>(this.readOptOut());
  /** Whether an analytics endpoint is configured at all (drives whether to show the opt-out UI). */
  readonly available = this.configured;

  private buffer: AnalyticsIngestEvent[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(OPTOUT_KEY, this.optedOut() ? '1' : '0');
      } catch {
        /* storage unavailable — ignore */
      }
    });
    if (this.configured && typeof window !== 'undefined') {
      // Best-effort flush when the tab is backgrounded or closed.
      const flushOnHide = () => this.flush(true);
      window.addEventListener('pagehide', flushOnHide);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flushOnHide();
      });
    }
  }

  setOptOut(optOut: boolean): void {
    this.optedOut.set(optOut);
    if (optOut) this.buffer = []; // drop anything queued
  }

  /** Record one anonymous product event. No-op when unconfigured or opted out. */
  track(
    type: AnalyticsEventType,
    ids: { cocktailId?: string; ingredientId?: string } = {},
  ): void {
    if (!this.configured || this.optedOut()) return;
    this.buffer.push({
      type,
      ...(ids.cocktailId ? { cocktailId: ids.cocktailId } : {}),
      ...(ids.ingredientId ? { ingredientId: ids.ingredientId } : {}),
    });
    if (this.buffer.length >= FLUSH_AT) this.flush();
    else this.schedule();
  }

  private schedule(): void {
    if (this.timer) return;
    this.timer = setTimeout(() => this.flush(), FLUSH_DELAY);
  }

  private flush(useBeacon = false): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (!this.configured || this.optedOut() || this.buffer.length === 0) return;
    const events = this.buffer;
    this.buffer = [];
    if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      try {
        const blob = new Blob([JSON.stringify({ events })], { type: 'application/json' });
        if (navigator.sendBeacon(this.url, blob)) return;
      } catch {
        /* fall through to fetch */
      }
    }
    // Fire-and-forget; errors (offline / no backend) are intentionally ignored.
    this.http.post(this.url, { events }).subscribe({ error: () => {} });
  }

  private readOptOut(): boolean {
    try {
      return localStorage.getItem(OPTOUT_KEY) === '1';
    } catch {
      return false;
    }
  }
}
