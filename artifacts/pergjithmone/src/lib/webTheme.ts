/** Public site chrome (navbar + footer) — styles & colors admin can switch. */

export type NavStyleId = 'classic' | 'solid' | 'editorial' | 'glass' | 'pills';
export type FooterStyleId = 'classic' | 'light' | 'band' | 'magazine' | 'slim';
export type FillMode = 'solid' | 'gradient';

export interface WebThemeConfig {
  navStyle: NavStyleId;
  footerStyle: FooterStyleId;
  navBgMode: FillMode;
  navBg: string;
  navBgTo: string;
  navText: string;
  navMuted: string;
  navAccent: string;
  navAccentOn: string;
  footerBgMode: FillMode;
  footerBg: string;
  footerBgTo: string;
  footerText: string;
  footerMuted: string;
  footerAccent: string;
}

export const NAV_STYLE_META: Record<NavStyleId, { name: string; blurb: string }> = {
  classic: {
    name: 'Classic paper',
    blurb: 'Light bar, uppercase links, underline active state — the original look.',
  },
  solid: {
    name: 'Bold solid',
    blurb: 'Filled color bar, white type, strong CTA pill.',
  },
  editorial: {
    name: 'Editorial',
    blurb: 'Warm paper, serif wordmark, soft sentence-case links.',
  },
  glass: {
    name: 'Night glass',
    blurb: 'Dark frosted glass, airy links, luminous accent.',
  },
  pills: {
    name: 'Chip rail',
    blurb: 'Floating chip links and a rounded brand capsule.',
  },
};

export const FOOTER_STYLE_META: Record<FooterStyleId, { name: string; blurb: string }> = {
  classic: {
    name: 'Dark spotlight',
    blurb: 'Centered brand, ornamental divider, dark canvas.',
  },
  light: {
    name: 'Soft paper',
    blurb: 'Light columns, ink type, quiet social row.',
  },
  band: {
    name: 'Accent band',
    blurb: 'Gradient strip with compact link row underneath.',
  },
  magazine: {
    name: 'Magazine',
    blurb: 'Huge stacked title, asymmetric columns, cream field.',
  },
  slim: {
    name: 'Slim line',
    blurb: 'One tight row — brand, links, social — no fluff.',
  },
};

export const WEB_THEME_DEFAULTS: WebThemeConfig = {
  navStyle: 'classic',
  footerStyle: 'classic',
  navBgMode: 'solid',
  navBg: '#FFFFFF',
  navBgTo: '#F5F0E8',
  navText: '#1C1916',
  navMuted: '#9A9288',
  navAccent: '#1C1916',
  navAccentOn: '#FFFFFF',
  footerBgMode: 'solid',
  footerBg: '#0D0D0D',
  footerBgTo: '#1A1512',
  footerText: '#FFFFFF',
  footerMuted: 'rgba(255,255,255,0.40)',
  footerAccent: '#C4A574',
};

/** Preset palettes admins can one-click — each pairs with any style. */
export const WEB_THEME_PALETTES: { id: string; name: string; patch: Partial<WebThemeConfig> }[] = [
  {
    id: 'ink',
    name: 'Ink & paper',
    patch: {
      navBgMode: 'solid', navBg: '#FFFFFF', navBgTo: '#F5F0E8',
      navText: '#1C1916', navMuted: '#9A9288', navAccent: '#1C1916', navAccentOn: '#FFFFFF',
      footerBgMode: 'solid', footerBg: '#0D0D0D', footerBgTo: '#1A1512',
      footerText: '#FFFFFF', footerMuted: 'rgba(255,255,255,0.40)', footerAccent: '#C4A574',
    },
  },
  {
    id: 'terracotta',
    name: 'Terracotta',
    patch: {
      navBgMode: 'solid', navBg: '#8C3A2E', navBgTo: '#6B2A21',
      navText: '#FFF8F2', navMuted: 'rgba(255,248,242,0.65)', navAccent: '#FFFFFF', navAccentOn: '#8C3A2E',
      footerBgMode: 'gradient', footerBg: '#5C241C', footerBgTo: '#2A120E',
      footerText: '#FFF8F2', footerMuted: 'rgba(255,248,242,0.45)', footerAccent: '#E8B4A0',
    },
  },
  {
    id: 'forest',
    name: 'Forest dusk',
    patch: {
      navBgMode: 'gradient', navBg: '#1B3A2F', navBgTo: '#0F241C',
      navText: '#E8F0EC', navMuted: 'rgba(232,240,236,0.6)', navAccent: '#A8D5C0', navAccentOn: '#0F241C',
      footerBgMode: 'solid', footerBg: '#0A1A14', footerBgTo: '#122820',
      footerText: '#E8F0EC', footerMuted: 'rgba(232,240,236,0.42)', footerAccent: '#7CB89A',
    },
  },
  {
    id: 'ocean',
    name: 'Aegean',
    patch: {
      navBgMode: 'solid', navBg: '#E8F2F6', navBgTo: '#D0E4EC',
      navText: '#163A4A', navMuted: '#6A8A98', navAccent: '#1E6B86', navAccentOn: '#FFFFFF',
      footerBgMode: 'gradient', footerBg: '#163A4A', footerBgTo: '#0C222C',
      footerText: '#E8F2F6', footerMuted: 'rgba(232,242,246,0.45)', footerAccent: '#7EB8CC',
    },
  },
  {
    id: 'champagne',
    name: 'Champagne',
    patch: {
      navBgMode: 'solid', navBg: '#F7F1E6', navBgTo: '#EDE4D4',
      navText: '#3A3228', navMuted: '#9A8E7E', navAccent: '#8B6914', navAccentOn: '#FFF9F0',
      footerBgMode: 'solid', footerBg: '#2C241C', footerBgTo: '#1A1510',
      footerText: '#F7F1E6', footerMuted: 'rgba(247,241,230,0.45)', footerAccent: '#D4B87A',
    },
  },
];

