/**
 * Development environment.
 *
 * `dataSource: 'api'` runs the app against the local NestJS + MongoDB backend, so the full
 * admin CRUD workflow (create / edit / delete cocktails & ingredients) is available for
 * authoring the catalog. The production values live in environment.prod.ts (swapped in by
 * angular.json fileReplacements), where `dataSource` is 'static'.
 *
 * `apiUrl` must end with a trailing slash; the backend serves under /api.
 */
export const environment = {
  production: false,
  /** 'api' = talk to the NestJS backend; 'static' = read the bundled catalog.json. */
  dataSource: 'api' as 'api' | 'static',
  /** When true, the create/edit/delete admin UI + routes are enabled. */
  admin: true,
  apiUrl: 'http://localhost:3000/api/',
  /** Static catalog location (used only when dataSource === 'static'). */
  catalogUrl: 'catalog.json',
};
