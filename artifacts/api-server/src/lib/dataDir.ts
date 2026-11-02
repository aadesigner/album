import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
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
export const designsDir = path.join(dataRoot, "designs");

/** True when uploads/designs survive container rebuilds (volume or DATA_DIR). */
export function hasPersistentStorage(
  root = dataRoot,
  envDir = process.env.DATA_DIR,
): boolean {
  return root === VOLUME_ROOT || Boolean(envDir?.trim());
}

let ensured = false;

function builtinDesignSourceDirs(): string[] {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  return [
    path.join(moduleDir, "assets", "designs"),
    path.join(moduleDir, "..", "assets", "designs"),
    path.join(process.cwd(), "assets", "designs"),
    path.join(process.cwd(), "public", "designs"),
    path.join(process.cwd(), "artifacts", "api-server", "assets", "designs"),
    path.join(process.cwd(), "artifacts", "api-server", "dist", "assets", "designs"),
    path.join(process.cwd(), "artifacts", "pergjithmone", "public", "designs"),
    path.join(moduleDir, "..", "..", "pergjithmone", "public", "designs"),
  ];
}

function copyNewFiles(fromDir: string, toDir: string, nameOk?: (file: string) => boolean): void {
  let names: string[] = [];
  try {
    if (!fs.existsSync(fromDir)) return;
    names = fs.readdirSync(fromDir);
  } catch {
    return;
  }
  fs.mkdirSync(toDir, { recursive: true });
  for (const file of names) {
    if (nameOk && !nameOk(file)) continue;
    const from = path.join(fromDir, file);
    const to = path.join(toDir, file);
    try {
      if (fs.existsSync(to)) continue;
      if (!fs.statSync(from).isFile()) continue;
      fs.copyFileSync(from, to);
    } catch {
      // keep looking
    }
  }
}

/** Copy packaged cover art into DATA_DIR so deploys do not drop Eiffel / Sagrada. */
export function seedBuiltinDesignAssets(): void {
  const isImage = (file: string) => /\.(jpe?g|png|webp|gif)$/i.test(file);
  fs.mkdirSync(designsDir, { recursive: true });
  for (const dir of builtinDesignSourceDirs()) {
    copyNewFiles(dir, designsDir, isImage);
  }
}

export function ensureDataDirs(): void {
  if (ensured) return;
  ensured = true;
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.mkdirSync(pdfsDir, { recursive: true });
  fs.mkdirSync(designsDir, { recursive: true });
  seedBuiltinDesignAssets();
  // Rescue files left in the container cwd from before a volume was attached.
  const cwdUploads = path.join(process.cwd(), "uploads");
  if (path.resolve(cwdUploads) !== path.resolve(uploadsDir)) {
    copyNewFiles(cwdUploads, uploadsDir);
  }
  const cwdDesigns = path.join(process.cwd(), "designs");
  if (path.resolve(cwdDesigns) !== path.resolve(designsDir)) {
    copyNewFiles(cwdDesigns, designsDir, (f) => /\.(jpe?g|png|webp|gif)$/i.test(f));
  }
  const cwdPdfs = path.join(process.cwd(), "pdfs");
  if (path.resolve(cwdPdfs) !== path.resolve(pdfsDir)) {
    copyNewFiles(cwdPdfs, pdfsDir);
  }
  const persistent = hasPersistentStorage();
  if (process.env.NODE_ENV === "production" && !persistent) {
    logger.warn(
      { dataRoot },
      "No persistent volume: album photos, category covers, Design Studio uploads, wallpapers, and print PDFs will vanish on the next deploy. Mount a Railway volume at /data (or set DATA_DIR).",
    );
  } else {
    logger.info(
      { dataRoot, uploadsDir, pdfsDir, designsDir, persistent },
      "Persistent data directories ready",
    );
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
