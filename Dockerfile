# Railway pergjithmone (frontend):
#   Root Directory     = /
#   Builder            = Dockerfile
#   Dockerfile path    = Dockerfile.web   (or Dockerfile — same file)
#   Config file        = /artifacts/pergjithmone/railway.toml
#   Custom Start Command = sh /app/start.sh
#
# Runtime layout:
#   /app/server.mjs
#   /app/start.sh
#   /app/dist/public/...
#   /app/artifacts/pergjithmone/server.mjs  (compat)
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
RUN pnpm --filter @workspace/pergjithmone build
RUN test -f /app/artifacts/pergjithmone/dist/public/index.html
RUN test -f /app/artifacts/pergjithmone/server.mjs

FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    BASE_PATH=/ \
    NODE_OPTIONS="--max-old-space-size=192"

COPY --from=build /app/artifacts/pergjithmone/dist ./dist
COPY --from=build /app/artifacts/pergjithmone/server.mjs ./server.mjs
COPY --from=build /app/artifacts/pergjithmone/start.sh ./start.sh
# Compat path for older start commands still pointing at artifacts/
RUN mkdir -p /app/artifacts/pergjithmone \
 && cp /app/server.mjs /app/artifacts/pergjithmone/server.mjs \
 && ln -sfn /app/dist /app/artifacts/pergjithmone/dist \
 && chmod +x /app/start.sh \
 && test -f /app/server.mjs \
 && test -f /app/dist/public/index.html

EXPOSE 8080
CMD ["sh", "/app/start.sh"]
