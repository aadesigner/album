import fs from "fs";
import path from "path";
import { parsePageElements } from "./pdfRenderer";
import { uploadFilePathCandidates, getUploadsDir } from "./dataDir";

/**
 * Pull the uploads/files basename from an element src.
 * Only client-uploaded files — not designs, Unsplash, data:, or device-local refs.
 */
export function extractUploadFilename(src: string | null | undefined): string | null {
  if (!src || typeof src !== "string") return null;
  const trimmed = src.trim();
  if (!trimmed) return null;
  if (/^local-photo:/i.test(trimmed) || /^blob:/i.test(trimmed) || /^data:/i.test(trimmed)) {
    return null;
  }

  let pathname = trimmed;
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      pathname = new URL(trimmed).pathname;
    }
  } catch {
    return null;
  }

  pathname = pathname.split("?")[0].split("#")[0];
  const match =
    pathname.match(/\/api\/uploads\/files\/([^/]+)$/i)
    || pathname.match(/^\/?uploads\/files\/([^/]+)$/i)
    || pathname.match(/(?:^|\/)api\/uploads\/files\/([^/]+)$/i);
  if (!match) return null;

  let filename: string;
  try {
    filename = decodeURIComponent(match[1]);
  } catch {
    filename = match[1];
  }
  // Same sanitizer as the public uploads route — block path tricks.
  if (!/^[\w.\-]+$/.test(filename)) return null;
  return filename;
}

/** Unique upload filenames referenced by album page contentJson blobs. */
export function collectUploadFilenamesFromPages(contentJsons: Iterable<string | null | undefined>): string[] {
  const seen = new Set<string>();
  for (const raw of contentJsons) {
    for (const el of parsePageElements(raw)) {
      const name = extractUploadFilename(el.src);
      if (name) seen.add(name);
    }
  }
  return [...seen].sort();
}

export type ResolvedAlbumUpload = {
  filename: string;
  path: string;
  size: number;
};

/** Resolve upload filenames to files that exist on disk (volume / cwd / DATA_DIR). */
export function resolveAlbumUploadFiles(
  filenames: string[],
  primaryDir = getUploadsDir(),
): ResolvedAlbumUpload[] {
  const out: ResolvedAlbumUpload[] = [];
  for (const filename of filenames) {
    if (!/^[\w.\-]+$/.test(filename)) continue;
    const filePath = uploadFilePathCandidates(filename, primaryDir).find((p) => {
      try {
        return fs.existsSync(p) && fs.statSync(p).isFile();
      } catch {
        return false;
      }
    });
    if (!filePath) continue;
    let size = 0;
    try {
      size = fs.statSync(filePath).size;
    } catch {
      continue;
    }
    out.push({ filename, path: filePath, size });
  }
  return out;
}

export function safeZipDownloadBasename(title: string | null | undefined, orderId: number): string {
  const slug = String(title || "album")
    .replace(/[^a-z0-9_\-]+/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 60) || "album";
  return `order-${orderId}-${slug}-photos.zip`;
}

/** Zip entry name stays the unique on-disk basename (already collision-free). */
export function zipEntryName(filename: string): string {
  return path.basename(filename);
}

/**
 * Clear client-upload image srcs from page JSON (keeps layout placeholders / stickers / designs).
 * Returns rewritten JSON string + how many image slots were cleared.
 */
export function stripUploadSrcsFromContentJson(raw: string | null | undefined): {
  contentJson: string;
  cleared: number;
} {
  let els: unknown;
  try {
    els = typeof raw === "string" ? JSON.parse(raw || "[]") : [];
  } catch {
    return { contentJson: "[]", cleared: 0 };
  }
  if (!Array.isArray(els)) return { contentJson: "[]", cleared: 0 };

  let cleared = 0;
  const next = els.map((item) => {
    if (!item || typeof item !== "object") return item;
    const e = item as Record<string, unknown>;
    if (e.sticker) return item; // admin icon assets stay
    if (e.type !== "image" && e.type !== "background") return item;
    const name = extractUploadFilename(typeof e.src === "string" ? e.src : null);
    if (!name) return item;
    cleared += 1;
    if (e.type === "background") {
      const { src: _s, ...rest } = e;
      return { ...rest, src: undefined, bgColor: (e.bgColor as string) || "#FFFFFF" };
    }
    // Photo slot → empty placeholder so layout frame remains.
    return {
      ...e,
      type: "placeholder",
      src: undefined,
      cropFocusX: undefined,
      cropFocusY: undefined,
      cropZoom: undefined,
    };
  });

  return { contentJson: JSON.stringify(next), cleared };
}
