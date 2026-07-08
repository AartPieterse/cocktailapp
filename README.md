# CocktailApp

A reconstructed and modernized full-stack cocktail app: browse cocktails, add/edit/delete them,
manage an ingredient catalog, and filter by **"what can I make with what I have"**.

## Background

This project is a reconstruction of a lost app. The only surviving artifact was the **compiled
production build** of an Angular frontend (deployed on Netlify) that talked to a
**Node + MongoDB REST API on Railway** (`naive-skate-production.up.railway.app/cocktails/`). That
backend is gone and its MongoDB database is lost. The frontend behaviour and data model were fully
reverse-engineered from the JavaScript bundles; because the database was lost, the schema was
**redesigned cleanly** rather than reproduced verbatim.

### What changed vs. the original

| Original | Now |
| --- | --- |
| `instructions` stored as one string split on `"-"` | `instructions: string[]` |
| `measure` stored as a free-form label string | `unit` enum key, label rendered in the UI |
| `nameId` (a mis-named embedded object) | `ingredientId` (reference) + denormalized `name` |
| Search done client-side (download all, filter in browser) | Server-side query |
| Add only | Full CRUD (create / read / update / delete) |
| — | Timestamps, tags, image URL, ingredient categories |

## Tech stack

- **Monorepo:** npm workspaces
- **`shared/`** — `@cocktailapp/shared`: TypeScript domain types + enums, the single source of truth
  shared by both apps
- **`backend/`** — NestJS 11 + Mongoose 9, MongoDB Atlas
- **`frontend/`** — Angular 21 (standalone, zoneless, signals) + Angular Material

## Data model

```
Ingredient { id, name (unique), category?, createdAt, updatedAt }

Cocktail {
  id, name, description,
  instructions: string[],
  ingredients: [{ ingredientId -> Ingredient, name, amount, unit }],
  tags?: string[],
  imageUrl?: string,
  createdAt, updatedAt
}
```

`unit` is one of `part | ml | piece | cube | drop | tablespoon | slice | wedge`.
`category` is one of `spirit | liqueur | mixer | juice | syrup | bitters | garnish | other`.

## REST API (served under `/api`)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/ingredients?category=` | List ingredients |
| POST | `/api/ingredients` | Create an ingredient |
| PATCH | `/api/ingredients/:id` | Update an ingredient |
| DELETE | `/api/ingredients/:id` | Delete an ingredient |
| GET | `/api/cocktails?q=&tag=` | List / text-search cocktails |
| POST | `/api/cocktails` | Create a cocktail |
| GET | `/api/cocktails/:id` | Get one cocktail |
| PATCH | `/api/cocktails/:id` | Update a cocktail |
| DELETE | `/api/cocktails/:id` | Delete a cocktail |
| POST | `/api/cocktails/search` | `{ availableIngredientIds }` → makeable cocktails |

## Prerequisites

- Node.js `>= 24.0.0` (Angular 21 CLI requirement; this repo was built on Node 24.13.1)
- A **MongoDB Atlas** connection string (the DB starts empty — no seed data). Make sure your current
  IP is allowlisted under Atlas → Network Access.

## Setup

```bash
# 1. Install everything (workspaces are linked automatically)
npm install

# 2. Configure the backend database connection
cp backend/.env.example backend/.env
#   then edit backend/.env and paste your Atlas MONGODB_URI

# 3. Build the shared types package (backend + frontend depend on it)
npm run build:shared
```

## Running

```bash
# Both apps together (builds shared first, then runs backend + frontend)
npm run dev

# …or individually
npm run start:backend    # NestJS on http://localhost:3000/api
npm run start:frontend   # Angular on http://localhost:4200
```

> If you change the shared types, rerun `npm run build:shared` (or `npm run watch --workspace @cocktailapp/shared`).

## Database access (MCP + CLI)

Both use only `npx` — no global installs — and read `MONGODB_URI` from `backend/.env`.

**CLI**

```bash
npm run db:ping     # connect + list collections
npm run db:count    # count cocktails + ingredients
npm run db:shell    # interactive mongosh shell
```

**MCP (for Claude Code)** — gives the agent direct DB tools (find, aggregate, insert/update/delete):

```bash
# Option A: project-level config
cp .mcp.json.example .mcp.json      # then paste your Atlas URI into .mcp.json
# reload Claude Code so it picks up the new server

# Option B: one-liner
claude mcp add mongodb -- npx -y mongodb-mcp-server@latest --connectionString "<ATLAS_URI>"
```

`.mcp.json` and `backend/.env` are gitignored — never commit the connection string.

## Project structure

```
cocktailapp/
├─ shared/     @cocktailapp/shared — domain types + enums
├─ backend/    NestJS + Mongoose REST API (src/ingredients, src/cocktails)
├─ frontend/   Angular standalone app (dashboard, cocktails, ingredients)
└─ scripts/    db-ping / db-count / db-shell helpers
```

## Notes

- The database starts **empty**; add ingredients and cocktails through the UI (or the API / MCP).
- For a production frontend build, set `frontend/src/environments/environment.ts` `apiUrl` to your
  deployed API origin.
