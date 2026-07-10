import type {
  AuthResponse,
  Catalog,
  MeData,
  UpdateMeData,
} from '@cocktailapp/shared';
import { API_BASE_URL } from './config';

/** An HTTP error from the API, carrying the status so callers can branch (401 → refresh, etc.). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  opts: RequestInit & { accessToken?: string } = {},
): Promise<T> {
  const { accessToken, headers, ...rest } = opts;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (body && typeof body.message === 'string' && body.message) ||
      (Array.isArray(body?.message) && body.message.join(', ')) ||
      `Verzoek mislukt (${res.status}).`;
    throw new ApiError(res.status, message);
  }
  return body as T;
}

/** Result of a conditional catalog fetch: either fresh content, or `notModified` for a 304. */
export type CatalogFetch =
  | { notModified: true }
  | { notModified: false; catalog: Catalog; etag: string | null };

/** GET /api/catalog with `If-None-Match` — returns `notModified` on a 304 so callers keep the cache. */
export async function fetchCatalog(etag?: string): Promise<CatalogFetch> {
  const res = await fetch(`${API_BASE_URL}/catalog`, {
    headers: etag ? { 'If-None-Match': etag } : {},
  });
  if (res.status === 304) return { notModified: true };
  if (!res.ok) throw new ApiError(res.status, `Catalogus ophalen mislukt (${res.status}).`);
  const catalog = (await res.json()) as Catalog;
  return { notModified: false, catalog, etag: res.headers.get('etag') };
}

// --- Auth ---

export const register = (email: string, password: string) =>
  request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const login = (email: string, password: string) =>
  request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const refresh = (refreshToken: string) =>
  request<AuthResponse>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });

export const logout = (refreshToken: string) =>
  request<void>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });

// --- Me (per-user synced data) — all require an access token ---

export const getMeData = (accessToken: string) =>
  request<MeData>('/me/data', { accessToken });

export const putMeData = (accessToken: string, data: UpdateMeData) =>
  request<MeData>('/me/data', {
    method: 'PUT',
    accessToken,
    body: JSON.stringify(data),
  });

export const deleteAccount = (accessToken: string) =>
  request<void>('/me', { method: 'DELETE', accessToken });

// --- Analytics (anonymous, fire-and-forget) ---

/** Anonymous product event. No user id, no device fingerprint — see the analytics privacy note. */
export interface AnalyticsEvent {
  type: string;
  cocktailId?: string;
  ingredientId?: string;
}

export const postEvents = (events: AnalyticsEvent[]) =>
  request<void>('/events', {
    method: 'POST',
    body: JSON.stringify({ events }),
  });
