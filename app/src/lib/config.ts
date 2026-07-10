import Constants from 'expo-constants';

/**
 * Where the app talks to the backend. Local-first: the app is fully usable with NO backend at all
 * (bundled catalog + on-device compute), so this only matters for optional catalog refresh, sign-in
 * and cross-device sync.
 *
 * Resolution order:
 *   1. `EXPO_PUBLIC_API_URL` — set per environment (dev: your PC's LAN IP; prod: the tunnel host).
 *   2. `expo.extra.apiUrl` in app.json — a baked-in default for shipped builds.
 *   3. `''` — no backend configured; the client degrades gracefully to offline-only.
 *
 * A trailing `/api` is expected (the backend serves everything under the `/api` global prefix).
 */
const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
const fromExtra = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl?.trim();

export const API_BASE_URL = (fromEnv || fromExtra || '').replace(/\/+$/, '');

/** True when a backend is configured, so accounts/sync/refresh can be attempted. */
export const hasBackend = API_BASE_URL.length > 0;
