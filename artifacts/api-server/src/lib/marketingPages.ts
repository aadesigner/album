export const PAGE_SLUGS = [
  "home",
  "how-it-works",
  "pricing",
  "examples",
  "about",
  "faq",
  "contact",
] as const;

export type PageSlug = (typeof PAGE_SLUGS)[number];

export function isPageSlug(raw: string): raw is PageSlug {
  return (PAGE_SLUGS as readonly string[]).includes(raw);
}

export function pageSettingKey(slug: PageSlug): string {
  return `page_content_${slug.replace(/-/g, "_")}`;
}

/** Never let seed/settings overwrite visual-editor JSON. */
export function isPageContentSettingKey(key: string): boolean {
  return key.startsWith("page_content_");
}

export function isEmptyPageContent(value: unknown): boolean {
  return !value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value as Record<string, unknown>).length === 0;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function looksBilingual(v: Record<string, unknown>): boolean {
  return typeof v.sq === "string" || typeof v.en === "string";
}

function looksImage(v: Record<string, unknown>): boolean {
  return typeof v.src === "string";
}

/**
 * Overlay a new save on top of the previously stored JSON.
 * Incoming wins, but empty objects / blank bilingual pairs / empty image
 * URLs / empty arrays cannot wipe earlier edits (including across deploys).
 */
export function overlayStoredPageContent(
  previous: unknown,
  incoming: unknown,
): Record<string, unknown> {
  const next = overlayValue(previous, incoming);
  return isPlainObject(next) ? next : {};
}

function overlayValue(previous: unknown, incoming: unknown): unknown {
  if (incoming == null) return previous ?? incoming;

  if (Array.isArray(incoming)) {
    if (incoming.length === 0 && Array.isArray(previous) && previous.length > 0) {
      return previous;
    }
    if (Array.isArray(previous)) {
      return incoming.map((item, i) => overlayValue(previous[i], item));
    }
    return incoming;
  }

  if (isPlainObject(incoming)) {
    const prevObj = isPlainObject(previous) ? previous : {};

    if (looksBilingual(incoming) && (looksBilingual(prevObj) || Object.keys(prevObj).length === 0)) {
      const sq = typeof incoming.sq === "string" ? incoming.sq : "";
      const en = typeof incoming.en === "string" ? incoming.en : "";
      if (!sq.trim() && !en.trim()) {
        return Object.keys(prevObj).length ? prevObj : incoming;
      }
    }

    if (looksImage(incoming)) {
      const src = typeof incoming.src === "string" ? incoming.src : "";
      if (!src.trim()) {
        const prevSrc = typeof prevObj.src === "string" ? prevObj.src : "";
        if (prevSrc.trim()) return { ...prevObj };
      }
    }

    const keys = new Set([...Object.keys(prevObj), ...Object.keys(incoming)]);
    const out: Record<string, unknown> = {};
    for (const k of keys) {
      if (k in incoming) out[k] = overlayValue(prevObj[k], incoming[k]);
      else out[k] = prevObj[k];
    }
    return out;
  }

  if (typeof incoming === "string" && !incoming.trim()
      && typeof previous === "string" && previous.trim()) {
    return previous;
  }
  return incoming;
}

const MAX_CHARS = 400_000;
const MAX_STRING = 8000;
const MAX_ARRAY = 40;
const MAX_DEPTH = 8;

function isPoisonKey(k: string): boolean {
  return k === "__proto__" || k === "constructor" || k === "prototype";
}

export function sanitizePageContent(raw: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return undefined;
  if (raw == null) return null;
  if (typeof raw === "string") return raw.slice(0, MAX_STRING);
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "boolean") return raw;
  if (Array.isArray(raw)) {
    return raw.slice(0, MAX_ARRAY).map((item) => sanitizePageContent(item, depth + 1));
  }
  if (typeof raw === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (isPoisonKey(k)) continue;
      if (!/^[a-zA-Z0-9_-]{1,64}$/.test(k)) continue;
      const next = sanitizePageContent(v, depth + 1);
      if (next !== undefined) out[k] = next;
    }
    return out;
  }
  return undefined;
}

export function parseStoredPageContent(raw: string | undefined | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    const clean = sanitizePageContent(parsed);
    return clean && typeof clean === "object" && !Array.isArray(clean)
      ? (clean as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function stringifyPageContent(content: unknown): string {
  const json = JSON.stringify(content ?? {});
  if (json.length > MAX_CHARS) {
    throw new Error("Page content is too large to save.");
  }
  return json;
}
