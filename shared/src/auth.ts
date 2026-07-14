/**
 * Cross-client contracts for the optional accounts + sync feature. The backend implements these
 * and the web client + backend consume them, so the shapes live here in the shared package.
 *
 * Accounts are optional: the app is fully usable offline with no account. Signing in syncs the
 * user's cabinet + favorites (arrays of catalog ingredient/cocktail ids — see `buildCatalog`).
 */

/** A registered user, as exposed by the API (never includes the password hash). */
export interface AuthUser {
  id: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Short-lived access token + longer-lived, rotating refresh token. */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** Returned by register / login / refresh. */
export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

/** The per-user synced state. `updatedAt` lets clients reason about staleness. */
export interface MeData {
  cabinet: string[];
  favorites: string[];
  updatedAt?: string;
}

/** Payload for PUT /api/me/data — the client's full working copy (server-authoritative once set). */
export interface UpdateMeData {
  cabinet: string[];
  favorites: string[];
}
