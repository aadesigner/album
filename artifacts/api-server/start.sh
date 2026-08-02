#!/bin/sh
set -eu
echo "[api-server] DATABASE_URL set: $([ -n "${DATABASE_URL:-}" ] && echo yes || echo NO)"
cd /app/artifacts/api-server
exec node --enable-source-maps ./dist/index.mjs
