/** Access JWTs are short-lived; refresh this many ms before `exp`. */
export const ACCESS_TOKEN_REFRESH_SKEW_MS = 2 * 60 * 1000;

/** Decode `exp` from a JWT payload without verifying the signature. */
export function readJwtExpiryMs(token: string): number | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const padded = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
    const json = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function accessTokenNeedsRefresh(
  token: string | null | undefined,
  now = Date.now(),
  skewMs = ACCESS_TOKEN_REFRESH_SKEW_MS,
): boolean {
  if (!token) return true;
  const exp = readJwtExpiryMs(token);
  if (exp == null) return true;
  return now >= exp - skewMs;
}
