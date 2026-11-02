/**
 * Safe photo types the picker and uploader allow. Some Android browsers treat
 * `image/*` as JPEG-only, so PNG/WebP/GIF must be listed by MIME and extension.
 */
export const ACCEPT_SAFE_IMAGES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/avif",
  "image/bmp",
  "image/tiff",
  ".jpg",
  ".jpeg",
  ".jfif",
  ".png",
  ".webp",
  ".gif",
  ".heic",
  ".heif",
  ".avif",
  ".bmp",
  ".tif",
  ".tiff",
].join(",");

export const SAFE_IMAGE_NAME = /\.(jpe?g|jfif|png|webp|gif|heic|heif|avif|bmp|tiff?)$/i;

export function isSafeImageFile(file: File): boolean {
  const type = String(file.type || '').toLowerCase();
  if (type.startsWith('image/')) return true;
  return SAFE_IMAGE_NAME.test(file.name || '');
}

/** True when the OS / Finder / Explorer is dragging files (vs in-app URL drags). */
export function dataTransferHasImageFiles(dt: DataTransfer | null): boolean {
  if (!dt) return false;
  const types = Array.from(dt.types || []);
  if (types.includes('Files')) return true;
  return !!(dt.files && dt.files.length > 0);
}

/** Image files from a desktop drop (deduped). */
export function imageFilesFromDataTransfer(dt: DataTransfer | null): File[] {
  if (!dt) return [];
  const seen = new Set<string>();
  const out: File[] = [];
  const push = (f: File | null) => {
    if (!f || !isSafeImageFile(f)) return;
    const key = `${f.name}:${f.size}:${f.lastModified}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(f);
  };
  if (dt.files?.length) {
    Array.from(dt.files).forEach(push);
  }
  if (!out.length && dt.items?.length) {
    for (const item of Array.from(dt.items)) {
      if (item.kind === 'file') push(item.getAsFile());
    }
  }
  return out;
}
