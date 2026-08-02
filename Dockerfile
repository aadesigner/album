# Railway: Root Directory = /  |  Config-as-code = /artifacts/api-server/railway.toml
FROM node:22-bookworm-slim
WORKDIR /app

ENV CI=true \
    PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH"

RUN corepack enable && corepack prepare pnpm@11.8.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY tsconfig.base.json tsconfig.json ./
COPY artifacts ./artifacts
COPY lib ./lib
COPY scripts ./scripts

# Install ALL deps (including drizzle-kit / esbuild). NODE_ENV=production here
# would skip devDependencies and break build + schema push.
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/api-server build

ENV NODE_ENV=production

RUN chmod +x /app/artifacts/api-server/start.sh
WORKDIR /app/artifacts/api-server
EXPOSE 8080
CMD ["./start.sh"]
