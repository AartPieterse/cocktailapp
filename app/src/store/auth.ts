import type { AuthResponse, AuthUser } from '@cocktailapp/shared';
import { create } from 'zustand';
import * as api from '../lib/api';
import { ApiError } from '../lib/api';
import { secureStorage } from '../lib/storage';

const REFRESH_KEY = 'barkast_refresh_token';

/**
 * Optional accounts. The app is fully usable signed-out; signing in enables cross-device sync of
 * the cabinet + favorites (see store/sync.ts).
 *
 * Token strategy (per the plan): the short-lived **access token lives in memory only** (never
 * persisted), and the rotating **refresh token lives in SecureStore** (Keychain/Keystore on
 * native, localStorage on web — there is no browser keychain, and sign-in there is opt-in). On
 * launch we try to exchange a stored refresh token for a fresh session ({@link initAuth}).
 */
interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  status: 'loading' | 'anonymous' | 'authenticated';
  error: string | null;
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Wipe the account + all synced data server-side, then sign out locally. */
  deleteAccount: () => Promise<void>;
  /**
   * Run an authenticated request, refreshing the access token once on a 401 and retrying. Returns
   * `null` if there is no session or the refresh fails (the caller should treat that as offline).
   */
  withAuth: <T>(fn: (accessToken: string) => Promise<T>) => Promise<T | null>;
}

async function applySession(res: AuthResponse): Promise<void> {
  await secureStorage.set(REFRESH_KEY, res.tokens.refreshToken);
  useAuth.setState({
    user: res.user,
    accessToken: res.tokens.accessToken,
    status: 'authenticated',
    error: null,
  });
}

async function clearSession(): Promise<void> {
  await secureStorage.remove(REFRESH_KEY);
  useAuth.setState({ user: null, accessToken: null, status: 'anonymous', error: null });
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  status: 'loading',
  error: null,

  register: async (email, password) => {
    set({ error: null });
    try {
      await applySession(await api.register(email, password));
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Registreren mislukt.' });
      throw e;
    }
  },

  login: async (email, password) => {
    set({ error: null });
    try {
      await applySession(await api.login(email, password));
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Inloggen mislukt.' });
      throw e;
    }
  },

  logout: async () => {
    const rt = await secureStorage.get(REFRESH_KEY);
    if (rt) await api.logout(rt).catch(() => undefined); // best-effort revoke; ignore network errors
    await clearSession();
  },

  deleteAccount: async () => {
    await get().withAuth((token) => api.deleteAccount(token));
    await clearSession();
  },

  withAuth: async (fn) => {
    let token = get().accessToken;
    // No in-memory access token yet — try to mint one from the stored refresh token.
    if (!token) {
      const ok = await tryRefresh();
      token = ok ? get().accessToken : null;
      if (!token) return null;
    }
    try {
      return await fn(token);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        const ok = await tryRefresh();
        const fresh = ok ? get().accessToken : null;
        if (fresh) return fn(fresh);
        await clearSession();
        return null;
      }
      throw e;
    }
  },
}));

/** Exchange the stored refresh token for a new session. Returns false if none/expired. */
async function tryRefresh(): Promise<boolean> {
  const rt = await secureStorage.get(REFRESH_KEY);
  if (!rt) return false;
  try {
    await applySession(await api.refresh(rt));
    return true;
  } catch {
    await clearSession();
    return false;
  }
}

/** Call once on app start: restore a session from the stored refresh token, or fall back to anon. */
export async function initAuth(): Promise<void> {
  const ok = await tryRefresh();
  if (!ok) useAuth.setState({ status: 'anonymous' });
}
