/** Microsoft Clarity helpers (public + album builder only — never admin). */

export type ClaritySettings = {
  clarityEnabled?: boolean;
  clarityProjectId?: string;
};

const STATIC_PATHS = new Set([
  '/',
  '/shembuj',
  '/rreth-nesh',
  '/kontakt',
  '/si-funksionon',
  '/faq',
  '/terms',
  '/privacy',
  '/cmime',
]);

const BUILDER_PATHS = new Set([
  '/krijo',
  '/album-ai',
]);

/** True when Clarity is allowed on this SPA path. */
export function shouldLoadClarity(pathname: string): boolean {
  const path = (pathname.split('?')[0] || '/').replace(/\/+$/, '') || '/';
  if (path === '/heyadmin' || path.startsWith('/heyadmin/')) return false;
  if (STATIC_PATHS.has(path)) return true;
  if (BUILDER_PATHS.has(path)) return true;
  if (path.startsWith('/editor/')) return true;
  return false;
}

export function clarityIsConfigured(settings?: ClaritySettings | null): boolean {
  const id = String(settings?.clarityProjectId || '').trim();
  return !!settings?.clarityEnabled && /^[A-Za-z0-9_-]{6,32}$/.test(id);
}

export function extractClarityProjectId(raw: unknown): string {
  const text = String(raw ?? '').trim();
  if (!text) return '';
  if (/^[A-Za-z0-9_-]{6,32}$/.test(text)) return text;
  const fromTag = text.match(/clarity\.ms\/tag\/([A-Za-z0-9_-]+)/i);
  if (fromTag?.[1]) return fromTag[1];
  const fromInit = text.match(/["']clarity["']\s*,\s*["']script["']\s*,\s*["']([A-Za-z0-9_-]+)["']/i);
  if (fromInit?.[1]) return fromInit[1];
  return '';
}

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

let injectedId: string | null = null;

function injectClarityScript(projectId: string) {
  if (typeof document === 'undefined') return;
  if (injectedId === projectId) return;
  // Avoid duplicate tags if settings change id.
  const existing = document.querySelector(`script[data-clarity-id="${projectId}"]`);
  if (existing) {
    injectedId = projectId;
    return;
  }
  (function (c: Window, l: Document, a: string, r: string, i: string) {
    const w = c as Window & Record<string, any>;
    w[a] = w[a] || function (...args: unknown[]) {
      (w[a].q = w[a].q || []).push(args);
    };
    const t = l.createElement(r) as HTMLScriptElement;
    t.async = true;
    t.src = `https://www.clarity.ms/tag/${i}`;
    t.dataset.clarityId = i;
    const y = l.getElementsByTagName(r)[0];
    y?.parentNode?.insertBefore(t, y);
  })(window, document, 'clarity', 'script', projectId);
  injectedId = projectId;
}

/** Start Clarity when allowed; pause collection on admin / account routes. */
export function syncMicrosoftClarity(opts: {
  pathname: string;
  settings?: ClaritySettings | null;
}) {
  if (typeof window === 'undefined') return;
  const allowed = shouldLoadClarity(opts.pathname);
  const ready = clarityIsConfigured(opts.settings);
  const id = String(opts.settings?.clarityProjectId || '').trim();

  if (allowed && ready) {
    injectClarityScript(id);
    try {
      window.clarity?.('consent', true);
      window.clarity?.('set', 'page', opts.pathname);
    } catch { /* ignore */ }
    return;
  }

  // Excluded route (admin, auth, account) or disabled — stop collecting.
  try {
    window.clarity?.('consent', false);
  } catch { /* ignore */ }
}

/** Test helper */
export function resetClarityInjectionForTests() {
  injectedId = null;
}
