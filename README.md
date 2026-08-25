# Barkast 🍸

**Wat staat er in jouw bar — en wat kun je daarmee maken?**

Barkast is a full-stack cocktail app built around one flagship idea: you tick off the ingredients
you have on hand (**"Mijn bar"** / *"My bar"*), and it instantly shows which cocktails you can make
**right now** — plus the ones you're only one or two ingredients away from.

- **First-run wizard** walks you through your bar in sections, starting with the staples you
  probably already own (ice, sugar, citrus, soda…) pre-checked, then spirits, liqueurs, mixers, and so on.
- **Ontdek** / *Discover* (`/ontdek`, home) is the discovery surface: *"Je kunt 19 cocktails maken"*, a
  **Nu te maken** grid, and **Bijna — je mist er één** with the exact missing ingredient per drink.
- **Mijn bar** (`/bar`) is where you tick what you own; the wizard fills it for you on first run.
- Your bar is persisted locally, so the app remembers what you have.
- **Bilingual UI (🇳🇱 / 🇬🇧).** Every screen ships in Dutch and English with an in-app language
  toggle. English is the canonical data language; Dutch names are a display overlay. Your choice is
  remembered locally.

## How it ships

Barkast is **static-first and local-first**:

- **Production is a fully static SPA** (Netlify). It ships a pre-built catalog bundle
  (`catalog.json` + Dutch overlay `catalog.nl.json`) and computes "wat kan ik maken" **client-side**
  via `@cocktailapp/shared`. There is **no live backend or database in production**.
- The **frontend is local-first**: the primary persistence is `localStorage`. Accounts + cloud sync
  are an optional, deliberately decoupled feature (off in the static build via `authEnabled: false`).
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
  iOS Safari), and the app shell works offline.

## Data model

The catalog uses a **two-level ingredient model**: stockable **base** ingredients (cabinet + matching)
and a per-recipe **`call`** (verbatim wording). Makeable matching, substitutes (`expandCabinet`), and
vocabularies are documented in [`docs/data-model.md`](docs/data-model.md).

`buildCatalog` shapes raw seed data into the resolved catalog; Node callers stamp a content-hash
`version`. The same function feeds `scripts/build-catalog.mjs` and `GET /api/catalog`.

## REST API

All routes mount under `/api`. Full route list, auth model, and env vars:
[`backend/README.md`](backend/README.md).

Catalog CRUD and `GET /api/catalog` are **public** (acceptable because production is static; a
self-hosted backend must sit behind the Cloudflare tunnel). JWT protects `/api/auth/me` and `/api/me/*`;
admin routes require Basic auth **and** LAN-only (`AdminGuard` rejects `CF-Connecting-IP`).

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
npm run db:seed                        # seed ingredients + cocktails (IBA 2024 list)
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
  (`dataSource: 'static'`, `admin: false`, `authEnabled: false`). `public/_redirects`
  provides the SPA fallback (`/* /index.html 200`) for static hosts.

## Project structure

```
barkast/
├─ shared/                  @cocktailapp/shared — domain types, labels + UI strings (nl/en), makeable/catalog logic
├─ backend/                 NestJS + Mongoose API (catalog CRUD, auth, /me sync, analytics, admin)
├─ frontend/                Angular PWA — Ontdek, Mijn bar, wizard, cocktails, ingredienten
├─ scripts/                 build-catalog · validate-seed · build-translations-nl · db-ping/count/seed/shell
├─ deploy/                  Docker Compose self-hosting (api + mongo + cloudflared), backup/restore/deploy
├─ docs/                    data-model.md · privacy-policy.md
└─ iba-cocktails-seed.json  frozen, hand-curated catalog source of truth
```

## Deployment

- **Frontend (production):** static SPA on **Netlify** — see `netlify.toml` (publish
  `dist/frontend/browser`). No live DB; the catalog is generated at build time.
- **Backend (optional):** self-hosted from home via Docker Compose (API + locked-down MongoDB +
  Cloudflare Tunnel, no inbound ports) — see [`deploy/README.md`](deploy/README.md).

> **Security note:** never commit a real `backend/.env` or `deploy/.env` (both are gitignored). If a
> live connection string or JWT secret was ever shared for review, rotate it.
