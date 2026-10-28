import { afterEach, describe, expect, it, vi } from 'vitest';
import { authFetch, setAuthFetchHooks } from './authFetch';

describe('authFetch', () => {
  afterEach(() => {
    setAuthFetchHooks(null);
    vi.unstubAllGlobals();
  });

  it('retries once after a 401 when refresh succeeds', async () => {
    const ensureToken = vi.fn()
      .mockResolvedValueOnce('expired')
      .mockResolvedValueOnce('fresh');
    const onUnauthorized = vi.fn().mockResolvedValue(true);
    setAuthFetchHooks({ ensureToken, onUnauthorized });

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const res = await authFetch('/api/admin/pages/home', { method: 'PATCH' });
    expect(res.ok).toBe(true);
    expect(onUnauthorized).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retryHeaders = new Headers(fetchMock.mock.calls[1][1].headers);
    expect(retryHeaders.get('Authorization')).toBe('Bearer fresh');
  });
});
