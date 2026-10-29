import { db } from "@workspace/db-tsconfig";
import { appSettingsTable } from "@workspace/db-tsconfig";
import {
  SECURITY_SETTINGS_DEFAULTS,
  SECURITY_SETTINGS_KEY_MAP,
  clampSecurityNumber,
  parseAllowedUploadMimeTypes,
  type SecuritySettings,
} from "./securitySettingsShared";

export {
  SECURITY_SETTINGS_DEFAULTS,
  SECURITY_SETTINGS_KEY_MAP,
  clampSecurityNumber,
  parseAllowedUploadMimeTypes,
  type SecuritySettings,
};

const TTL_MS = 15 * 1000;
let _cache: { data: SecuritySettings; expiresAt: number } | null = null;

/** Call after PATCH /admin/settings writes any of the keys above. */
export function invalidateSecuritySettingsCache(): void {
  _cache = null;
}

export async function getSecuritySettings(): Promise<SecuritySettings> {
  if (_cache && _cache.expiresAt > Date.now()) return _cache.data;

  try {
    const rows = await db.select().from(appSettingsTable);
    const map: Record<string, string> = {};
    for (const row of rows) map[row.key] = row.value;

    const data: SecuritySettings = { ...SECURITY_SETTINGS_DEFAULTS };
    for (const key of Object.keys(SECURITY_SETTINGS_KEY_MAP) as (keyof SecuritySettings)[]) {
      const dbKey = SECURITY_SETTINGS_KEY_MAP[key];
      const raw = map[dbKey];
      if (raw === undefined || raw === "") continue;
      if (key === "allowedUploadMimeTypes") {
        data.allowedUploadMimeTypes = parseAllowedUploadMimeTypes(raw);
      } else {
        const n = parseInt(raw, 10);
        if (!Number.isFinite(n)) continue;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data as any)[key] = clampSecurityNumber(key, n);
      }
    }

    _cache = { data, expiresAt: Date.now() + TTL_MS };
    return data;
  } catch {
    return { ...SECURITY_SETTINGS_DEFAULTS };
  }
}
