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
