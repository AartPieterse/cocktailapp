# Barkast frontend

The **Barkast** web frontend: the Dutch cocktail app's single, consolidated client — an **installable,
offline-capable PWA** whose hero feature is *"wat kan ik maken"* (your cabinet → the cocktails you can
make right now). This Angular app is the one client (an earlier Expo/React-Native experiment was
removed); the UI and route paths are in Dutch (`bar`, `kast`, `cocktails`, `ingredienten`).

## Tech stack

- **Angular 21.2.x**, fully **standalone** (no NgModules — `bootstrapApplication`), **signals-driven**
  throughout (`signal` / `computed` / `effect`). Runs **zoneless** — `zone.js` is not a dependency and
  there's no polyfills entry; change detection is signal-driven.
- **Angular Material + CDK 21.2** for UI; a custom editorial theme (Fraunces + Inter) with light/dark
  mode.
- **TypeScript 5.9**, **RxJS 7.8**.
- Depends on the monorepo package **`@cocktailapp/shared`** for the domain types and the pure
  `computeMakeable` / `expandCabinet` logic.
- Tests run on **Vitest** (`@angular/build:unit-test`, jsdom). No e2e framework is configured.

## Features

Everything is a lazy-loaded standalone route inside a `Layout` shell (`''` and the wildcard both
redirect to `/bar`):

- **Mijn bar** (`/bar`) — the flagship surface. An onboarding CTA when the cabinet is empty, otherwise
  *"Je kunt N cocktails maken"*, a **Nu te maken** grid (0 missing), and a **Bijna — je mist er één**
  sidebar (1 missing) with add-the-missing-ingredient chips. Includes a **"Vervangers meetellen"**
  toggle (substitutes).
- **Wizard** (`/bar/wizard`) — a stepped chip picker: step 0 pre-checks pantry staples on first run,
  then one step per ingredient category. Finish writes the cabinet and returns to `/bar`.
- **Mijn kast** (`/kast`) — toggle ingredient chips grouped by category, with a live makeable count.
- **Cocktails** (`/cocktails`) — text search, tag filter, an only-favorites filter, per-card
  availability, and a detail view showing makeable/missing lines relative to your cabinet, a favorite
  toggle, and add-missing-to-cabinet.
- **Ingredienten** (`/ingredienten`) — the ingredient list.

Catalog authoring routes (`add`, `:id/edit`) exist **only in dev** — they are gated by
`environment.admin` and are not registered in production.

## Local-first & data source

- **Persistence is `localStorage` only** (all writes wrapped in try/catch). Keys: `barkast.cabinet`,
  `barkast.wizardDone`, `barkast.favorites`, `barkast.theme`, `barkast.substitutes` (default on), and
  `barkast.install.dismissed`.
- The frontend has **no account, login, registration, sync, or analytics** code — it is purely
  local-first and sends nothing to a server about you. ("Vervangers meetellen" is a search-behavior
  preference, not tracking.)
- **Dev vs production data source:**
  - **dev** (`dataSource: 'api'`) — talks to the NestJS catalog API at `http://localhost:3000/api/`
    for authoring.
  - **production** (`dataSource: 'static'`) — ships and reads the bundled `catalog.json` + Dutch
    overlay `catalog.nl.json` and computes makeable **client-side** via `@cocktailapp/shared`. There is
    **no live backend** in production; the static services throw *"De catalogus is alleen-lezen in deze
    omgeving."* if a write is attempted.

## PWA

- **Web app manifest** (`public/manifest.webmanifest`): name *"Barkast — wat kan jij maken?"*
  (short_name *Barkast*), `standalone`/portrait, theme/background `#17120c`, 192/512/maskable icons,
  and 3 app shortcuts (Mijn bar, Mijn kast, Alle cocktails).
- **Service worker** (`public/sw.js`, `CACHE_VERSION = 'barkast-v1'`): network-first for navigations
  (falls back to a cached `/index.html` — the offline app shell), stale-while-revalidate for
  same-origin assets and fonts, and an explicit **passthrough for `/api/`** so data is never served
  stale. It is a **hand-written** worker (not `@angular/service-worker`/ngsw — there's no
  `ngsw-config.json`), registered manually in `main.ts` **only in production**. Bump `CACHE_VERSION` to
  invalidate caches.
- **Installability:** on Android/Chromium a captured `beforeinstallprompt` is replayed by
  `PwaService.install()`; on iOS Safari a guided *"Zet op beginscherm"* sheet is shown. The prompt
  appears only on mobile, when not installed and not snoozed; dismissing snoozes it for 14 days.
- **Mobile tuning:** `viewport-fit=cover`, `env(safe-area-inset-*)` padding, 16px inputs under 560px
  (no iOS zoom), `touch-action: manipulation`, and ≥48px tap targets on the install sheet.

## Cross-cutting

- **Theme:** `ThemeService` persists light/dark, stamps `<html data-theme>`, and syncs the
  `theme-color` meta (`#f4ebd8` light / `#17120c` dark) so browser/PWA chrome matches; initial theme
  falls back to `prefers-color-scheme`.
- **HTTP errors:** a single functional interceptor (`apiErrorInterceptor`) surfaces every failed
  request as a Dutch `MatSnackBar` message (incl. status 0 → *"Geen verbinding met de server"*).
- **Router:** configured with `withComponentInputBinding()` and scroll-position restoration to top.

## Development

`@cocktailapp/shared` must be built first. From the **repo root**:

```bash
npm run build:shared      # compile the shared package
npm run start:frontend    # ng serve on http://localhost:4200
npm run start:backend     # (optional, for dev authoring) NestJS on http://localhost:3000/api
npm run dev               # build shared, then run backend + frontend together
```

Within this workspace (`frontend/`):

```bash
npm start                 # ng serve (development configuration)
npm run watch             # ng build --watch --configuration development
npm run build             # ng build (production; builder @angular/build:application)
npm test                  # ng test → Vitest (jsdom)
```

The API base URL and data source come from the environment files, swapped at build time
(`angular.json` `fileReplacements`): dev `environment.ts` (`apiUrl: 'http://localhost:3000/api/'`,
`dataSource: 'api'`, `admin: true`) → prod `environment.prod.ts` (`dataSource: 'static'`,
`admin: false`; `apiUrl` is effectively unused in the static build). `apiUrl` must end with a trailing
slash — services build `` `${apiUrl}cocktails` ``.

## Production build & deploy

Production is a **static Angular SPA deployed to Netlify** (publish dir `dist/frontend/browser`,
`NODE_VERSION=24`). SPA routing is handled by `public/_redirects` (`/* /index.html 200`). The catalog
bundle (`public/catalog.json` + `catalog.nl.json`) is generated **at build time** by the root
`npm run build:catalog` step — not fetched from a live DB. See the root [`README.md`](../README.md) and
`netlify.toml`.
