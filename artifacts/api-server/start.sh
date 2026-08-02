#!/bin/sh
set -e
# Create/update tables on a fresh Railway Postgres, then boot the API.
cd /app/lib/db
pnpm exec drizzle-kit push --config ./drizzle.config.ts
cd /app/artifacts/api-server
exec node --enable-source-maps ./dist/index.mjs
