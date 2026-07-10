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

## Tech stack

- **Monorepo:** npm workspaces
- **`shared/`** — `@cocktailapp/shared`: TypeScript domain types + enums + localized labels (nl/en)
  + the single UI string table (`i18n.ts`) — the frontend's single source of truth for copy
- **`backend/`** — NestJS 11 + Mongoose 9, MongoDB Atlas. Helmet, rate limiting, a global exception
  filter, and referential integrity between cocktails and the ingredient catalog
- **`frontend/`** — Angular 21 (standalone, zoneless, signals) + Angular Material, themed with a custom
  editorial design system (Fraunces + Inter), light **and** dark mode. Ships as an **installable PWA**
  (web app manifest + service worker): mobile visitors get an "install to home screen" prompt
  (native on Android/Chromium, guided Add-to-Home-Screen steps on iOS Safari), and the app shell
  works offline. Tuned for touch — safe-area insets, 16px inputs (no iOS zoom), and larger tap targets

## Data model

```
Ingredient { id, name (unique, case-insensitive), category?, isStaple, createdAt, updatedAt }

Cocktail {
  id, name, description,
  instructions: string[],
  ingredients: [{ ingredientId -> Ingredient, name, amount, unit, note?, optional? }],
  glass?, method?, difficulty?, garnish?, servings,
  tags?, imageUrl?, createdAt, updatedAt
}
```

- `unit` ∈ `part | ml | cl | piece | cube | drop | dash | teaspoon | tablespoon | slice | wedge | sprig | topup`
- `category` ∈ `spirit | liqueur | mixer | juice | syrup | bitters | garnish | other`
- `glass` ∈ `coupe | martini | rocks | highball | collins | nick_and_nora | flute | wine | hurricane | mug | shot`
- `method` ∈ `build | shaken | stirred | blended | muddled | layered`
- `isStaple` marks pantry basics that are pre-checked in the wizard
- `optional` ingredient lines don't count against "makeable"

## REST API (served under `/api`)

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
| POST | `/api/cocktails/makeable` | `{ availableIngredientIds, maxMissing? }` → makeable + "almost" results |

## Prerequisites

- Node.js `>= 24.0.0` (Angular 21 CLI requirement)
- A **MongoDB Atlas** connection string (allowlist your IP under Atlas → Network Access)

## Setup

```bash
npm install                       # links workspaces + builds shared
cp backend/.env.example backend/.env   # then paste your Atlas MONGODB_URI
npm run build:shared              # (re)build the shared types package
npm run db:seed                   # seed 44 ingredients + 31 classic cocktails
```

## Running

```bash
npm run dev                       # builds shared, then runs backend + frontend together
# …or individually
npm run start:backend             # NestJS on http://localhost:3000/api
npm run start:frontend            # Angular on http://localhost:4200
```

## Database helpers

```bash
npm run db:ping     # connect + list collections
npm run db:count    # count cocktails + ingredients
npm run db:seed     # (re)seed the curated catalog (clears + inserts)
npm run db:shell    # interactive mongosh shell
```

## Configuration

- **Backend** (`backend/.env`): `MONGODB_URI` (required), `PORT` (default 3000),
  `CORS_ORIGIN` (comma-separated allowed origins; reflects any origin in dev when unset).
- **Frontend**: dev uses `src/environments/environment.ts` (`http://localhost:3000/api/`);
  production swaps in `environment.prod.ts` (relative `/api/`, override at build time as needed).
  `public/_redirects` provides the SPA fallback for static hosts (e.g. Netlify).

## Project structure

```
barkast/
├─ shared/     @cocktailapp/shared — domain types, enums, localized labels + UI strings (nl/en)
├─ backend/    NestJS + Mongoose REST API (ingredients, cocktails, makeable search)
├─ frontend/   Angular app — Ontdek (home), Mijn bar (your stock), wizard, cocktails, ingredients
└─ scripts/    db-ping / db-count / db-seed / db-shell + seed-data.mjs
```

> **Security note:** never commit a real `backend/.env` (it's gitignored). If a live Atlas
> connection string was ever shared for review, rotate those credentials.
