# Barkast 🍸

**Wat staat er in jouw bar — en wat kun je daarmee maken?**

Barkast is a full-stack cocktail app built around one flagship idea: you tick off the ingredients
you have on hand (**"Mijn bar"** / *"My bar"*), and it instantly shows which cocktails you can make
**right now** — plus the ones you're only one or two ingredients away from.

- **First-run wizard** walks you through your bar in sections, starting with the staples you
  probably already own (ice, sugar, citrus, soda…) pre-checked, then spirits, liqueurs, mixers, and so on.
- **Ontdek** / *Discover* (home) is the discovery surface: *"Je kunt 19 cocktails maken"*, a
  **Nu te maken** grid, and **Bijna — je mist er één** with the exact missing ingredient per drink.
- **Mijn bar** is where you tick what you own; the wizard fills it for you on first run.
- Your bar is persisted locally, so the app remembers what you have.
- **Bilingual UI (🇳🇱 / 🇬🇧).** Every screen ships in Dutch and English with an in-app language
  toggle. English is the canonical data language; Dutch names are a display overlay. Your choice is
  remembered locally.

## Background

This project began as a reconstruction of a lost app (only the compiled Netlify frontend survived).
It has since been **rebuilt around the availability-search flow** as the product's core, with a clean,
redesigned data model and an editorial visual identity. The UI is fully bilingual (Dutch + English),
switchable at runtime.

## How it ships

Barkast is **static-first and local-first**:

- **Production is a fully static SPA** (Netlify). It ships a pre-built catalog bundle
  (`catalog.json` + Dutch overlay `catalog.nl.json`) and computes "wat kan ik maken" **client-side**
  via `@cocktailapp/shared`. There is **no live backend or database in production**.
- The **frontend is local-first**: the primary persistence is `localStorage`. Accounts + cloud sync
  are an optional, deliberately decoupled feature (off in the static build).
- The **NestJS backend** is used in **dev for catalog authoring**, and can be **self-hosted** (see
  [`deploy/`](deploy/README.md)). It additionally implements optional **accounts**, per-user **cabinet/
  favorites sync**, and **anonymous aggregate analytics** — capabilities the shipped static site does
  not use (yet).

## Tech stack

- **Monorepo:** npm workspaces (`shared`, `backend`, `frontend`)
- **`shared/`** — `@cocktailapp/shared`: TypeScript domain types + enums + localized labels (nl/en)
  + the single UI string table (`i18n.ts`) + the pure `computeMakeable`/`expandCabinet`/`buildCatalog`
  logic. The single source of truth shared by the **frontend and backend**.
- **`backend/`** — NestJS 11 + Mongoose 9 on **MongoDB** (Atlas in dev, or self-hosted `mongo:7` via
  the `deploy/` Docker Compose stack). Helmet, IP-based rate limiting, JWT auth + refresh-token
  rotation, a LAN-only admin dashboard, and a global exception filter.
- **`frontend/`** — Angular 21 (standalone, **zoneless**, signals-driven) + Angular
  Material, themed with a custom editorial design system (Fraunces + Inter), light **and** dark mode.
  Ships as an **installable PWA** (web app manifest + hand-written service worker): mobile visitors get
  an "install to home screen" prompt (native on Android/Chromium, guided Add-to-Home-Screen steps on
  iOS Safari), and the app shell works offline. Tuned for touch — safe-area insets, 16px inputs (no iOS
  zoom), and larger tap targets.

## Data model

The catalog uses a **two-level ingredient model** so that "makeable" matching works reliably: a small
set of canonical **base** ingredients (what your cabinet holds and what matching runs against), and a
per-recipe **`call`** that preserves the recipe's own wording.

```ts
// A stockable base ingredient (your cabinet is a set of these ids)
Ingredient {
  id, name,
  category?, isStaple?,
  parentId?,            // a specific base (old-tom-gin) points at a broader one (gin)
  substitutes?: string[],   // explicit swap ids
  aliases?: string[],
  createdAt?, updatedAt?
}

// An embedded recipe line — references a base by ingredientId
CocktailIngredient {
  ingredientId,         // matched against the cabinet
  name,                 // denormalized base name (shown in "missing")
  call?,                // verbatim recipe wording, e.g. "fresh lime juice"
  amount?, amountMax?,  // amountMax = upper bound of a range
  unit,
  note?, optional?,
  role?,                // 'ingredient' | 'garnish' | 'seasoning'
  alternativeIds?: string[]  // "X or Y" — any one satisfies the line
}

Cocktail {
  id, name, description,
  instructions: string[],
  ingredients: CocktailIngredient[],
  category?, baseSpirit?, glass?, method?, difficulty?,
  garnish?, notes?, servings?,   // servings defaults to 1
  tags?: string[],               // typed CocktailTag vocabulary exists; not yet narrowed
  image?, imageUrl?,             // image = { assetId, blurhash? } (bundled, offline-safe)
  createdAt?, updatedAt?
}
```

