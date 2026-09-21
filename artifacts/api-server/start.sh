#!/bin/sh
set -eu
echo "[api-server] cwd=$(pwd)"
echo "[api-server] DATABASE_URL set: $([ -n "${DATABASE_URL:-}" ] && echo yes || echo NO)"
for f in /app/artifacts/api-server/dist/index.mjs ./dist/index.mjs; do
  if [ -f "$f" ]; then
    echo "[api-server] starting: node $f"
    exec node "$f"
  fi
done
echo "[api-server] FATAL: dist/index.mjs missing. Image was not built from the unified Dockerfile."
ls -la /app 2>/dev/null || true
ls -la /app/artifacts 2>/dev/null || true
exit 1
