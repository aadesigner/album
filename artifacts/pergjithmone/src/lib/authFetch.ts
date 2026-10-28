/**
 * Same-origin fetch with the live access token. On 401, refresh once and retry.
 * Used by the visual editor and uploads — they sit open longer than the 15-minute
 * access JWT, but the httpOnly refresh cookie still has a valid session.
 */

type AuthFetchHooks = {
  ensureToken: () => Promise<string | null>;
  onUnauthorized: () => Promise<boolean>;
};

let hooks: AuthFetchHooks | null = null;

export function setAuthFetchHooks(next: AuthFetchHooks | null) {
  hooks = next;
}

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  isRetry = false,
): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = hooks ? await hooks.ensureToken() : null;
  if (token && !headers.has('Authorization') && !headers.has('authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(input, { credentials: 'include', ...init, headers });

  if (res.status === 401 && !isRetry && token && hooks) {
    const recovered = await hooks.onUnauthorized();
    if (recovered) return authFetch(input, init, true);
  }

  return res;
}
