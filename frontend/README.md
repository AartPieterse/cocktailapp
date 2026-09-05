# Barkast frontend

The **Barkast** web frontend: the Dutch cocktail app's single, consolidated client — an **installable,
offline-capable PWA** whose hero feature is *"wat kan ik maken"* (your cabinet → the cocktails you can
make right now). This Angular app is the one client (an earlier Expo/React-Native experiment was
removed). Route paths are Dutch (`ontdek`, `bar`, `cocktails`, `ingredienten`, `account`; `kast` is a
back-compat redirect), but the UI itself is **bilingual NL/EN** — `LanguageService` swaps the shared
string table (`@cocktailapp/shared` `uiStrings`) and the Dutch catalog overlay at runtime.

## Tech stack

- **Angular 21.2.x**, fully **standalone** (no NgModules — `bootstrapApplication`), **signals-driven**
  throughout (`signal` / `computed` / `effect`). Runs **zoneless** — `zone.js` is not a dependency and
  there's no polyfills entry; change detection is signal-driven.
- **Angular Material + CDK 21.2** for UI; a custom editorial theme (Fraunces + Inter) with light/dark
  mode.
- **TypeScript 5.9**, **RxJS 7.8**.
- Depends on the monorepo package **`@cocktailapp/shared`** for the domain types and the pure
  `computeMakeable` / `expandCabinet` logic.
- Tests run on **Vitest** (`@angular/build:unit-test`, jsdom), but this workspace holds exactly one
  spec — `src/app/app.spec.ts`, a bootstrap smoke test. The real unit suite lives in `shared/`
  (`catalog.spec.ts`, `expand-cabinet.spec.ts`, `makeable.spec.ts`, `measure-convert.spec.ts`). CI runs
  the shared and backend suites; **the frontend suite is never run in CI.** No e2e framework is
  configured.

## Features

Everything is a lazy-loaded standalone route inside a `Layout` shell (`''` and the wildcard both
redirect to `/ontdek`; the legacy `/kast` is a back-compat redirect to `/bar`):

- **Ontdek** (`/ontdek`) — the flagship surface (`bar/bar.ts`). An onboarding CTA when the cabinet is
  empty, otherwise *"Je kunt N cocktails maken"*, a **Nu te maken** grid (0 missing), and a
  **Bijna — je mist er één** sidebar (1 missing) with add-the-missing-ingredient chips. Includes a
  **"Vervangers meetellen"** toggle (substitutes).
- **Wizard** (`/bar/wizard/:step`) — a stepped chip picker (`bar/wizard/`, logic in
  `wizard-steps.ts`): spirits first, then the pre-checked pantry staples, then a step per category
  filtered to what the chosen spirits can actually reach. Chips are ordered by how many recipes call
  for them and capped until "toon alles"; the search box spans every category and matches aliases;
  the footer carries a live makeable count. The step is a route param (so Back walks the wizard) and
  the selection is drafted to `barkast.wizardDraft` on every tick, so a reload costs nothing. Finish
  writes the cabinet and returns to `/ontdek`; Skip records the choice rather than looping back to
  onboarding.
- **Mijn bar** (`/bar`) — the stock editor (`bar/cabinet/cabinet.ts`): toggle ingredient chips grouped
  by category, with a live makeable count. `/kast` redirects here.
- **Account** (`/account`) — optional sign-in + cross-device sync. The route is always registered, but
  the navbar entry is gated on `environment.authEnabled`, which is `false` in the production build.
- **Cocktails** (`/cocktails`) — text search, tag filter, an only-favorites filter, per-card
  availability, and a detail view showing makeable/missing lines relative to your cabinet, a favorite
  toggle, and add-missing-to-cabinet.
- **Ingredienten** (`/ingredienten`) — the ingredient list.

Catalog authoring routes (`add`, `:id/edit`) exist **only in dev** — they are gated by
`environment.admin` and are not registered in production.

## Local-first & data source

- **Persistence is `localStorage` only** (all writes wrapped in try/catch). Keys: `barkast.cabinet`,
  `barkast.wizardDone`, `barkast.wizardDraft` (an interrupted wizard run, cleared on finish/skip),
  `barkast.staplesApplied` (the staple set last carried into an existing cabinet),
  `barkast.favorites`, `barkast.theme`, `barkast.substitutes` (default on),
  `barkast.locale`, `barkast.units`, `barkast.install.dismissed` and `barkast.analyticsOptOut` (the
  opt-out flag is persisted even in the static build, where analytics itself is inert) — plus
  `barkast.auth` (tokens) and `barkast.sync`, which are only written once the accounts feature is
  enabled (it is not in production).
