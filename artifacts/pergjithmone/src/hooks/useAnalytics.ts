import { useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';

const BASE = (import.meta as any).env?.BASE_URL?.replace(/\/$/, '') || '';
const seen = new Map<string, number>();
const DEDUP_MS = 60_000;

function shouldTrack(path: string) {
  if (!path) return false;
  if (path === '/heyadmin' || path.startsWith('/heyadmin/')) return false;
  return true;
}

function post(event: string, path: string) {
  if (!shouldTrack(path)) return;
  const key = `${event}:${path}`;
  const now = Date.now();
  if (now - (seen.get(key) || 0) < DEDUP_MS && event === 'page_view') return;
  if (event === 'page_view') seen.set(key, now);
  fetch(`${BASE}/api/analytics/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, path }),
  }).catch(() => {});
}

export function useAnalytics() {
  const [location] = useLocation();

  useEffect(() => {
    const t = setTimeout(() => post('page_view', location), 500);
    return () => clearTimeout(t);
  }, [location]);

  const trackEvent = useCallback((event: string) => {
    post(event, location);
  }, [location]);

  return { trackEvent };
}
