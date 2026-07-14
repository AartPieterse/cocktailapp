# Barkast API (backend)

The **Barkast** NestJS API: the cocktail catalog authoring service, plus the optional accounts /
per-user sync / anonymous-analytics backend for the app. Built on **NestJS 11**, **Mongoose 9**,
**MongoDB**, **TypeScript 5.7**, and the workspace package **`@cocktailapp/shared`**.

> In production the app ships as a **static SPA** that reads a pre-built catalog bundle and computes
> "makeable" client-side — this backend is **not** part of the public production deployment. It is used
> in **dev** for catalog authoring, and can be **self-hosted** (see [`../deploy/README.md`](../deploy/README.md))
> to enable optional accounts, cabinet/favorites sync, and analytics.

## Modules

- **IngredientsModule / CocktailsModule** — catalog CRUD; `POST /cocktails/makeable` runs the shared
  `computeMakeable` engine. Ids are **authored string slugs** (not ObjectIds), so they match the
  offline bundle's id space.
- **CatalogModule** — `GET /catalog` builds the whole catalog via the shared `buildCatalog` and serves
  it with a content-hash version / ETag.
- **AuthModule** — `register` / `login` / `refresh` / `logout`, JWT access tokens + rotating,
  persisted refresh tokens.
- **MeModule** — per-user cabinet/favorites sync (`GET`/`PUT /me/data`) and GDPR account deletion
  (`DELETE /me`).
- **AnalyticsModule** — anonymous aggregate event ingest (`POST /events`), a LAN-only admin
  metrics/dashboard, and a global `MetricsInterceptor` (request/error/latency/uptime).
- **common** — `CfThrottlerGuard` (rate limiting keyed on the real client IP), `MongoExceptionFilter`,
  and the `client-ip` helper.

## API

All routes are mounted under a global **`/api`** prefix (`app.setGlobalPrefix('api')`).

**Catalog — public (no auth guard):**

- `GET /api/ingredients?category=` · `POST /api/ingredients` · `PATCH /api/ingredients/:id` (renames
  propagate into cocktail lines) · `DELETE /api/ingredients/:id` (409 if still referenced)
- `GET /api/cocktails?q=&tag=` (name search is regex-escaped) · `GET /api/cocktails/random` ·
  `GET /api/cocktails/:id` · `POST /api/cocktails` · `PATCH /api/cocktails/:id` · `DELETE /api/cocktails/:id`
- `POST /api/cocktails/makeable` — body `{ availableIngredientIds, maxMissing? (0–3) }`, forced
  HTTP 200, returns `MakeableResult[]`
- `GET /api/catalog` — full catalog; sets a strong ETag (`sha256`/12 of the content) and returns 304 on
  a matching `If-None-Match`

**Auth:**

- `POST /api/auth/register` (201; per-IP throttle 10/min) · `POST /api/auth/login` (200) ·
  `POST /api/auth/refresh` (200) · `POST /api/auth/logout` (204) · `GET /api/auth/me` (**JWT**)

**Per-user sync (all JWT):**

- `GET /api/me/data` · `PUT /api/me/data` (cabinet + favorites, each ≤1000 slug ids) ·
  `DELETE /api/me` (204 — deletes user data, revokes all refresh tokens, deletes the user)

**Analytics & admin:**

- `POST /api/events` — public, HTTP 202, per-IP throttle 60/min; folds a batch (≤50) into today's
  UTC-day aggregate bucket (counters only, no identifiers)
- `GET /api/admin/metrics` (JSON) · `GET /api/admin/dashboard` (HTML) — both **admin**

## Auth model

- The **only JWT-protected** routes are `GET /api/auth/me` and everything under `/api/me`. The guard is
  a hand-rolled `JwtAuthGuard` that verifies a `Bearer` access token (signed with the access secret;
  refresh tokens fail here because they use a different secret).
