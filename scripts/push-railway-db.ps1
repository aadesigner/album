# Push Drizzle schema + seed catalog to Railway Postgres.
# Usage:
#   1. Railway → Postgres → Variables → copy DATABASE_URL (public / TCP URL)
#   2. In PowerShell from repo root:
#        $env:DATABASE_URL = "postgresql://..."
#        .\scripts\push-railway-db.ps1

$ErrorActionPreference = "Stop"

if (-not $env:DATABASE_URL) {
  Write-Host @"
DATABASE_URL is not set.

1. Open Railway → your Postgres service → Variables
2. Copy DATABASE_URL (use the public one if pushing from your PC)
3. Run:

   `$env:DATABASE_URL = "postgresql://USER:PASS@HOST:PORT/railway"
   .\scripts\push-railway-db.ps1
"@
  exit 1
}

Write-Host "Pushing schema to Railway..."
Push-Location (Join-Path $PSScriptRoot "..\lib\db")
pnpm exec drizzle-kit push --config ./drizzle.config.ts --force
Pop-Location

Write-Host "Done. Redeploy api-server (or wait for seed on next restart)."
Write-Host "Then check: https://YOUR-API.up.railway.app/api/categories"
