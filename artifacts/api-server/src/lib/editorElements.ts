export const EDITOR_ELEMENTS_MAX = 120;

export type EditorElementAsset = {
  id: string;
  src: string;
  name: string;
};

function isSafeAssetSrc(src: string): boolean {
  const s = src.trim();
  if (!s || s.length > 2000) return false;
  const lower = s.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) {
    return false;
  }
  return true;
}

export function parseEditorElements(raw: unknown): EditorElementAsset[] {
  let list: unknown = raw;
  if (typeof list === "string") {
    try { list = JSON.parse(list); } catch { return []; }
  }
  if (!Array.isArray(list)) return [];
  const out: EditorElementAsset[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const src = typeof rec.src === "string" ? rec.src.trim() : "";
    if (!isSafeAssetSrc(src)) continue;
    let id = typeof rec.id === "string" ? rec.id.trim() : "";
    if (!id) id = `el-${out.length + 1}`;
    if (seen.has(id)) id = `${id}-${out.length}`;
    seen.add(id);
    const name = typeof rec.name === "string" ? rec.name.trim().slice(0, 80) : "";
    out.push({ id, src, name });
    if (out.length >= EDITOR_ELEMENTS_MAX) break;
  }
  return out;
}
