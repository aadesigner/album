# Railway: set Root Directory to "/" (monorepo root) for the api-server service.
FROM node:22-bookworm-slim
WORKDIR /app

ENV CI=true \
    NODE_ENV=production \
    PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH"

RUN corepack enable && corepack prepare pnpm@11.8.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY tsconfig.base.json tsconfig.json ./
COPY artifacts ./artifacts
COPY lib ./lib
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/api-server build

RUN chmod +x /app/artifacts/api-server/start.sh
WORKDIR /app/artifacts/api-server
EXPOSE 8080
CMD ["./start.sh"]
