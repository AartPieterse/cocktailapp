import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  AuthResponse,
  AuthTokens,
  AuthUser,
  LoginRequest,
  RefreshRequest,
  RegisterRequest,
} from '@cocktailapp/shared';
import { Observable, finalize, map, of, shareReplay, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

const KEY = 'barkast.auth';

interface StoredAuth {
  user: AuthUser;
  tokens: AuthTokens;
}

/**
 * Optional accounts for cross-device sync. Talks to the NestJS backend's `/auth/*` endpoints.
 * Tokens come back in the JSON body (not a cookie), so both the access and the rotating refresh
 * token are persisted to localStorage under `barkast.auth` — the refresh token must be JS-readable
 * to send it on the next `POST /auth/refresh`. localStorage is XSS-readable; acceptable here since
 * the app renders no user HTML (Angular escapes by default) and the synced data is low-sensitivity.
 * The whole service is inert when `environment.authEnabled` is false.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  private tokens: AuthTokens | null = null;
  private readonly _user = signal<AuthUser | null>(null);
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  /** Single in-flight refresh shared across concurrent 401s so the rotating token is consumed once. */
  private refresh$: Observable<string> | null = null;

  constructor() {
    if (environment.authEnabled) this.hydrate();
  }

  /** Synchronous access-token accessor for the auth interceptor. */
  accessToken(): string | null {
    return this.tokens?.accessToken ?? null;
  }

  register(email: string, password: string): Observable<AuthUser> {
    const body: RegisterRequest = { email, password };
    return this.http
      .post<AuthResponse>(`${this.base}auth/register`, body)
      .pipe(tap((res) => this.store(res)), map((res) => res.user));
  }

  login(email: string, password: string): Observable<AuthUser> {
    const body: LoginRequest = { email, password };
    return this.http
      .post<AuthResponse>(`${this.base}auth/login`, body)
      .pipe(tap((res) => this.store(res)), map((res) => res.user));
  }

  /** Rotate the token pair. Returns a shared observable so a burst of 401s triggers one rotation. */
  refresh(): Observable<string> {
    if (this.refresh$) return this.refresh$;
    const refreshToken = this.tokens?.refreshToken;
    if (!refreshToken) return throwError(() => new Error('Geen refresh-token beschikbaar.'));
    const body: RefreshRequest = { refreshToken };
    this.refresh$ = this.http.post<AuthResponse>(`${this.base}auth/refresh`, body).pipe(
      tap({
        next: (res) => this.store(res),
        error: () => this.clear(),
      }),
      map((res) => res.tokens.accessToken),
      finalize(() => (this.refresh$ = null)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.refresh$;
  }

  /** Best-effort server logout, then drop the local session. Local cabinet/favorites are kept. */
  logout(): void {
    const refreshToken = this.tokens?.refreshToken;
    if (refreshToken) {
      const body: RefreshRequest = { refreshToken };
      this.http.post(`${this.base}auth/logout`, body).subscribe({ error: () => undefined });
    }
    this.clear();
  }

  /** GDPR: wipe the account server-side, then log out locally. */
  deleteAccount(): Observable<void> {
    if (!this.tokens) return of(void 0);
    return this.http.delete<void>(`${this.base}me`).pipe(tap(() => this.clear()));
  }

  private store(res: AuthResponse): void {
    this.tokens = res.tokens;
    this._user.set(res.user);
    this.persist({ user: res.user, tokens: res.tokens });
  }

  private clear(): void {
    this.tokens = null;
    this._user.set(null);
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }

  private hydrate(): void {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredAuth;
      if (parsed?.tokens?.accessToken && parsed?.user) {
        this.tokens = parsed.tokens;
        this._user.set(parsed.user);
      }
    } catch {
      /* ignore corrupt storage */
    }
  }

  private persist(value: StoredAuth): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(value));
    } catch {
      /* storage unavailable — ignore */
    }
  }
}
