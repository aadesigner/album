#!/bin/sh
set -eu
echo "[api-server] cwd=$(pwd)"
echo "[api-server] DATABASE_URL set: $([ -n "${DATABASE_URL:-}" ] && echo yes || echo NO)"
echo "[api-server] listing /app:"
ls -la /app 2>/dev/null || true
echo "[api-server] listing /app/artifacts:"
ls -la /app/artifacts 2>/dev/null || true
echo "[api-server] listing /app/artifacts/api-server:"
ls -la /app/artifacts/api-server 2>/dev/null || true
echo "[api-server] listing /app/artifacts/api-server/dist:"
ls -la /app/artifacts/api-server/dist 2>/dev/null || true

CANDIDATES="
/app/artifacts/api-server/dist/index.mjs
./dist/index.mjs
"

for f in $CANDIDATES; do
  if [ -f "$f" ]; then
    echo "[api-server] starting: node $f"
    exec node "$f"
  fi
done

if [ -f /app/server.mjs ] || [ -d /app/dist/public ]; then
  echo "[api-server] FATAL: this container looks like the FRONTEND image (Dockerfile.web)."
  echo "[api-server] Set api-server Dockerfile path to Dockerfile (or Dockerfile.api), not Dockerfile.web."
  exit 1
fi

echo "[api-server] FATAL: dist/index.mjs not found."
exit 1
