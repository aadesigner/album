/** Marketing-page CMS: typed bilingual JSON merged over hardcoded defaults. */

export const PAGE_SLUGS = [
  'home',
  'how-it-works',
  'pricing',
  'examples',
  'about',
  'faq',
  'contact',
] as const;

export type PageSlug = (typeof PAGE_SLUGS)[number];

export const PAGE_META: Array<{ slug: PageSlug; label: string; path: string }> = [
  { slug: 'home', label: 'Homepage', path: '/' },
  { slug: 'how-it-works', label: 'How it works', path: '/si-funksionon' },
  { slug: 'pricing', label: 'Pricing', path: '/cmime' },
  { slug: 'examples', label: 'Examples', path: '/shembuj' },
  { slug: 'about', label: 'About', path: '/rreth-nesh' },
  { slug: 'faq', label: 'FAQ', path: '/faq' },
  { slug: 'contact', label: 'Contact', path: '/kontakt' },
];

export function isPageSlug(raw: string): raw is PageSlug {
  return (PAGE_SLUGS as readonly string[]).includes(raw);
}

export function pageSettingKey(slug: PageSlug): string {
  return `page_content_${slug.replace(/-/g, '_')}`;
}

export async function fetchPublishedPage(slug: PageSlug): Promise<{ content: unknown; updatedAt?: string | null }> {
  const r = await fetch(`/api/pages/${slug}`, { credentials: 'include' });
  if (!r.ok) throw new Error(`Failed to load page (${r.status})`);
  const body = await r.json().catch(() => ({}));
  return { content: body.content ?? {}, updatedAt: body.updatedAt ?? null };
}

export type BiText = {
  sq: string;
  en: string;
  font?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  align?: 'left' | 'center' | 'right';
  space?: 'sm' | 'md' | 'lg';
};

export type ImgRef = { src: string };

export type FieldKind = 'text' | 'image' | 'slider' | 'section';

export function bi(sq: string, en: string): BiText {
  return { sq, en };
}

export function img(src: string): ImgRef {
  return { src };
}

export function isBiText(v: unknown): v is BiText {
  return !!v && typeof v === 'object' && !Array.isArray(v)
    && typeof (v as BiText).sq === 'string'
    && typeof (v as BiText).en === 'string';
}

export function isImgRef(v: unknown): v is ImgRef {
  return !!v && typeof v === 'object' && !Array.isArray(v)
    && typeof (v as ImgRef).src === 'string';
}

const STYLE_KEYS = ['font', 'size', 'align', 'space'] as const;

export function getAt(obj: unknown, path: string): unknown {
  const parts = path.split('.').filter(Boolean);
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

export function setAt<T>(obj: T, path: string, value: unknown): T {
  const parts = path.split('.').filter(Boolean);
  if (!parts.length) return value as T;
  const [head, ...rest] = parts;
  const base = obj as Record<string, unknown> | unknown[];
  const clone: Record<string, unknown> | unknown[] = Array.isArray(base)
    ? [...base]
    : { ...(base as Record<string, unknown> || {}) };
  if (!rest.length) {
    if (Array.isArray(clone) && /^\d+$/.test(head)) clone[Number(head)] = value;
    else (clone as Record<string, unknown>)[head] = value;
    return clone as T;
  }
  const nextDefault = Array.isArray(base)
    ? (base as unknown[])[Number(head)]
    : (base as Record<string, unknown>)?.[head];
  const childSeed = nextDefault ?? (/^\d+$/.test(rest[0]) ? [] : {});
  const child = setAt(childSeed, rest.join('.'), value);
  if (Array.isArray(clone) && /^\d+$/.test(head)) clone[Number(head)] = child;
  else (clone as Record<string, unknown>)[head] = child;
  return clone as T;
}

export function txt(content: unknown, path: string, lang: 'sq' | 'en'): string {
  const v = getAt(content, path);
  if (isBiText(v)) return v[lang] || v.sq || v.en || '';
  if (typeof v === 'string') return v;
  return '';
}

export function imgSrc(content: unknown, path: string, fallback = ''): string {
  const v = getAt(content, path);
  if (isImgRef(v) && v.src) return v.src;
  if (typeof v === 'string') return v;
  return fallback;
}

export function listAt<T = unknown>(content: unknown, path: string): T[] {
  const v = getAt(content, path);
  return Array.isArray(v) ? (v as T[]) : [];
}

export function hiddenAt(content: unknown, path: string): boolean {
  const v = getAt(content, path);
  if (v && typeof v === 'object' && !Array.isArray(v) && (v as { hidden?: unknown }).hidden === true) {
    return true;
  }
  return false;
}

const SIZE_CLASS: Record<string, string> = {
  sm: 'text-[0.92em]',
  md: '',
  lg: 'text-[1.12em]',
  xl: 'text-[1.28em]',
};

const SPACE_PAD: Record<string, string> = {
  sm: 'py-12 md:py-16',
  md: 'py-16 md:py-24',
  lg: 'py-24 md:py-32',
};

export function textStyle(content: unknown, path: string): {
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
} {
  const v = getAt(content, path);
  if (!isBiText(v)) return {};
  const style: { fontFamily?: string; textAlign?: 'left' | 'center' | 'right' } = {};
  if (v.font) style.fontFamily = v.font;
  if (v.align) style.textAlign = v.align;
  return style;
}

export function textSizeClass(content: unknown, path: string): string {
  const v = getAt(content, path);
  if (!isBiText(v) || !v.size) return '';
  return SIZE_CLASS[v.size] || '';
}

export function spaceClass(content: unknown, path: string, fallback = ''): string {
  const v = getAt(content, path);
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const space = (v as BiText).space;
    if (space && SPACE_PAD[space]) return SPACE_PAD[space];
  }
  return fallback;
}

