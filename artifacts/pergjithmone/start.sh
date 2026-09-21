#!/bin/sh
set -eu
echo "[web] cwd=$(pwd)"
for f in /app/server.mjs /app/artifacts/pergjithmone/server.mjs ./server.mjs; do
  if [ -f "$f" ]; then
    echo "[web] starting: node $f"
    exec node "$f"
  fi
done
echo "[web] FATAL: server.mjs missing. Image was not built from the unified Dockerfile."
ls -la /app 2>/dev/null || true
ls -la /app/artifacts 2>/dev/null || true
exit 1
