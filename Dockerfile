# Single image for BOTH Railway services (api-server + pergjithmone).
# Both services MUST use:
#   Root Directory  = /
#   Dockerfile path = Dockerfile
#
# Only the Start Command / START_APP differs:
#   frontend → START_APP=web
#   api      → START_APP=api
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

# Drop heavy sources not needed at runtime (keep node_modules for native deps).
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

RUN corepack enable && corepack prepare pnpm@11.8.0 --activate

COPY --from=build /app /app

# Stable frontend entry paths (web start commands expect these).
RUN cp /app/artifacts/pergjithmone/server.mjs /app/server.mjs \
 && ln -sfn /app/artifacts/pergjithmone/dist /app/dist \
 && cp /app/artifacts/pergjithmone/start.sh /app/start-web.sh \
 && cp /app/artifacts/api-server/start.sh /app/start-api.sh \
 && printf '%s\n' \
'#!/bin/sh' \
'set -eu' \
'echo "[boot] START_APP=${START_APP:-auto} cwd=$(pwd)"' \
'ls -la /app | head -n 40 || true' \
'case "${START_APP:-auto}" in' \
'  web|frontend|pergjithmone)' \
'    exec sh /app/start-web.sh' \
'    ;;' \
'  api|api-server|backend)' \
'    exec sh /app/start-api.sh' \
'    ;;' \
'  *)' \
'    if [ -f /app/artifacts/api-server/dist/index.mjs ] && [ -f /app/server.mjs ]; then' \
'      echo "[boot] FATAL: set START_APP=web or START_APP=api on this Railway service"' \
'      exit 1' \
'    fi' \
'    if [ -f /app/server.mjs ]; then exec sh /app/start-web.sh; fi' \
'    if [ -f /app/artifacts/api-server/dist/index.mjs ]; then exec sh /app/start-api.sh; fi' \
'    echo "[boot] FATAL: no web or api entrypoint in image"' \
'    exit 1' \
'    ;;' \
'esac' \
> /app/boot.sh \
 && chmod +x /app/boot.sh /app/start-web.sh /app/start-api.sh /app/artifacts/pergjithmone/start.sh /app/artifacts/api-server/start.sh \
 && test -f /app/server.mjs \
 && test -f /app/artifacts/api-server/dist/index.mjs \
 && test -f /app/dist/public/index.html

EXPOSE 8080
CMD ["sh", "/app/boot.sh"]