Vocabularies are **string-literal unions** (not TS enums), each with a companion runtime array and a
Dutch label map:

- `unit` ∈ `part | ml | cl | piece | cube | drop | dash | splash | pinch | teaspoon | tablespoon | barspoon | slice | wedge | sprig | topup`
- `category` ∈ `spirit | liqueur | wine | mixer | juice | syrup | bitters | dairy | seasoning | garnish | other`
- `glass` ∈ `coupe | martini | rocks | highball | collins | nick_and_nora | flute | wine | hurricane | mug | shot`
- `method` ∈ `build | shaken | stirred | blended | muddled | layered`
- `difficulty` ∈ `easy | medium | advanced`
- `baseSpirit` ∈ `gin | vodka | rum | tequila | whisky | brandy | other | none`

**Makeable semantics** (`computeMakeable`): a line counts as *missing* only when it is **not
`optional`** **and** its `role` is not `garnish`/`seasoning` **and** neither its `ingredientId` nor any
of its `alternativeIds` is in the cabinet. "Makeable now" = 0 missing; "bijna" = 1 missing. Cocktails
with no ingredient lines are excluded. `isStaple` marks pantry basics that are pre-checked in the
wizard.

**Substitutes** are a deliberately separate, opt-in pass (`expandCabinet`, behind the "Vervangers
meetellen" toggle): stocking a child base satisfies its parent's generic call and vice-versa, and
explicit `substitutes` are folded in — `computeMakeable` itself never applies substitutes or staples.

`buildCatalog` is the pure, dependency-free function that shapes raw seed data into the catalog and
stamps a content-hash `version`. The **same** function feeds `scripts/build-catalog.mjs` (the committed
offline bundle) and the backend `GET /api/catalog`, so ids and versions match across the static bundle
and the API.

## REST API (served under `/api`)

The backend mounts everything under a global `/api` prefix. Auth column: **public** (no guard), **JWT**
(`Authorization: Bearer <accessToken>`), or **admin** (`AdminGuard` = HTTP Basic auth **and** LAN-only
— any request carrying a Cloudflare `CF-Connecting-IP` header is rejected).

### Catalog (public)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/ingredients?category=` | List ingredients |
| POST | `/api/ingredients` | Create an ingredient |
| PATCH | `/api/ingredients/:id` | Update (renames propagate into cocktail lines) |
| DELETE | `/api/ingredients/:id` | Delete (blocked with 409 if used by a cocktail) |
| GET | `/api/cocktails?q=&tag=` | List / name-search (regex-escaped) / tag-filter cocktails |
| GET | `/api/cocktails/random` | A random cocktail |
| POST | `/api/cocktails` | Create a cocktail |
| GET | `/api/cocktails/:id` | Get one cocktail |
| PATCH | `/api/cocktails/:id` | Update a cocktail |
| DELETE | `/api/cocktails/:id` | Delete a cocktail |
| POST | `/api/cocktails/makeable` | `{ availableIngredientIds, maxMissing? (0–3) }` → makeable + "almost" results (HTTP 200) |
| GET | `/api/catalog` | Full catalog with a content-hash version (strong ETag; 304 on `If-None-Match`) |

> **Note:** the catalog **write** endpoints (POST/PATCH/DELETE on ingredients & cocktails) and
> `GET /api/catalog` are **public** — anyone who can reach the API can mutate the catalog. This is
> acceptable because production is static (the backend isn't publicly reachable); a self-hosted backend
> should sit behind the Cloudflare tunnel and trusted network only.

### Accounts, sync & telemetry

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | public | Create account (email + password; bcrypt cost 12); throttled 10/min |
| POST | `/api/auth/login` | public | Log in (login-throttled 10 attempts / 15 min per email\|IP) |
| POST | `/api/auth/refresh` | public | Rotate the refresh token (single-use jti) |
| POST | `/api/auth/logout` | public | Revoke the refresh token |
| GET | `/api/auth/me` | JWT | Current account |
| GET | `/api/me/data` | JWT | Get synced cabinet + favorites |
| PUT | `/api/me/data` | JWT | Replace synced cabinet + favorites |
| DELETE | `/api/me` | JWT | GDPR account wipe (data + all tokens + user) |
| POST | `/api/events` | public | Anonymous aggregate analytics (batched; HTTP 202); throttled 60/min |
| GET | `/api/admin/metrics` | admin | Aggregate product + operational metrics (JSON) |
| GET | `/api/admin/dashboard` | admin | The same metrics as an HTML dashboard |

Access tokens are signed with `JWT_SECRET` (default 15m); refresh tokens with `JWT_REFRESH_SECRET`
(default 30d) and are persisted as only a random `jti` + `userId` + `expiresAt` (TTL-reaped, rotated on
every refresh).

## Prerequisites

- Node.js `>= 24` (Angular 21 CLI + the backend Docker image both target Node 24)
- For the backend: a **MongoDB** connection string — either **MongoDB Atlas** (allowlist your IP under
  Atlas → Network Access) or the self-hosted `mongo:7` from the `deploy/` stack

> The **frontend alone needs no backend or database** — in a production build it reads the bundled
> catalog. You only need Mongo to run the backend (dev authoring or self-hosting).

## Setup

```bash
npm install                            # links workspaces + builds shared
cp backend/.env.example backend/.env   # then paste your MONGODB_URI + JWT secrets
npm run build:shared                   # (re)build the shared types package
npm run db:seed                        # seed 104 ingredients + 102 cocktails (IBA 2024 list)
```

## Running

```bash
npm run dev                       # builds shared, then runs backend + frontend together
# …or individually
npm run start:backend             # NestJS on http://localhost:3000/api
npm run start:frontend            # Angular on http://localhost:4200
```

In dev the frontend (`dataSource: 'api'`) talks to the backend for authoring; a production build
(`dataSource: 'static'`) reads the bundled catalog instead.

## Build & catalog pipeline

The static site serves a **pre-built catalog bundle**. `iba-cocktails-seed.json` (repo root) is the
**frozen, hand-curated source of truth** — you edit it directly; nothing regenerates it. (The archived
one-shots `scripts/build-iba-seed.mjs` and `scripts/fold-seed.mjs` bootstrapped it once and must not be
re-run.)

```bash
npm run build:shared        # compile @cocktailapp/shared (prerequisite for the rest)
npm run validate:seed       # fail-fast structural checks on iba-cocktails-seed.json
npm run build:catalog       # validate:seed, then emit frontend/public/catalog.json (+ catalog.nl.json)
npm run build:translations  # regenerate scripts/translations-nl.json (needs a built catalog.json first)
npm run build               # full monorepo build: shared → backend → frontend
```

To refresh the Dutch overlay after editing NL sources, the order is
`build:shared → build:catalog → build:translations → build:catalog`. Netlify runs
`build:shared && build:catalog && build --workspace frontend` (it does **not** run `build:translations`
— it ships the committed `translations-nl.json`).

## Database helpers

These require a `MONGODB_URI` (env var, or read from `backend/.env`).

```bash
npm run db:ping     # connect + list collections
npm run db:count    # count cocktails + ingredients
npm run db:seed     # (re)seed ONLY the catalog collections (ingredients + cocktails); never touches users/analytics
npm run db:shell    # interactive mongosh shell
```

## Configuration

- **Backend** (`backend/.env`, see `backend/.env.example`):
  - `MONGODB_URI` (required), `PORT` (default 3000), `NODE_ENV`, `TRUST_PROXY` (default 1 — resolves the
    real client IP behind the Cloudflare tunnel)
  - `CORS_ORIGIN` (comma-separated allowlist; **required in production** — the API refuses to boot if
    `NODE_ENV=production` and it is unset; reflects any origin in dev when unset)
  - `JWT_SECRET` + `JWT_REFRESH_SECRET` (both required; the API **refuses to boot if they are equal**),
    `JWT_ACCESS_EXPIRES` (default `15m`), `JWT_REFRESH_EXPIRES` (default `30d`)
  - `ADMIN_USER` + `ADMIN_PASSWORD` (both required for the admin dashboard; fail-closed)
- **Frontend**: environments are swapped at build time. Dev `environment.ts`
  (`apiUrl: http://localhost:3000/api/`, `dataSource: 'api'`, `admin: true`); prod `environment.prod.ts`
  (`dataSource: 'static'`, `admin: false` — the catalog is read from the bundle). `public/_redirects`
  provides the SPA fallback (`/* /index.html 200`) for static hosts.

## Project structure

```
barkast/
├─ shared/                  @cocktailapp/shared — domain types, enums, localized labels + UI strings (nl/en), makeable/catalog logic
├─ backend/                 NestJS + Mongoose API (catalog CRUD, makeable, catalog, auth, /me sync, analytics, admin)
├─ frontend/                Angular PWA — Ontdek (home), Mijn bar, wizard, cocktails, ingredienten
├─ scripts/                 build-catalog · validate-seed · build-translations-nl · db-ping/count/seed/shell
│                           (+ archived one-shots build-iba-seed · fold-seed; seed-data.mjs = Dutch-text source)
├─ deploy/                  Docker Compose self-hosting stack (api + mongo + cloudflared), backup/restore/deploy
├─ docs/                    data-model.md · privacy-policy.md
└─ iba-cocktails-seed.json  the frozen, hand-curated catalog source of truth
```

## Deployment

- **Frontend (production):** static SPA on **Netlify** — see `netlify.toml` (publish
  `dist/frontend/browser`). No live DB; the catalog is generated at build time.
- **Backend (optional):** self-hosted from home via Docker Compose (API + locked-down MongoDB +
  Cloudflare Tunnel, no inbound ports) — see [`deploy/README.md`](deploy/README.md).

> **Security note:** never commit a real `backend/.env` or `deploy/.env` (both are gitignored). If a
> live connection string or JWT secret was ever shared for review, rotate it.
