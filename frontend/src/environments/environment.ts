/**
 * Development API base URL. Must end with a trailing slash; the backend serves under /api.
 * The production values live in environment.prod.ts (swapped in by angular.json fileReplacements).
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api/',
};