- The **only admin routes** are `/api/admin/*`, protected by `AdminGuard` — **two independent
  defenses, both must pass**: (1) any request carrying a Cloudflare `CF-Connecting-IP` header is
  rejected (so it's invisible over the tunnel and reachable only on the LAN), and (2) HTTP Basic auth
  against `ADMIN_USER` / `ADMIN_PASSWORD` (fail-closed if either is unset).
- **Everything else is public**, including all catalog write endpoints and `GET /api/catalog`. A
  self-hosted backend must therefore rely on the network boundary (Cloudflare tunnel + trusted origin),
  not per-route auth, to protect catalog writes.
- **Tokens:** access tokens signed with `JWT_SECRET` (default `15m`); refresh tokens signed with
  `JWT_REFRESH_SECRET` (default `30d`) and stored as only a random `jti` + `userId` + `expiresAt`
  (TTL-reaped). Each refresh **rotates** the token (single-use jti); the JWT itself is never stored.

## Security & platform

- **helmet()** default security headers (global).
- **Global rate limiting:** `ThrottlerModule` (ttl 60s / limit 120) via `CfThrottlerGuard`, which keys
  on the **real client IP** (`CF-Connecting-IP` header, else `req.ip`). Plus per-route throttles
  (register 10/min, events 60/min) and the in-memory `LoginThrottleGuard` (10 attempts / 15 min,
  composite `email|IP` key so an attacker can't lock out a victim).
- **Global `ValidationPipe`** — `whitelist` (strips unknown props) + `transform` + implicit conversion.
- **Global `MongoExceptionFilter`** — maps Mongo/Mongoose errors to clean HTTP (duplicate key → 409,
  `CastError`/`ValidationError` → 400, unknown → 500); `HttpException`s pass through.
- **CORS** — explicit comma-separated allowlist in production; reflects any origin only when
  `CORS_ORIGIN` is unset (dev).
- **`trust proxy`** — set from `TRUST_PROXY` (default 1 hop) so Express resolves the real client IP
  behind the Cloudflare tunnel.

> The login throttle and the global throttler both use **in-memory** state — correct for the
> single-replica self-hosted v1, but horizontal scaling would need a shared store.

## Environment variables

Copy `.env.example` to `.env` and fill it in. The API **crashes at boot** (via `getOrThrow`) if a
required variable is missing.

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `MONGODB_URI` | ✅ | — | Mongo connection string (Atlas or self-hosted) |
| `PORT` | | `3000` | |
| `NODE_ENV` | | — | `production` toggles CORS enforcement |
| `TRUST_PROXY` | | `1` | Express trust-proxy hops |
| `CORS_ORIGIN` | prod | — | Comma-separated allowlist; **boot fails** if `NODE_ENV=production` and unset |
| `JWT_SECRET` | ✅ | — | Access-token secret |
| `JWT_REFRESH_SECRET` | ✅ | — | Refresh-token secret; **boot fails if equal to `JWT_SECRET`** |
| `JWT_ACCESS_EXPIRES` | | `15m` | |
| `JWT_REFRESH_EXPIRES` | | `30d` | |
| `ADMIN_USER` / `ADMIN_PASSWORD` | admin | — | Both required for `/api/admin/*` (fail-closed) |

## Running

The shared package must be built first. From the **repo root**:

```bash
npm run build:shared      # compile @cocktailapp/shared
npm run start:backend     # this API in watch mode (start:dev)
npm run dev               # backend + frontend together
npm run db:seed           # seed the catalog collections (ingredients + cocktails) from iba-cocktails-seed.json
```

On boot you should see `Barkast API listening on http://localhost:3000/api`.

Within this workspace (`backend/`):

```bash
npm run start:dev         # watch mode
npm run build             # nest build → dist/
npm run start:prod        # node dist/main
npm run test              # Jest unit tests (ts-jest)
npm run test:cov          # coverage
```

> Tests here use **Jest** (the frontend uses Vitest). There is no separate e2e harness configured
> beyond the default Nest scaffold.

## Node version

Targets **Node 24** (the Dockerfile base image is `node:24-slim` and CI uses Node 24). Note there is no
`engines` field pinning this in `package.json`.

## Deployment

The backend ships as a **`node:24-slim` multi-stage Docker image** ([`Dockerfile`](Dockerfile), build
context = repo root, runs as a non-root user, `CMD node backend/dist/main.js`) and is self-hosted via
the Docker Compose stack (API + `mongo:7` + `cloudflared`) documented in
[`../deploy/README.md`](../deploy/README.md).
