# Single image for BOTH Railway services (api-server + pergjithmone).
# Both services MUST use:
#   Root Directory  = /
#   Dockerfile path = Dockerfile
#
# Start commands (first token must be an executable — no VAR=value prefix):
#   frontend → sh /app/boot-web.sh
#   api      → sh /app/boot-api.sh
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

RUN corepack enable && corepack prepare pnpm@11.8.0 --activate

COPY --from=build /app /app

RUN cp /app/artifacts/pergjithmone/server.mjs /app/server.mjs \
 && ln -sfn /app/artifacts/pergjithmone/dist /app/dist \
 && printf '%s\n' \
'#!/bin/sh' \
'set -eu' \
'echo "[web] starting node /app/server.mjs"' \
'if [ ! -f /app/server.mjs ]; then echo "[web] FATAL: /app/server.mjs missing"; ls -la /app; exit 1; fi' \
'exec node /app/server.mjs' \
> /app/boot-web.sh \
 && printf '%s\n' \
'#!/bin/sh' \
'set -eu' \
'echo "[api] starting node /app/artifacts/api-server/dist/index.mjs"' \
'echo "[api] DATABASE_URL set: $([ -n "${DATABASE_URL:-}" ] && echo yes || echo NO)"' \
'if [ ! -f /app/artifacts/api-server/dist/index.mjs ]; then echo "[api] FATAL: dist/index.mjs missing"; ls -la /app /app/artifacts 2>/dev/null; exit 1; fi' \
'exec node /app/artifacts/api-server/dist/index.mjs' \
> /app/boot-api.sh \
 && chmod +x /app/boot-web.sh /app/boot-api.sh \
 && test -f /app/server.mjs \
 && test -f /app/artifacts/api-server/dist/index.mjs \
 && test -f /app/dist/public/index.html

EXPOSE 8080
CMD ["sh", "/app/boot-web.sh"]