- Accounts, login/registration, cross-device sync and anonymous analytics **do exist in the code**
  (`account/account.ts`, `core/auth/`, `core/sync/sync.service.ts`, `core/analytics.service.ts`) but
  are **switched off in the production build**: `environment.prod.ts` sets `authEnabled: false` (so
  `AuthService`, `SyncService` and `authInterceptor` are inert and the account entry is hidden) and
  `analyticsUrl: ''` (so `AnalyticsService` never buffers or sends). The shipped app is therefore
  purely local-first and sends nothing to a server about you; where analytics *is* configured it also
  honours a persisted user opt-out. ("Vervangers meetellen" is a search-behavior preference, not
  tracking.)
- **Dev vs production data source:**
  - **dev** (`dataSource: 'api'`) — talks to the NestJS catalog API at `http://localhost:3000/api/`
    for authoring.
  - **production** (`dataSource: 'static'`) — ships and reads the bundled `catalog.json` + Dutch
    overlay `catalog.nl.json` and computes makeable **client-side** via `@cocktailapp/shared`. There is
    **no live backend** in production; the static services throw the localized `errors.readOnly`
    message (*"De catalogus is alleen-lezen in deze omgeving."* / *"The catalog is read-only in this
    environment."*) if a write is attempted.
- **The Dutch overlay is incomplete.** `public/catalog.nl.json` covers noticeably fewer ingredients and
  cocktails than `public/catalog.json` — compare the two files themselves (both are keyed objects, not
  arrays) rather than trusting a count written down here. The fallback is **per entry**, not
  all-or-nothing: `applyCatalogTranslations` discards the overlay wholesale only when the two `version`
  strings differ, so every entry without a translation silently keeps its English name in the Dutch UI.
  Close the gap with the root `npm run build:translations` (`scripts/build-translations-nl.mjs`) and
  commit the regenerated file.
- `src/index.html` **preloads both catalog files**, so adding a third locale overlay means adding a
  third preload there too.

## PWA

- **Web app manifest** (`public/manifest.webmanifest`): name *"Barkast — wat kan jij maken?"*
  (short_name *Barkast*), `standalone`/portrait, theme/background `#17120c`, 192/512/maskable icons,
  and 3 app shortcuts (Mijn bar, Mijn kast, Alle cocktails). **Those shortcuts have drifted from the
  router:** *Mijn bar* opens `/bar?source=pwa` and *Mijn kast* opens `/kast?source=pwa`, which now
  redirects to `/bar` — two shortcuts, one destination, and none of them opens `/ontdek`, the actual
  home surface. `src/app/core/bottom-nav/bottom-nav.ts` has the same drift (a `/bar` tab and a `/kast`
  tab). Fix both together when you get to it.
- **Service worker** (`public/sw.js`): network-first for navigations (falls back to a cached
  `/index.html` — the offline app shell), **cache-first** for content-hashed build assets
  (`…-<HASH>.js/.css`, immutable by construction), stale-while-revalidate for other same-origin
  assets (`catalog.json`, icons) and for cross-origin fonts, and an explicit **passthrough for
  `/api/`** so data is never served stale. It is a **hand-written** worker (not
  `@angular/service-worker`/ngsw — there's no `ngsw-config.json`), registered manually in `main.ts`
  **only in production**.
- **Cache busting is automatic — never hand-edit a version.** `sw.js` ships a `__BARKAST_BUILD__`
  placeholder in its `CACHE_VERSION`; `npm run build` runs `scripts/stamp-sw.mjs` afterwards, which
  replaces it with a SHA-256 over every shipped output file (bundles, `catalog.json`, icons,
  `index.html`, manifest) — so even a data-only deploy changes `sw.js`. The new worker deliberately
  does **not** `skipWaiting()`; `SwUpdateService` spots it waiting and the app offers a one-tap
  *"Vernieuwen"* that activates it and reloads.
- **Offline caveat:** `src/index.html` pulls Fraunces + Inter and the Material Icons font from
  `fonts.googleapis.com` / `fonts.gstatic.com` as runtime stylesheets, so the *first* load still needs
  the network for typography and icon glyphs. The service worker then caches those cross-origin
  responses stale-while-revalidate and later loads are fully offline.
- **Installability:** on Android/Chromium a captured `beforeinstallprompt` is replayed by
  `PwaService.install()`; on iOS Safari a guided *"Zet op beginscherm"* sheet is shown. The prompt
  appears only on mobile, when not installed and not snoozed; dismissing snoozes it for 14 days.
- **Mobile tuning:** `viewport-fit=cover`, `env(safe-area-inset-*)` padding, 16px inputs under 560px
  (no iOS zoom), `touch-action: manipulation`, and ≥48px tap targets on the install sheet.

## Cross-cutting

- **Theme:** `ThemeService` persists light/dark, stamps `<html data-theme>`, and syncs the
  `theme-color` meta (`#f4ebd8` light / `#17120c` dark) so browser/PWA chrome matches; initial theme
  falls back to `prefers-color-scheme`.
- **HTTP errors:** two functional interceptors are registered (`app.config.ts`). `authInterceptor` is
  innermost so it can refresh-and-retry a 401 before `apiErrorInterceptor` surfaces every remaining
  failure as a **localized** `MatSnackBar` message (status 0 → *"Geen verbinding met de server. Draait
  de backend?"* / *"No connection to the server. Is the backend running?"*).
- **Router:** configured with `withComponentInputBinding()` and scroll-position restoration to top.
  Route `title`s are **i18n keys, not literals**: `AppTitleStrategy` (`core/title-strategy.ts`,
  provided in `app.config.ts`) resolves them against `UiStrings['titles']` and re-applies them on a
  locale change. A literal yields no tab title at all — `app.routes.ts` hard-codes
  `title: 'Account — Barkast'`, which is not a key in `titles`, so `/account` is the live example of
  that bug.

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
npm run build             # ng build (production) + scripts/stamp-sw.mjs — never run bare `ng build`
npm test                  # ng test → Vitest (jsdom); one smoke spec here, see Tech stack
```

The API base URLs and every feature switch come from the environment files, swapped at build time
(`angular.json` `fileReplacements`): dev `environment.ts` (`apiUrl`/`apiBaseUrl`
`'http://localhost:3000/api/'`, `analyticsUrl` `'…/api/events'`, `dataSource: 'api'`, `admin: true`,
`authEnabled: true`) → prod `environment.prod.ts` (`dataSource: 'static'`, `admin: false`,
`authEnabled: false`, `analyticsUrl: ''`, and both `apiUrl` and `apiBaseUrl` left at the relative
`'/api/'`). Both also carry `catalogUrl` (`catalog.json`) and `translationsUrl` (`catalog.nl.json`).
Because `dataSource` is `'static'` **and** `authEnabled` is `false`, the deployed SPA makes **no
`/api/*` calls whatsoever** — standing up a backend changes nothing until `apiBaseUrl` points at its
origin, `authEnabled` is flipped to `true`, and the frontend is rebuilt and redeployed (and that
origin is added to the backend's `CORS_ORIGIN`). `apiUrl` must end with a trailing slash — services
build `` `${apiUrl}cocktails` ``.

## Production build & deploy

Production is a **static Angular SPA hosted on Netlify**, but Netlify's own builds are switched off
for this site — **GitHub Actions is the only path to production** (`.github/workflows/ci.yml`). On a
push to `main` it runs `build:shared → build:catalog → build --workspace frontend`, copies
`frontend/dist/frontend/browser/` into a scratch directory outside the repo checkout, and uploads it
with `netlify-cli deploy --prod`. The `[build]` block in `netlify.toml` (publish
`dist/frontend/browser`, `NODE_VERSION=24`) is kept for reference and does **not** run. SPA routing
comes from `public/_redirects` (`/* /index.html 200`) — the `@angular/build:application` builder drops
underscore-prefixed public files from `dist/`, so CI copies `_redirects` and `_headers` into the
deploy root explicitly. Keep both files in `public/`.

The catalog bundle (`public/catalog.json` + `catalog.nl.json`) is generated from the frozen
`iba-cocktails-seed.json` at the repo root by `npm run build:catalog` — never fetched from a live DB —
and both files are **committed to the repo**. CI regenerates them and fails the build if the committed
copies differ or are untracked, so after touching the seed you must re-run `npm run build:catalog` and
commit the result. See the root [`README.md`](../README.md) and `netlify.toml`.
