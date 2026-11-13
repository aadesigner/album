/** Device-only photo refs — not readable by the print PDF renderer. */
export function isUnresolvedDevicePhotoSrc(src?: string | null): boolean {
  if (!src) return false;
  return /^local-photo:/i.test(src) || /^blob:/i.test(src);
}

/** True when page content has no real user content (ignores bg / empty placeholders). */
export function isPageContentBlank(raw: unknown): boolean {
  let els: unknown = raw;
  if (typeof raw === "string") {
    try {
      els = JSON.parse(raw);
    } catch {
      return true;
    }
  }
  if (!Array.isArray(els) || els.length === 0) return true;
  return !els.some((item) => {
    if (!item || typeof item !== "object") return false;
    const e = item as { type?: string; src?: string; text?: string };
    // local-photo:/blob: look filled in the editor but print as empty sheets.
    if (e.type === "image" && e.src && !isUnresolvedDevicePhotoSrc(e.src)) return true;
    if (e.type === "text" && String(e.text || "").trim()) return true;
    if (e.type === "shape") return true;
    return false;
  });
}

/** True when any image still points at a device-only src the server cannot print. */
export function pageHasUnresolvedDevicePhotos(raw: unknown): boolean {
  let els: unknown = raw;
  if (typeof raw === "string") {
    try {
      els = JSON.parse(raw);
    } catch {
      return false;
    }
  }
  if (!Array.isArray(els)) return false;
  return els.some((item) => {
    if (!item || typeof item !== "object") return false;
    const e = item as { type?: string; src?: string };
    return e.type === "image" && isUnresolvedDevicePhotoSrc(e.src);
  });
}
