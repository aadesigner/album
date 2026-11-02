/** Microsoft Clarity — stored in app_settings, loaded on public + builder pages only. */

export const CLARITY_DEFAULTS = {
  clarityEnabled: false,
  clarityProjectId: "",
} as const;

export const CLARITY_KEY_MAP: Record<keyof typeof CLARITY_DEFAULTS, string> = {
  clarityEnabled: "clarity_enabled",
  clarityProjectId: "clarity_project_id",
};

/** Extract a Clarity project id from a bare id or a pasted embed snippet. */
export function sanitizeClarityProjectId(raw: unknown): string {
  const text = String(raw ?? "").trim();
  if (!text) return "";
  // Bare id: Clarity ids are short alphanumeric (often 8–12 chars).
  if (/^[A-Za-z0-9_-]{6,32}$/.test(text)) return text;
  const fromTag = text.match(/clarity\.ms\/tag\/([A-Za-z0-9_-]+)/i);
  if (fromTag?.[1]) return fromTag[1];
  const fromInit = text.match(/["']clarity["']\s*,\s*["']script["']\s*,\s*["']([A-Za-z0-9_-]+)["']/i);
  if (fromInit?.[1]) return fromInit[1];
  const fromClarity = text.match(/clarity\s*\(\s*["']([A-Za-z0-9_-]{6,32})["']\s*\)/i);
  if (fromClarity?.[1]) return fromClarity[1];
  // Last resort: first token that looks like an id
  const token = text.match(/\b([A-Za-z0-9_-]{6,32})\b/);
  return token?.[1] || "";
}

export function normalizeClarityWrite(jsKey: string, raw: unknown): string | null {
  if (jsKey === "clarityEnabled") return raw === true || raw === "true" ? "true" : "false";
  if (jsKey === "clarityProjectId") return sanitizeClarityProjectId(raw);
  return null;
}

export function readClaritySettings(map: Record<string, string>) {
  return {
    // Raw toggle — client only injects when this is true AND project id is set.
    clarityEnabled: map[CLARITY_KEY_MAP.clarityEnabled] === "true",
    clarityProjectId: sanitizeClarityProjectId(map[CLARITY_KEY_MAP.clarityProjectId] || ""),
  };
}
