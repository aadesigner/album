/** Offer / notification bar — defaults + sanitizers shared by the site header and admin Settings. */

export const OFFER_BAR_DEFAULTS = {
  enabled: true,
  textAl: 'Çmime më të lira se më parë — oferto speciale për albumin tuaj.',
  textEn: 'Cheaper prices than before — a special offer on your album.',
  buttonAl: 'Fillo tani',
  buttonEn: 'Start now',
  href: '/krijo',
  bg: '#8C3A2E',
  textColor: '#FFF8F2',
  buttonBg: '#FFFFFF',
  buttonText: '#8C3A2E',
} as const;

export interface OfferBarConfig {
  enabled: boolean;
  textAl: string;
  textEn: string;
  buttonAl: string;
  buttonEn: string;
  href: string;
  bg: string;
  textColor: string;
  buttonBg: string;
  buttonText: string;
}

export function sanitizeHexColor(raw: unknown, fallback: string): string {
  const v = String(raw || '').trim();
  if (/^#([0-9a-fA-F]{6})$/.test(v)) return `#${v.slice(1).toUpperCase()}`;
  if (/^#([0-9a-fA-F]{3})$/.test(v)) {
    const r = v[1];
    const g = v[2];
    const b = v[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return fallback;
}

/** Relative site paths only — blocks javascript: and protocol-relative URLs. */
export function safeOfferHref(raw: unknown): string {
  const href = String(raw || '').trim();
  if (href.startsWith('/') && !href.startsWith('//') && !href.toLowerCase().startsWith('/\\')) {
    return href.slice(0, 240) || OFFER_BAR_DEFAULTS.href;
  }
  return OFFER_BAR_DEFAULTS.href;
}

export function parseOfferBar(settings: Record<string, unknown> | null | undefined): OfferBarConfig {
  const s = settings || {};
  const enabledRaw = s.offerBarEnabled;
  return {
    enabled: enabledRaw === undefined || enabledRaw === null ? OFFER_BAR_DEFAULTS.enabled : Boolean(enabledRaw),
    textAl: String(s.offerBarTextAl ?? OFFER_BAR_DEFAULTS.textAl),
    textEn: String(s.offerBarTextEn ?? OFFER_BAR_DEFAULTS.textEn),
    buttonAl: String(s.offerBarButtonAl ?? OFFER_BAR_DEFAULTS.buttonAl),
    buttonEn: String(s.offerBarButtonEn ?? OFFER_BAR_DEFAULTS.buttonEn),
    href: safeOfferHref(s.offerBarHref ?? OFFER_BAR_DEFAULTS.href),
    bg: sanitizeHexColor(s.offerBarBg, OFFER_BAR_DEFAULTS.bg),
    textColor: sanitizeHexColor(s.offerBarTextColor, OFFER_BAR_DEFAULTS.textColor),
    buttonBg: sanitizeHexColor(s.offerBarButtonBg, OFFER_BAR_DEFAULTS.buttonBg),
    buttonText: sanitizeHexColor(s.offerBarButtonText, OFFER_BAR_DEFAULTS.buttonText),
  };
}

export function offerBarCopy(config: OfferBarConfig, lang: 'sq' | 'en'): { text: string; button: string } {
  return lang === 'sq'
    ? { text: config.textAl.trim(), button: config.buttonAl.trim() }
    : { text: config.textEn.trim(), button: config.buttonEn.trim() };
}

function hexToRgb(hex: string): [number, number, number] | null {
  const v = sanitizeHexColor(hex, '');
  if (!v) return null;
  return [
    parseInt(v.slice(1, 3), 16),
    parseInt(v.slice(3, 5), 16),
    parseInt(v.slice(5, 7), 16),
  ];
}

/** Blend two #RRGGBB colors. `amount` 0 = hex, 1 = toward. */
export function mixHex(hex: string, toward: string, amount: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(toward);
  if (!a || !b) return sanitizeHexColor(hex, toward);
  const t = Math.min(1, Math.max(0, amount));
  const ch = (i: number) => Math.round(a[i] + (b[i] - a[i]) * t)
    .toString(16)
    .padStart(2, '0');
  return `#${ch(0)}${ch(1)}${ch(2)}`.toUpperCase();
}

export function offerBarBackground(bg: string): string {
  return `linear-gradient(180deg, ${mixHex(bg, '#FFFFFF', 0.16)} 0%, ${bg} 46%, ${mixHex(bg, '#000000', 0.14)} 100%)`;
}
