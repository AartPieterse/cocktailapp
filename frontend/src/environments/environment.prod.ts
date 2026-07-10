/**
 * Production environment (static-first).
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
  apiUrl: '/api/',
  catalogUrl: 'catalog.json',
  /** Dutch display overlay applied on top of the canonical catalog (same version). */
  translationsUrl: 'catalog.nl.json',
};
