import { db } from "@workspace/db-tsconfig";
import { appSettingsTable } from "@workspace/db-tsconfig";

// ── Security & abuse-limit settings ─────────────────────────────────────────
// Every threshold in this file used to be a hardcoded constant. They now live
// in appSettingsTable (admin-editable from Settings → Security & Limits) and
// are read through this short-lived in-memory cache so a settings change
// takes effect within a few seconds without needing an API restart, while
// still avoiding a DB round-trip on every request.

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
  rateLimitGeneralMax: 300,
  rateLimitAuthWindowMs: 15 * 60 * 1000,
  rateLimitAuthMax: 20,
  rateLimitAnalyticsWindowMs: 60 * 1000,
  rateLimitAnalyticsMax: 120,
  rateLimitUploadsWindowMs: 60 * 1000,
  rateLimitUploadsMax: 30,
  loginLockoutThreshold: 5,
  loginLockoutMinutes: 15,
  maxAlbumsPerUser: 20,
  maxPhotosPerAlbum: 300,
  maxOrdersPerDay: 5,
  maxConcurrentPdfGenerations: 3,
  maxUploadFileSizeMb: 20,
  allowedUploadMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
};

// Maps a settings-object key to its appSettingsTable row key. Shared by the
// cache loader here and by the admin GET/PATCH /admin/settings handlers so
// there's a single source of truth for the DB key names.
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

const TTL_MS = 15 * 1000;
let _cache: { data: SecuritySettings; expiresAt: number } | null = null;

/** Call after PATCH /admin/settings writes any of the keys above. */
export function invalidateSecuritySettingsCache(): void {
  _cache = null;
}

export async function getSecuritySettings(): Promise<SecuritySettings> {
  if (_cache && _cache.expiresAt > Date.now()) return _cache.data;

  const rows = await db.select().from(appSettingsTable);
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;

  const data: SecuritySettings = { ...SECURITY_SETTINGS_DEFAULTS };
  for (const key of Object.keys(SECURITY_SETTINGS_KEY_MAP) as (keyof SecuritySettings)[]) {
    const dbKey = SECURITY_SETTINGS_KEY_MAP[key];
    const raw = map[dbKey];
    if (raw === undefined || raw === "") continue;
    if (key === "allowedUploadMimeTypes") {
      const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
      if (list.length > 0) data.allowedUploadMimeTypes = list;
    } else {
      const n = parseInt(raw, 10);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!isNaN(n) && n >= 0) (data as any)[key] = n;
    }
  }

  _cache = { data, expiresAt: Date.now() + TTL_MS };
  return data;
}
