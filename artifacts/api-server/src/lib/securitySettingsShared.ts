export interface SecuritySettings {
  rateLimitGeneralWindowMs: number;
  rateLimitGeneralMax: number;
  rateLimitAuthWindowMs: number;
  rateLimitAuthMax: number;
  rateLimitAnalyticsWindowMs: number;
  rateLimitAnalyticsMax: number;
  rateLimitUploadsWindowMs: number;
  rateLimitUploadsMax: number;
  loginLockoutThreshold: number;
  loginLockoutMinutes: number;
  maxAlbumsPerUser: number;
  maxPhotosPerAlbum: number;
  maxOrdersPerDay: number;
  maxConcurrentPdfGenerations: number;
  maxUploadFileSizeMb: number;
  allowedUploadMimeTypes: string[];
}

export const SECURITY_SETTINGS_DEFAULTS: SecuritySettings = {
  rateLimitGeneralWindowMs: 15 * 60 * 1000,
  rateLimitGeneralMax: 8000,
  rateLimitAuthWindowMs: 15 * 60 * 1000,
  rateLimitAuthMax: 120,
  rateLimitAnalyticsWindowMs: 60 * 1000,
  rateLimitAnalyticsMax: 400,
  rateLimitUploadsWindowMs: 60 * 1000,
  rateLimitUploadsMax: 180,
  loginLockoutThreshold: 10,
  loginLockoutMinutes: 5,
  maxAlbumsPerUser: 50,
  maxPhotosPerAlbum: 500,
  maxOrdersPerDay: 15,
  maxConcurrentPdfGenerations: 6,
  maxUploadFileSizeMb: 25,
  allowedUploadMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/avif",
  ],
};

const SECURITY_NUMBER_FLOOR: Partial<Record<keyof SecuritySettings, number>> = {
  rateLimitGeneralWindowMs: 60_000,
  rateLimitGeneralMax: 200,
  rateLimitAuthWindowMs: 60_000,
  rateLimitAuthMax: 20,
  rateLimitAnalyticsWindowMs: 10_000,
  rateLimitAnalyticsMax: 60,
  rateLimitUploadsWindowMs: 10_000,
  rateLimitUploadsMax: 20,
  loginLockoutThreshold: 5,
  loginLockoutMinutes: 1,
  maxAlbumsPerUser: 1,
  maxPhotosPerAlbum: 10,
  maxOrdersPerDay: 1,
  maxConcurrentPdfGenerations: 1,
  maxUploadFileSizeMb: 1,
};

/** Floors so a typo of 0 cannot 429 every visitor. */
export function clampSecurityNumber(key: keyof SecuritySettings, n: number): number {
  const fallback = SECURITY_SETTINGS_DEFAULTS[key];
  if (typeof fallback !== "number" || !Number.isFinite(n)) return fallback as number;
  const floor = SECURITY_NUMBER_FLOOR[key] ?? 1;
  if (n < floor) return fallback;
  return n;
}

const MIME_ALIASES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  "image/jpg": "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heic",
  "image/heif": "image/heic",
  avif: "image/avif",
  tiff: "image/tiff",
  tif: "image/tiff",
  bmp: "image/bmp",
};

/** JSON arrays, comma lists, or the leftover `"["image/jpeg"` tokens from a bad split. */
export function parseStringList(raw: unknown): string[] {
  let parts: string[] = [];
  if (Array.isArray(raw)) {
    parts = raw.map((v) => String(v ?? ""));
  } else if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        let parsed: unknown = JSON.parse(trimmed);
        if (typeof parsed === "string") {
          try { parsed = JSON.parse(parsed); } catch { /* keep */ }
        }
        if (Array.isArray(parsed)) parts = parsed.map((v) => String(v ?? ""));
        else parts = trimmed.split(",");
      } catch {
        parts = trimmed.split(",");
      }
    } else {
      parts = trimmed.split(",");
    }
  }
  const out: string[] = [];
  for (const part of parts) {
    const token = part
      .trim()
      .replace(/^\[+\s*/, "")
      .replace(/\s*\]+$/, "")
      .replace(/^["']+|["']+$/g, "")
      .trim();
    if (token) out.push(token);
  }
  return out;
}

export function parseJsonArray(raw: string | undefined | null): unknown[] {
  if (raw == null) return [];
  const trimmed = String(raw).trim();
  if (!trimmed) return [];
  try {
    let parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed === "string") {
      try { parsed = JSON.parse(parsed); } catch { /* keep string */ }
    }
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseJsonObject(raw: string | undefined | null): Record<string, unknown> {
  if (raw == null) return {};
  const trimmed = String(raw).trim();
  if (!trimmed) return {};
  try {
    let parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed === "string") {
      try { parsed = JSON.parse(parsed); } catch { /* keep */ }
    }
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

/**
 * Admin Settings used to JSON.stringify this array, then the uploader split
 * on commas — `["image/jpeg"]` never matched `image/jpeg`.
 */
export function parseAllowedUploadMimeTypes(raw: unknown): string[] {
  const out: string[] = [];
  for (const part of parseStringList(raw)) {
    const token = part.toLowerCase();
    if (!token) continue;
    out.push(MIME_ALIASES[token] || token);
  }
  return out.length > 0 ? [...new Set(out)] : [...SECURITY_SETTINGS_DEFAULTS.allowedUploadMimeTypes];
}

/** Always a comma list in Postgres — never a JSON array. */
export function serializeAllowedUploadMimeTypes(raw: unknown): string {
  return parseAllowedUploadMimeTypes(raw).join(", ");
}

export const JSON_SETTING_JS_KEYS = new Set([
  "hiddenDesignIds",
  "designOverrides",
  "customDesigns",
  "adminNotes",
]);

export const SECURITY_SETTINGS_KEY_MAP: Record<keyof SecuritySettings, string> = {
  rateLimitGeneralWindowMs: "rate_limit_general_window_ms",
  rateLimitGeneralMax: "rate_limit_general_max",
  rateLimitAuthWindowMs: "rate_limit_auth_window_ms",
  rateLimitAuthMax: "rate_limit_auth_max",
  rateLimitAnalyticsWindowMs: "rate_limit_analytics_window_ms",
  rateLimitAnalyticsMax: "rate_limit_analytics_max",
  rateLimitUploadsWindowMs: "rate_limit_uploads_window_ms",
  rateLimitUploadsMax: "rate_limit_uploads_max",
  loginLockoutThreshold: "login_lockout_threshold",
  loginLockoutMinutes: "login_lockout_minutes",
  maxAlbumsPerUser: "max_albums_per_user",
  maxPhotosPerAlbum: "max_photos_per_album",
  maxOrdersPerDay: "max_orders_per_day",
  maxConcurrentPdfGenerations: "max_concurrent_pdf_generations",
  maxUploadFileSizeMb: "max_upload_file_size_mb",
  allowedUploadMimeTypes: "allowed_upload_mime_types",
};
