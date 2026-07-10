/**
 * Contracts for privacy-preserving product analytics (see docs/mobile-app-plan.md Part E).
 *
 * Events are **anonymous** — no user id, no device fingerprint, no IP stored. The backend keeps
 * only **aggregate counters** in daily buckets (per-event-type totals + per-cocktail / per-ingredient
 * tallies); there is deliberately no raw, identifiable event stream, and no active-device counting
 * (which would require a device token we choose not to mint). The app respects an opt-out and sends
 * nothing when it is set.
 */

/** Known product event types the app emits. Stored as free-form strings; this list documents them. */
export type AnalyticsEventType =
  | 'cocktail_view'
  | 'cabinet_add'
  | 'surprise_me'
  | 'wizard_complete'
  | 'catalog_refresh';

/** One anonymous event. `cocktailId` / `ingredientId` are catalog slugs, never anything personal. */
export interface AnalyticsIngestEvent {
  type: string;
  cocktailId?: string;
  ingredientId?: string;
}

/** Body of POST /api/events. Batched so the app can flush a few events in one request. */
export interface AnalyticsIngestRequest {
  events: AnalyticsIngestEvent[];
}

/** A ranked tally entry (a catalog id + how often it was seen in the window). */
export interface AnalyticsTally {
  id: string;
  count: number;
}

/** Aggregated product analytics over a recent window, for the LAN admin dashboard. */
export interface AnalyticsSummary {
  /** Size of the window in days. */
  days: number;
  /** Per-event-type totals across the window. */
  totals: Record<string, number>;
  /** Most-viewed / most-favorited cocktails (by tallied events). */
  topCocktails: AnalyticsTally[];
  /** Most-added ingredients. */
  topIngredients: AnalyticsTally[];
}

/** In-process operational metrics, for the LAN admin dashboard. */
export interface OperationalMetrics {
  startedAt: string;
  uptimeSeconds: number;
  requests: number;
  errors: number;
  avgLatencyMs: number;
}

/** Combined payload the admin dashboard reads. */
export interface AdminMetrics {
  analytics: AnalyticsSummary;
  operational: OperationalMetrics;
}
