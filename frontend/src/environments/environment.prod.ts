/**
 * Production API base URL. Defaults to a relative `/api/` so the frontend can be served
 * behind the same origin / a reverse proxy as the backend. Override at build time if the
 * API lives on a different origin (e.g. 'https://api.example.com/api/').
 */
export const environment = {
  production: true,
  apiUrl: '/api/',
};
