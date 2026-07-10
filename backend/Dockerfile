# Multi-stage build for the Barkast API. BUILD CONTEXT = REPO ROOT (this is an npm-workspaces
# monorepo: the backend depends on the @cocktailapp/shared workspace), so build it as:
#   docker build -f backend/Dockerfile -t barkast-api .        (from the repo root)
# or via deploy/docker-compose.yml (context: ..).

# ---- build stage: install all workspaces, build shared then backend, drop dev deps ----
# Debian/glibc (not Alpine/musl): `npm ci` installs the whole monorepo incl. the frontend's Angular
# devDeps, whose native prebuilt binaries are most reliable on glibc. The backend's *runtime* deps
# are all pure-JS, so the runtime image carries no native binaries.
FROM node:24-slim AS build
WORKDIR /repo

# Manifests first for cache-friendly installs. All workspace package.json files must be present
# for `npm ci` to reconcile against the root lockfile.
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci

# Sources (frontend source is excluded via .dockerignore — only its manifest is needed above).
COPY shared ./shared
COPY backend ./backend

RUN npm run build --workspace @cocktailapp/shared \
 && npm run build --workspace backend \
 && npm prune --omit=dev

# ---- runtime stage: slim, non-root, production only ----
FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Run as an unprivileged user.
RUN groupadd -r app && useradd -r -g app app

# Hoisted production node_modules (includes the @cocktailapp/shared workspace symlink → ./shared).
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/package.json ./package.json
# The shared workspace target the symlink points at (built output + manifest only).
COPY --from=build /repo/shared/package.json ./shared/package.json
COPY --from=build /repo/shared/dist ./shared/dist
# The backend itself.
COPY --from=build /repo/backend/package.json ./backend/package.json
COPY --from=build /repo/backend/dist ./backend/dist

USER app
EXPOSE 3000
# The API reads config from the environment (MONGODB_URI, JWT_SECRET, JWT_REFRESH_SECRET,
# CORS_ORIGIN, …); NODE_ENV=production makes it require CORS_ORIGIN at boot.
CMD ["node", "backend/dist/main.js"]
