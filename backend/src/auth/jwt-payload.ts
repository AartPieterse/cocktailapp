/** Claims carried by the short-lived access token. */
export interface AccessTokenPayload {
  sub: string; // user id
  email: string;
}

/** Claims carried by the rotating refresh token. `jti` is looked up for revocation. */
export interface RefreshTokenPayload {
  sub: string; // user id
  jti: string;
}

/** What the JwtAuthGuard attaches to the request and @CurrentUser() returns. */
export interface AuthenticatedUser {
  userId: string;
  email: string;
}
