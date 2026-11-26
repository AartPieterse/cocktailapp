/**
 * Production environment (static-first, self-hosted).
 *
 * This is the only production build there is: the bundle baked into the barkaart-web image that
 * Caddy serves from the box (frontend/Dockerfile). There is no third-party host.
 *
 * The deployed app is a fully static SPA: it reads the curated catalog from `catalog.json`
 * (generated at build time from iba-cocktails-seed.json — see scripts/build-catalog.mjs) and
 * runs the "wat kan ik maken" search client-side. There is no live backend or database in
 * production, so the admin CRUD UI is disabled.
 *
 * `apiUrl` is retained only so the shared service code type-checks; it is unused when
 * dataSource is 'static'.
 */
export const environment = {
  production: true,
  dataSource: 'static' as 'api' | 'static',
  admin: false,
  /**
   * Still off — and no longer for lack of a backend: the API runs on the same box, and the
   * relative `apiBaseUrl` below is already correct for the same-origin shape Caddy will serve.
   * What gates the flip is the hardening in docs/plans/public-access.md §2: `admin.guard.ts`
   * proves "LAN-only" by REJECTING the presence of a `CF-Connecting-IP` header, so with no
   * Cloudflare in the path that check now passes for everybody. Until it is a source-address
   * check, turning accounts on would put them behind an open admin dashboard. So the app stays a
   * fully anonymous, localStorage-only client (zero /api/* calls, account UI hidden).
   */
  authEnabled: false,
  apiUrl: '/api/',
  /** Base URL for auth + sync calls once a backend is deployed. Unused while `authEnabled` is false. */
  apiBaseUrl: '/api/',
  /** No backend in the static production build ⇒ AnalyticsService stays inert. */
  analyticsUrl: '',
  catalogUrl: 'catalog.json',
  /** Dutch display overlay applied on top of the canonical catalog (same version). */
  translationsUrl: 'catalog.nl.json',
};
