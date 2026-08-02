import { useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';

const BASE = (import.meta as any).env?.BASE_URL?.replace(/\/$/, '') || '';

function post(event: string, path: string) {
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
