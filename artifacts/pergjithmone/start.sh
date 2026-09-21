#!/bin/sh
# Boot the static server from whichever layout Railway actually shipped.
set -eu

echo "[pergjithmone] cwd=$(pwd)"
echo "[pergjithmone] listing /app:"
ls -la /app 2>/dev/null || true
echo "[pergjithmone] listing /app/artifacts (if any):"
ls -la /app/artifacts 2>/dev/null || true
echo "[pergjithmone] listing /app/artifacts/pergjithmone (if any):"
ls -la /app/artifacts/pergjithmone 2>/dev/null || true
echo "[pergjithmone] listing /app/artifacts/api-server (if any):"
ls -la /app/artifacts/api-server 2>/dev/null || true

CANDIDATES="
/app/server.mjs
/app/artifacts/pergjithmone/server.mjs
./server.mjs
./artifacts/pergjithmone/server.mjs
"

for f in $CANDIDATES; do
  if [ -f "$f" ]; then
    echo "[pergjithmone] starting: node $f"
    exec node "$f"
  fi
done

FOUND="$(find /app -name 'server.mjs' 2>/dev/null | head -n 5 || true)"
if [ -n "$FOUND" ]; then
  FIRST="$(printf '%s\n' "$FOUND" | head -n 1)"
  echo "[pergjithmone] starting discovered: node $FIRST"
  exec node "$FIRST"
fi

echo "[pergjithmone] FATAL: server.mjs not found in this image."
echo "[pergjithmone] This usually means the service is building the API Dockerfile,"
echo "[pergjithmone] or Root Directory / Dockerfile path is wrong."
echo "[pergjithmone] Required Railway settings for THIS service:"
echo "  Config-as-code = /artifacts/pergjithmone/railway.toml"
echo "  Dockerfile path = Dockerfile.web"
echo "  Root Directory  = /   (repo root)"
exit 1
