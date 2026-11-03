import fs from "fs";
import path from "path";
import { uploadsDir, uploadFilePathCandidates } from "./dataDir";
import { logger } from "./logger";

const UPLOAD_FILE_RE = /\/(?:api\/)?uploads\/files\/([\w.\-]+)/gi;

/** Pull upload filenames referenced in page/content JSON strings. */
export function extractUploadFilenamesFromText(text: string): string[] {
  if (!text) return [];
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(UPLOAD_FILE_RE.source, "gi");
  while ((m = re.exec(text)) !== null) {
    const name = m[1];
    if (name && /^[\w.\-]+$/.test(name)) found.add(name);
  }
  return [...found];
}

export function extractUploadFilenamesFromPages(
  pages: Array<{ contentJson?: string | null }>,
): string[] {
  const found = new Set<string>();
  for (const p of pages) {
    for (const name of extractUploadFilenamesFromText(String(p.contentJson || ""))) {
      found.add(name);
    }
  }
  return [...found];
}

/** Delete uploaded image files from disk (best-effort). */
export function deleteUploadFiles(filenames: string[]): number {
  let removed = 0;
  for (const name of filenames) {
    if (!/^[\w.\-]+$/.test(name)) continue;
    for (const filePath of uploadFilePathCandidates(name)) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          removed += 1;
        }
      } catch (err) {
        logger.warn({ err, filePath }, "Failed to delete upload file");
      }
    }
  }
  return removed;
}

/** Wipe every file in the uploads directory (user photos). Returns count. */
export function clearAllUploadFiles(): number {
  let removed = 0;
  try {
    if (!fs.existsSync(uploadsDir)) return 0;
    for (const name of fs.readdirSync(uploadsDir)) {
      if (name.startsWith(".")) continue;
      const full = path.join(uploadsDir, name);
      try {
        if (fs.statSync(full).isFile()) {
          fs.unlinkSync(full);
          removed += 1;
        }
      } catch (err) {
        logger.warn({ err, full }, "Failed to clear upload file");
      }
    }
  } catch (err) {
    logger.error({ err }, "clearAllUploadFiles failed");
  }
  return removed;
}
