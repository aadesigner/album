import { describe, expect, it } from 'vitest';
import { accessTokenNeedsRefresh, readJwtExpiryMs } from './accessToken';

function tokenWithExp(expUnix: number): string {
  const json = JSON.stringify({ exp: expUnix });
  const b64 = Buffer.from(json).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `eyJhbGciOiJub25lIn0.${b64}.sig`;
}

describe('accessToken', () => {
  it('reads exp from a JWT payload', () => {
    const exp = 1_700_000_000;
    expect(readJwtExpiryMs(tokenWithExp(exp))).toBe(exp * 1000);
  });

  it('refreshes when missing, malformed, or inside the skew window', () => {
    expect(accessTokenNeedsRefresh(null)).toBe(true);
    expect(accessTokenNeedsRefresh('not-a-jwt')).toBe(true);
    const now = 1_000_000;
    expect(accessTokenNeedsRefresh(tokenWithExp(now / 1000 + 60), now, 120_000)).toBe(true);
    expect(accessTokenNeedsRefresh(tokenWithExp(now / 1000 + 600), now, 120_000)).toBe(false);
  });
});
