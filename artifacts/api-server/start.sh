#!/bin/sh
set -eu

echo "[api-server] DATABASE_URL set: $([ -n "${DATABASE_URL:-}" ] && echo yes || echo NO)"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[api-server] ERROR: DATABASE_URL is missing"
  exit 1
fi

echo "[api-server] Pushing Drizzle schema..."
cd /app/lib/db
# Non-interactive: create missing tables on fresh Railway Postgres
pnpm exec drizzle-kit push --config ./drizzle.config.ts --force
echo "[api-server] Schema push done"

cd /app/artifacts/api-server
echo "[api-server] Starting..."
exec node --enable-source-maps ./dist/index.mjs
