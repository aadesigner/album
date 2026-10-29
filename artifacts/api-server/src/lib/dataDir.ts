import fs from "fs";
import path from "path";
import { logger } from "./logger";

/** Railway volume mount. Used automatically when DATA_DIR is unset. */
export const VOLUME_ROOT = "/data";

/**
 * Where uploads and print PDFs live. Prefer an explicit DATA_DIR, then a
 * mounted /data volume, then process.cwd() (ephemeral on Railway rebuilds).
 */
export function pickDataRoot(opts: {
  envDir?: string | null;
  volumeExists: boolean;
  cwd: string;
}): string {
  const fromEnv = opts.envDir?.trim();
  if (fromEnv) return fromEnv;
  if (opts.volumeExists) return VOLUME_ROOT;
  return opts.cwd;
}

function volumeIsMounted(): boolean {
  try {
    return fs.existsSync(VOLUME_ROOT) && fs.statSync(VOLUME_ROOT).isDirectory();
  } catch {
    return false;
  }
}

export function resolveDataRoot(): string {
  return pickDataRoot({
    envDir: process.env.DATA_DIR,
    volumeExists: volumeIsMounted(),
    cwd: process.cwd(),
  });
}

export const dataRoot = resolveDataRoot();
export const uploadsDir = path.join(dataRoot, "uploads");
export const pdfsDir = path.join(dataRoot, "pdfs");

let ensured = false;

export function ensureDataDirs(): void {
  if (ensured) return;
  ensured = true;
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.mkdirSync(pdfsDir, { recursive: true });
  const persistent = dataRoot === VOLUME_ROOT || Boolean(process.env.DATA_DIR?.trim());
  if (process.env.NODE_ENV === "production" && !persistent) {
    logger.warn(
      { dataRoot },
      "No persistent volume: album photos, category covers, and print PDFs will vanish on the next deploy. Mount a Railway volume at /data (or set DATA_DIR).",
    );
  } else {
    logger.info({ dataRoot, uploadsDir, pdfsDir }, "Persistent data directories ready");
  }
}

/** Look in the live dir, cwd leftover, DATA_DIR, and /data so old files still resolve after a volume move. */
export function uploadFilePathCandidates(filename: string, primaryDir = uploadsDir): string[] {
  const out = [
    path.join(primaryDir, filename),
    path.join(uploadsDir, filename),
    path.join(process.cwd(), "uploads", filename),
    path.join(VOLUME_ROOT, "uploads", filename),
  ];
  const envDir = process.env.DATA_DIR?.trim();
  if (envDir) out.push(path.join(envDir, "uploads", filename));
  return [...new Set(out)];
}
