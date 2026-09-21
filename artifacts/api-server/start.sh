#!/bin/sh
set -eu
echo "[api-server] DATABASE_URL set: $([ -n "${DATABASE_URL:-}" ] && echo yes || echo NO)"
cd /app/artifacts/api-server
# No --enable-source-maps in production (extra RSS for little benefit).
# NODE_OPTIONS (max-old-space-size) is set in the Dockerfile; allow override.
exec node ./dist/index.mjs
