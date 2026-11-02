/** Public navbar/footer theme stored as JSON in app_settings.web_theme */

const NAV_STYLES = new Set(["classic", "solid", "editorial", "glass", "pills"]);
const FOOTER_STYLES = new Set(["classic", "light", "band", "magazine", "slim"]);

export const WEB_THEME_DEFAULTS = {
  navStyle: "classic",
  footerStyle: "classic",
  navBgMode: "solid",
  navBg: "#FFFFFF",
  navBgTo: "#F5F0E8",
  navText: "#1C1916",
  navMuted: "#9A9288",
  navAccent: "#1C1916",
  navAccentOn: "#FFFFFF",
  footerBgMode: "solid",
  footerBg: "#0D0D0D",
  footerBgTo: "#1A1512",
  footerText: "#FFFFFF",
  footerMuted: "rgba(255,255,255,0.40)",
  footerAccent: "#C4A574",
} as const;

function sanitizeHex(raw: unknown, fallback: string): string {
  const v = String(raw || "").trim();
  if (/^#([0-9a-fA-F]{6})$/.test(v)) return `#${v.slice(1).toUpperCase()}`;
  if (/^#([0-9a-fA-F]{3})$/.test(v)) {
    const r = v[1];
    const g = v[2];
    const b = v[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  if (/^rgba?\(/i.test(v)) return v.slice(0, 64);
  return fallback;
}

function asMode(raw: unknown, fallback: string): "solid" | "gradient" {
  return raw === "gradient" ? "gradient" : "solid";
}

export function parseWebTheme(raw: unknown): typeof WEB_THEME_DEFAULTS & Record<string, string> {
  let src: Record<string, unknown> = {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") src = parsed as Record<string, unknown>;
    } catch {
      src = {};
    }
  } else if (raw && typeof raw === "object") {
    src = raw as Record<string, unknown>;
  }

  const navStyle = NAV_STYLES.has(String(src.navStyle)) ? String(src.navStyle) : WEB_THEME_DEFAULTS.navStyle;
  const footerStyle = FOOTER_STYLES.has(String(src.footerStyle))
    ? String(src.footerStyle)
    : WEB_THEME_DEFAULTS.footerStyle;

  return {
    navStyle,
    footerStyle,
    navBgMode: asMode(src.navBgMode, WEB_THEME_DEFAULTS.navBgMode),
    navBg: sanitizeHex(src.navBg, WEB_THEME_DEFAULTS.navBg),
    navBgTo: sanitizeHex(src.navBgTo, WEB_THEME_DEFAULTS.navBgTo),
    navText: sanitizeHex(src.navText, WEB_THEME_DEFAULTS.navText),
    navMuted: sanitizeHex(src.navMuted, WEB_THEME_DEFAULTS.navMuted),
    navAccent: sanitizeHex(src.navAccent, WEB_THEME_DEFAULTS.navAccent),
    navAccentOn: sanitizeHex(src.navAccentOn, WEB_THEME_DEFAULTS.navAccentOn),
    footerBgMode: asMode(src.footerBgMode, WEB_THEME_DEFAULTS.footerBgMode),
    footerBg: sanitizeHex(src.footerBg, WEB_THEME_DEFAULTS.footerBg),
    footerBgTo: sanitizeHex(src.footerBgTo, WEB_THEME_DEFAULTS.footerBgTo),
    footerText: sanitizeHex(src.footerText, WEB_THEME_DEFAULTS.footerText),
    footerMuted: sanitizeHex(src.footerMuted, WEB_THEME_DEFAULTS.footerMuted),
    footerAccent: sanitizeHex(src.footerAccent, WEB_THEME_DEFAULTS.footerAccent),
  };
}

export function readWebThemeSettings(map: Record<string, string>) {
  return { webTheme: parseWebTheme(map["web_theme"]) };
}

export function normalizeWebThemeWrite(raw: unknown): string {
  return JSON.stringify(parseWebTheme(raw));
}
