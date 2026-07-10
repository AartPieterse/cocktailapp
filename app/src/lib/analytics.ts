import { postEvents, type AnalyticsEvent } from './api';
import { hasBackend } from './config';
import { useSettings } from '../store/settings';

/**
 * Privacy-preserving product analytics. Events are **anonymous** (no user id, no device
 * fingerprint) and fire-and-forget; the backend keeps only aggregate counters (see the backend
 * AnalyticsModule). Sending is skipped entirely when the user has opted out or no backend is
 * configured. Failures are swallowed — analytics must never affect the local-first experience.
 */
export function track(event: AnalyticsEvent): void {
  if (!hasBackend) return;
  if (useSettings.getState().analyticsOptOut) return;
  void postEvents([event]).catch(() => undefined);
}
