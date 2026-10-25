/** Offer / notification bar stored in app_settings. */

export const OFFER_BAR_DEFAULTS = {
  offerBarEnabled: true,
  offerBarTextAl: "Çmime më të lira se më parë — oferto speciale për albumin tuaj.",
  offerBarTextEn: "Cheaper prices than before — a special offer on your album.",
  offerBarButtonAl: "Fillo tani",
  offerBarButtonEn: "Start now",
  offerBarHref: "/krijo",
  offerBarBg: "#8C3A2E",
  offerBarTextColor: "#FFF8F2",
  offerBarButtonBg: "#FFFFFF",
  offerBarButtonText: "#8C3A2E",
} as const;

export const OFFER_BAR_KEY_MAP: Record<keyof typeof OFFER_BAR_DEFAULTS, string> = {
  offerBarEnabled: "offer_bar_enabled",
  offerBarTextAl: "offer_bar_text_al",
  offerBarTextEn: "offer_bar_text_en",
  offerBarButtonAl: "offer_bar_button_al",
  offerBarButtonEn: "offer_bar_button_en",
  offerBarHref: "offer_bar_href",
  offerBarBg: "offer_bar_bg",
  offerBarTextColor: "offer_bar_text_color",
  offerBarButtonBg: "offer_bar_button_bg",
  offerBarButtonText: "offer_bar_button_text",
};

function sanitizeHex(raw: string | undefined, fallback: string): string {
  const v = String(raw || "").trim();
  if (/^#([0-9a-fA-F]{6})$/.test(v)) return `#${v.slice(1).toUpperCase()}`;
  if (/^#([0-9a-fA-F]{3})$/.test(v)) {
    const r = v[1];
    const g = v[2];
    const b = v[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return fallback;
}

function sanitizeHref(raw: string | undefined): string {
  const href = String(raw || "").trim();
  if (href.startsWith("/") && !href.startsWith("//")) return href.slice(0, 240) || OFFER_BAR_DEFAULTS.offerBarHref;
  return OFFER_BAR_DEFAULTS.offerBarHref;
}

export function normalizeOfferBarWrite(jsKey: string, raw: unknown): string | null {
  if (jsKey === "offerBarHref") return sanitizeHref(typeof raw === "string" ? raw : String(raw ?? ""));
  if (
    jsKey === "offerBarBg"
    || jsKey === "offerBarTextColor"
    || jsKey === "offerBarButtonBg"
    || jsKey === "offerBarButtonText"
  ) {
    const fallback =
      jsKey === "offerBarBg" ? OFFER_BAR_DEFAULTS.offerBarBg :
      jsKey === "offerBarTextColor" ? OFFER_BAR_DEFAULTS.offerBarTextColor :
      jsKey === "offerBarButtonBg" ? OFFER_BAR_DEFAULTS.offerBarButtonBg :
      OFFER_BAR_DEFAULTS.offerBarButtonText;
    return sanitizeHex(typeof raw === "string" ? raw : String(raw ?? ""), fallback);
  }
  if (jsKey === "offerBarEnabled") return raw === true || raw === "true" ? "true" : "false";
  if (
    jsKey === "offerBarTextAl"
    || jsKey === "offerBarTextEn"
    || jsKey === "offerBarButtonAl"
    || jsKey === "offerBarButtonEn"
  ) {
    return String(raw ?? "").slice(0, 240);
  }
  return null;
}

export function readOfferBarSettings(map: Record<string, string>) {
  return {
    offerBarEnabled: map[OFFER_BAR_KEY_MAP.offerBarEnabled] !== "false",
    offerBarTextAl: map[OFFER_BAR_KEY_MAP.offerBarTextAl] || OFFER_BAR_DEFAULTS.offerBarTextAl,
    offerBarTextEn: map[OFFER_BAR_KEY_MAP.offerBarTextEn] || OFFER_BAR_DEFAULTS.offerBarTextEn,
    offerBarButtonAl: map[OFFER_BAR_KEY_MAP.offerBarButtonAl] || OFFER_BAR_DEFAULTS.offerBarButtonAl,
    offerBarButtonEn: map[OFFER_BAR_KEY_MAP.offerBarButtonEn] || OFFER_BAR_DEFAULTS.offerBarButtonEn,
    offerBarHref: sanitizeHref(map[OFFER_BAR_KEY_MAP.offerBarHref] || OFFER_BAR_DEFAULTS.offerBarHref),
    offerBarBg: sanitizeHex(map[OFFER_BAR_KEY_MAP.offerBarBg], OFFER_BAR_DEFAULTS.offerBarBg),
    offerBarTextColor: sanitizeHex(map[OFFER_BAR_KEY_MAP.offerBarTextColor], OFFER_BAR_DEFAULTS.offerBarTextColor),
    offerBarButtonBg: sanitizeHex(map[OFFER_BAR_KEY_MAP.offerBarButtonBg], OFFER_BAR_DEFAULTS.offerBarButtonBg),
    offerBarButtonText: sanitizeHex(map[OFFER_BAR_KEY_MAP.offerBarButtonText], OFFER_BAR_DEFAULTS.offerBarButtonText),
  };
}
