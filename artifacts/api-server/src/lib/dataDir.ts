import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger";

/** Railway volume mount. Used automatically when DATA_DIR is unset or ephemeral. */
export const VOLUME_ROOT = "/data";

/**
 * Paths that die on every Railway/Docker redeploy. A DATA_DIR pointed here
 * used to report "persistent" while Design Studio / category uploads vanished
 * on each build — never treat the app tree or /tmp as durable storage.
 */
export function isEphemeralDataPath(dir: string, cwd: string): boolean {
  const resolved = path.resolve(dir);
  const root = path.resolve(cwd);
  if (resolved === root || resolved.startsWith(root + path.sep)) return true;
  // Forward-slash form so Windows test hosts still recognize Railway paths.
  const posix = resolved.replace(/\\/g, "/");
  const lower = posix.toLowerCase();
  if (lower === "/app" || lower.startsWith("/app/")) return true;
  if (lower === "/tmp" || lower.startsWith("/tmp/")) return true;
  if (/^[a-z]:\/app(\/|$)/i.test(posix)) return true;
  if (/^[a-z]:\/tmp(\/|$)/i.test(posix)) return true;
  return false;
}

/**
 * Where uploads, designs, and print PDFs live.
 * Priority: non-ephemeral DATA_DIR → mounted /data volume → cwd (dev only).
 * A mounted /data volume always beats an accidental DATA_DIR under /app.
 */
export function pickDataRoot(opts: {
  envDir?: string | null;
  volumeExists: boolean;
  cwd: string;
}): string {
  const fromEnv = opts.envDir?.trim() || "";
  const envIsDurable = Boolean(fromEnv) && !isEphemeralDataPath(fromEnv, opts.cwd);

  if (opts.volumeExists) {
    // Custom durable mount (e.g. /mnt/photos) is allowed; ephemeral DATA_DIR is not.
    if (envIsDurable) return path.resolve(fromEnv);
    return VOLUME_ROOT;
  }
  if (envIsDurable) return path.resolve(fromEnv);
  return opts.cwd;
}

function volumeIsMounted(): boolean {
  try {
    return fs.existsSync(VOLUME_ROOT) && fs.statSync(VOLUME_ROOT).isDirectory();
  } catch {
    return false;
  }
}

/** Fresh resolve every call — safe if boot exports DATA_DIR before listen. */
export function resolveDataRoot(): string {
  return pickDataRoot({
    envDir: process.env.DATA_DIR,
    volumeExists: volumeIsMounted(),
    cwd: process.cwd(),
  });
}

/** @deprecated Prefer resolveDataRoot() — kept for call sites that import a binding. */
export const dataRoot = resolveDataRoot();
export const uploadsDir = path.join(dataRoot, "uploads");
export const pdfsDir = path.join(dataRoot, "pdfs");
export const designsDir = path.join(dataRoot, "designs");

export function getUploadsDir(): string {
  return path.join(resolveDataRoot(), "uploads");
}

export function getPdfsDir(): string {
  return path.join(resolveDataRoot(), "pdfs");
}

export function getDesignsDir(): string {
  return path.join(resolveDataRoot(), "designs");
}

/** True when uploads/designs survive container rebuilds (real volume, not /app). */
export function hasPersistentStorage(
  root = resolveDataRoot(),
  envDir = process.env.DATA_DIR,
  cwd = process.cwd(),
): boolean {
  const resolved = path.resolve(root);
  if (isEphemeralDataPath(resolved, cwd)) return false;
  if (resolved === path.resolve(VOLUME_ROOT)) return true;
  // Explicit durable DATA_DIR (e.g. /mnt/photos) or any non-ephemeral root.
  return Boolean(envDir?.trim()) || resolved !== path.resolve(cwd);
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
  const dest = getDesignsDir();
  fs.mkdirSync(dest, { recursive: true });
  for (const dir of builtinDesignSourceDirs()) {
    copyNewFiles(dir, dest, isImage);
  }
}

export function ensureDataDirs(): void {
  if (ensured) return;
  ensured = true;
  const root = resolveDataRoot();
  const uploads = path.join(root, "uploads");
  const pdfs = path.join(root, "pdfs");
  const designs = path.join(root, "designs");
  fs.mkdirSync(uploads, { recursive: true });
  fs.mkdirSync(pdfs, { recursive: true });
  fs.mkdirSync(designs, { recursive: true });
  seedBuiltinDesignAssets();
  // Rescue files left in the container cwd from before a volume was attached.
  const cwdUploads = path.join(process.cwd(), "uploads");
  if (path.resolve(cwdUploads) !== path.resolve(uploads)) {
    copyNewFiles(cwdUploads, uploads);
  }
  const cwdDesigns = path.join(process.cwd(), "designs");
  if (path.resolve(cwdDesigns) !== path.resolve(designs)) {
    copyNewFiles(cwdDesigns, designs, (f) => /\.(jpe?g|png|webp|gif)$/i.test(f));
  }
  const cwdPdfs = path.join(process.cwd(), "pdfs");
  if (path.resolve(cwdPdfs) !== path.resolve(pdfs)) {
    copyNewFiles(cwdPdfs, pdfs);
  }
  // Also rescue a mistaken DATA_DIR=/app/uploads (or similar) into the volume.
  for (const stale of ["/app/uploads", "/app/data/uploads", path.join(process.cwd(), "data", "uploads")]) {
    if (path.resolve(stale) !== path.resolve(uploads)) {
      copyNewFiles(stale, uploads);
    }
  }
  for (const stale of ["/app/designs", "/app/data/designs", path.join(process.cwd(), "data", "designs")]) {
    if (path.resolve(stale) !== path.resolve(designs)) {
      copyNewFiles(stale, designs, (f) => /\.(jpe?g|png|webp|gif)$/i.test(f));
    }
  }

  const persistent = hasPersistentStorage(root);
  if (process.env.NODE_ENV === "production" && !persistent) {
    logger.error(
      { dataRoot: root, DATA_DIR: process.env.DATA_DIR || null, volume: VOLUME_ROOT },
      "FATAL persistence risk: no Railway volume at /data. Admin Design Studio uploads, category covers, wallpapers, and print PDFs will be WIPED on the next deploy. Mount a volume on the API service at /data.",
    );
  } else {
    logger.info(
      { dataRoot: root, uploadsDir: uploads, pdfsDir: pdfs, designsDir: designs, persistent },
      "Persistent data directories ready",
    );
  }
}

/** Look in the live dir, cwd leftover, DATA_DIR, and /data so old files still resolve after a volume move. */
export function uploadFilePathCandidates(filename: string, primaryDir = getUploadsDir()): string[] {
  const out = [
    path.join(primaryDir, filename),
    path.join(getUploadsDir(), filename),
    path.join(resolveDataRoot(), "uploads", filename),
    path.join(process.cwd(), "uploads", filename),
    path.join(process.cwd(), "data", "uploads", filename),
    path.join(VOLUME_ROOT, "uploads", filename),
    path.join("/app/uploads", filename),
    path.join("/app/data/uploads", filename),
  ];
  const envDir = process.env.DATA_DIR?.trim();
  if (envDir) out.push(path.join(envDir, "uploads", filename));
  return [...new Set(out)];
}
