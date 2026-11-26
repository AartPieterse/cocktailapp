# Web image for Barkaart: the production SPA baked into Caddy, together with Caddy's config.
# BUILD CONTEXT = REPO ROOT, like backend/Dockerfile (the frontend imports the @cocktailapp/shared
# workspace), so build it as:
#   docker build -f frontend/Dockerfile -t barkaart-web .      (from the repo root)
# or via deploy/docker-compose.lan.yml (context: ..). Its ignore file is Dockerfile.dockerignore next
# to this file, not the root .dockerignore — that one is tuned for the API and drops the frontend.
#
# Why an image instead of a bundle the box builds and bind-mounts: a release becomes one immutable
# artifact per commit that either exists whole or not at all. A failed build fails in CI, where it
# cannot touch what is being served; a config change ships with the release instead of depending on
# a reload seeing an edited file; and rolling back the SPA is the same `deploy.sh --rollback` as the
# API. It also keeps npm — and every install script in the lockfile — off the production box.

# ---- build stage ----
# Same base and install recipe as backend/Dockerfile, for the same reasons (glibc for the Angular
# toolchain's native binaries; --ignore-scripts because the shared workspace's `prepare` would run
# before its sources are copied in).
FROM node:24-slim AS build
WORKDIR /repo

COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci --ignore-scripts

COPY shared ./shared
COPY frontend ./frontend

# The catalog bundles in frontend/public are generated but committed, and CI fails any build where
# they are stale — so they are used as committed rather than regenerated here.
RUN npm run build --workspace @cocktailapp/shared \
 && npm run build --workspace frontend

# ---- runtime stage ----
FROM caddy:2-alpine
COPY deploy/Caddyfile.lan /etc/caddy/Caddyfile
COPY --from=build /repo/frontend/dist/frontend/browser /srv
