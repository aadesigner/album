# Railway: Root Directory = /  |  Config-as-code = /artifacts/api-server/railway.toml
# Multi-stage: trim unused workspace apps from the runtime image.
# Memory (not CPU) is what drives Railway cost for this project.
FROM node:22-bookworm-slim AS build
WORKDIR /app

ENV CI=true \
    PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH"

RUN corepack enable && corepack prepare pnpm@11.8.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY tsconfig.base.json tsconfig.json ./
# Full workspace copy needed so pnpm can resolve workspace packages.
COPY artifacts ./artifacts
COPY lib ./lib
COPY scripts ./scripts

# Install ALL deps (drizzle-kit needed for ensureSchema at boot).
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/api-server build

# Strip frontend / sandbox / sources that are never used by the API process.
RUN rm -rf \
      artifacts/pergjithmone \
      artifacts/mockup-sandbox \
      artifacts/api-server/src \
    && pnpm store prune || true

FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV CI=true \
    NODE_ENV=production \
    PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    # Cap V8 heap so RSS can't balloon on idle / PDF spikes.
    NODE_OPTIONS="--max-old-space-size=384"

RUN corepack enable && corepack prepare pnpm@11.8.0 --activate

COPY --from=build /app /app

RUN chmod +x /app/artifacts/api-server/start.sh
WORKDIR /app/artifacts/api-server
EXPOSE 8080
CMD ["./start.sh"]