const NAV_STYLES = new Set<string>(Object.keys(NAV_STYLE_META));
const FOOTER_STYLES = new Set<string>(Object.keys(FOOTER_STYLE_META));

function sanitizeHex(raw: unknown, fallback: string): string {
  const v = String(raw || '').trim();
  if (/^#([0-9a-fA-F]{6})$/.test(v)) return `#${v.slice(1).toUpperCase()}`;
  if (/^#([0-9a-fA-F]{3})$/.test(v)) {
    const r = v[1], g = v[2], b = v[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  // Allow rgba for muted footer text
  if (/^rgba?\(/i.test(v)) return v.slice(0, 64);
  return fallback;
}

function asFillMode(raw: unknown, fallback: FillMode): FillMode {
  return raw === 'gradient' ? 'gradient' : fallback === 'gradient' && raw !== 'solid' ? fallback : 'solid';
}

export function parseWebTheme(raw: unknown): WebThemeConfig {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const navStyle = NAV_STYLES.has(String(src.navStyle)) ? (src.navStyle as NavStyleId) : WEB_THEME_DEFAULTS.navStyle;
  const footerStyle = FOOTER_STYLES.has(String(src.footerStyle))
    ? (src.footerStyle as FooterStyleId)
    : WEB_THEME_DEFAULTS.footerStyle;
  return {
    navStyle,
    footerStyle,
    navBgMode: asFillMode(src.navBgMode, WEB_THEME_DEFAULTS.navBgMode),
    navBg: sanitizeHex(src.navBg, WEB_THEME_DEFAULTS.navBg),
    navBgTo: sanitizeHex(src.navBgTo, WEB_THEME_DEFAULTS.navBgTo),
    navText: sanitizeHex(src.navText, WEB_THEME_DEFAULTS.navText),
    navMuted: sanitizeHex(src.navMuted, WEB_THEME_DEFAULTS.navMuted),
    navAccent: sanitizeHex(src.navAccent, WEB_THEME_DEFAULTS.navAccent),
    navAccentOn: sanitizeHex(src.navAccentOn, WEB_THEME_DEFAULTS.navAccentOn),
    footerBgMode: asFillMode(src.footerBgMode, WEB_THEME_DEFAULTS.footerBgMode),
    footerBg: sanitizeHex(src.footerBg, WEB_THEME_DEFAULTS.footerBg),
    footerBgTo: sanitizeHex(src.footerBgTo, WEB_THEME_DEFAULTS.footerBgTo),
    footerText: sanitizeHex(src.footerText, WEB_THEME_DEFAULTS.footerText),
    footerMuted: sanitizeHex(src.footerMuted, WEB_THEME_DEFAULTS.footerMuted),
    footerAccent: sanitizeHex(src.footerAccent, WEB_THEME_DEFAULTS.footerAccent),
  };
}

export function webThemeFromSettings(settings: Record<string, unknown> | null | undefined): WebThemeConfig {
  if (!settings) return { ...WEB_THEME_DEFAULTS };
  if (settings.webTheme && typeof settings.webTheme === 'object') {
    return parseWebTheme(settings.webTheme);
  }
  return parseWebTheme(settings);
}

export function fillBackground(mode: FillMode, from: string, to: string): string {
  if (mode === 'gradient') return `linear-gradient(135deg, ${from} 0%, ${to} 100%)`;
  return from;
}