export function mergePageContent<T>(defaults: T, saved: unknown): T {
  if (saved == null) return defaults;

  if (Array.isArray(defaults)) {
    if (!Array.isArray(saved) || saved.length === 0) return defaults;
    const template = defaults[0];
    return saved.map((item, i) =>
      mergePageContent(defaults[i] ?? template, item),
    ) as T;
  }

  if (isBiText(defaults)) {
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return defaults;
    const s = saved as Record<string, unknown>;
    const out: BiText = { ...defaults };
    const sq = typeof s.sq === 'string' ? s.sq : out.sq;
    const en = typeof s.en === 'string' ? s.en : out.en;
    // Both empty = treat as "not set" so a bad/blank save cannot wipe copy.
    if (sq.trim() || en.trim()) {
      if (typeof s.sq === 'string') out.sq = s.sq;
      if (typeof s.en === 'string') out.en = s.en;
    }
    for (const k of STYLE_KEYS) {
      if (typeof s[k] === 'string' && s[k]) (out as Record<string, string>)[k] = s[k] as string;
    }
    return out as T;
  }

  if (isImgRef(defaults)) {
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return defaults;
    const src = (saved as ImgRef).src;
    return { src: typeof src === 'string' && src.trim() ? src : defaults.src } as T;
  }

  if (defaults && typeof defaults === 'object') {
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return defaults;
    const s = saved as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(defaults as Record<string, unknown>)) {
      out[k] = k in s ? mergePageContent(v, s[k]) : v;
    }
    if (typeof s.hidden === 'boolean') out.hidden = s.hidden;
    if (typeof s.space === 'string' && SPACE_PAD[s.space]) out.space = s.space;
    return out as T;
  }

  return (saved === undefined ? defaults : saved) as T;
}

export const MAX_PAGE_JSON_CHARS = 400_000;
export const MAX_PAGE_STRING = 8000;
export const MAX_PAGE_ARRAY = 40;
export const MAX_PAGE_DEPTH = 8;

function isPoisonKey(k: string): boolean {
  return k === '__proto__' || k === 'constructor' || k === 'prototype';
}

/** Server-safe JSON: drop prototype keys, cap size/depth. */
export function sanitizePageContent(raw: unknown, depth = 0): unknown {
  if (depth > MAX_PAGE_DEPTH) return undefined;
  if (raw == null) return null;
  if (typeof raw === 'string') return raw.slice(0, MAX_PAGE_STRING);
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'boolean') return raw;
  if (Array.isArray(raw)) {
    return raw.slice(0, MAX_PAGE_ARRAY).map((item) => sanitizePageContent(item, depth + 1));
  }
  if (typeof raw === 'object') {
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

export function stringifyPageContent(content: unknown): string {
  const json = JSON.stringify(content ?? {});
  if (json.length > MAX_PAGE_JSON_CHARS) {
    throw new Error('Page content is too large to save.');
  }
  return json;
}

/** Sanitize + merge with defaults so a save never persists a blanked page. */
export function preparePageContentForSave(
  defaults: Record<string, unknown>,
  draft: unknown,
): Record<string, unknown> {
  const clean = sanitizePageContent(draft);
  const merged = mergePageContent(defaults, clean);
  stringifyPageContent(merged);
  return merged as Record<string, unknown>;
}
