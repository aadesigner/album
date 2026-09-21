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
    if (e.type === "image" && e.src) return true;
    if (e.type === "text" && String(e.text || "").trim()) return true;
    if (e.type === "shape") return true;
    return false;
  });
}
