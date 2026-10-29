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

  it('does not set Content-Type on FormData so the multipart boundary is kept', async () => {
    setAuthFetchHooks({
      ensureToken: async () => 'tok',
      onUnauthorized: async () => false,
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ url: '/api/uploads/files/a.jpg' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const fd = new FormData();
    fd.append('file', new Blob(['x'], { type: 'image/jpeg' }), 'a.jpg');
    await authFetch('/api/uploads/image', { method: 'POST', body: fd });
    const sent = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(sent.get('content-type')).toBeNull();
    expect(sent.get('Authorization')).toBe('Bearer tok');
  });
});
