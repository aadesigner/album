# Single image for BOTH Railway services.
# Root Directory = / | Dockerfile path = Dockerfile
#
# Preferred start commands:
#   frontend → /app/boot-web.sh
#   api      → /app/boot-api.sh
#
# Also installs /usr/local/bin/start_app=web and start_app=api so a
# stuck Railway "START_APP=web …" Custom Start Command still boots.
FROM node:22-bookworm-slim AS build
WORKDIR /app

ENV CI=true \
    NODE_ENV=production \
    PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    BASE_PATH=/

RUN corepack enable && corepack prepare pnpm@11.8.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY tsconfig.base.json tsconfig.json ./
COPY artifacts ./artifacts
COPY lib ./lib
COPY scripts ./scripts
COPY attached_assets ./attached_assets

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/api-server build
RUN pnpm --filter @workspace/pergjithmone build

RUN test -f /app/artifacts/api-server/dist/index.mjs
RUN test -f /app/artifacts/pergjithmone/server.mjs
RUN test -f /app/artifacts/pergjithmone/dist/public/index.html

RUN rm -rf \
      artifacts/mockup-sandbox \
      artifacts/api-server/src \
      artifacts/pergjithmone/src \
      artifacts/pergjithmone/e2e \
    && pnpm store prune || true

FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV CI=true \
    NODE_ENV=production \
    PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    BASE_PATH=/ \
    NODE_OPTIONS="--max-old-space-size=384"

# DejaVu fonts for print PDF text (@napi-rs/canvas GlobalFonts).
RUN apt-get update \
 && apt-get install -y --no-install-recommends fonts-dejavu-core \
 && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@11.8.0 --activate

COPY --from=build /app /app

RUN cp /app/artifacts/pergjithmone/server.mjs /app/server.mjs \
 && ln -sfn /app/artifacts/pergjithmone/dist /app/dist \
 && printf '%s\n' \
'#!/bin/sh' \
'set -eu' \
'echo "[web] starting node /app/server.mjs"' \
'exec node /app/server.mjs' \
> /app/boot-web.sh \
 && printf '%s\n' \
'#!/bin/sh' \
'set -eu' \
'echo "[api] starting node /app/artifacts/api-server/dist/index.mjs"' \
'exec node /app/artifacts/api-server/dist/index.mjs' \
> /app/boot-api.sh \
 && chmod +x /app/boot-web.sh /app/boot-api.sh \
 && cp /app/boot-web.sh /usr/local/bin/start_app=web \
 && cp /app/boot-api.sh /usr/local/bin/start_app=api \
 && cp /app/boot-web.sh '/usr/local/bin/START_APP=web' \
 && cp /app/boot-api.sh '/usr/local/bin/START_APP=api' \
 && chmod +x /usr/local/bin/start_app=web /usr/local/bin/start_app=api \
              '/usr/local/bin/START_APP=web' '/usr/local/bin/START_APP=api' \
 && test -f /app/server.mjs \
 && test -f /app/artifacts/api-server/dist/index.mjs \
 && test -f /app/dist/public/index.html

EXPOSE 8080
CMD ["/app/boot-web.sh"]
