import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { logger } from "./logger";

/**
 * Push Drizzle schema to Postgres from inside the Railway container
 * (where postgres.railway.internal is reachable).
 */
export function ensureSchema(): void {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for schema push");
  }

  const candidates = [
    "/app/lib/db",
    path.resolve(process.cwd(), "../../lib/db"),
    path.resolve(process.cwd(), "lib/db"),
  ];
  const dbDir = candidates.find((dir) =>
    fs.existsSync(path.join(dir, "drizzle.config.ts")),
  );
  if (!dbDir) {
    throw new Error(`Could not find lib/db (tried: ${candidates.join(", ")})`);
  }

  logger.info({ dbDir }, "Pushing database schema with drizzle-kit");

  // On Windows, pnpm is a .cmd shim — execFileSync("pnpm") fails with ENOENT.
  const pnpmBin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  execFileSync(
    pnpmBin,
    ["exec", "drizzle-kit", "push", "--config", "./drizzle.config.ts", "--force"],
    {
      cwd: dbDir,
      stdio: "inherit",
      env: process.env,
      shell: process.platform === "win32",
    },
  );

  logger.info("Database schema push complete");
}
