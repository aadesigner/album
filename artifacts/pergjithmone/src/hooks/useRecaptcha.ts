import { useEffect, useRef, useState } from 'react';

interface RecaptchaConfig {
  siteKey: string;
  loginEnabled: boolean;
  registerEnabled: boolean;
}

const DISABLED: RecaptchaConfig = {
  siteKey: '',
  loginEnabled: false,
  registerEnabled: false,
};

// Singleton so multiple hook instances share one fetch + one script tag
let configPromise: Promise<RecaptchaConfig> | null = null;
let scriptLoaded = false;

function fetchConfig(): Promise<RecaptchaConfig> {
  if (!configPromise) {
    configPromise = fetch('/api/config')
      .then(async (r) => {
        if (!r.ok) {
          // Don't cache a hard failure forever — allow a later page load /
          // remount to retry once rate limits (or transient errors) clear.
          configPromise = null;
          return DISABLED;
        }
        const d = await r.json();
        const cfg = d?.recaptcha;
        if (!cfg || typeof cfg !== 'object') return DISABLED;
        return {
          siteKey: typeof cfg.siteKey === 'string' ? cfg.siteKey : '',
          loginEnabled: Boolean(cfg.loginEnabled),
          registerEnabled: Boolean(cfg.registerEnabled),
        } satisfies RecaptchaConfig;
      })
      .catch(() => {
        configPromise = null;
        return DISABLED;
      });
  }
  return configPromise;
}

function loadScript(siteKey: string): Promise<void> {
  if (scriptLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.getElementById('recaptcha-v3-script');
    if (existing) { scriptLoaded = true; resolve(); return; }
    const s = document.createElement('script');
    s.id = 'recaptcha-v3-script';
    s.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    s.async = true;
    s.onload = () => { scriptLoaded = true; resolve(); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/**
 * useRecaptcha — returns an execute() function for the given action.
 * If reCAPTCHA is disabled for this page, execute() returns null.
 */
export function useRecaptcha(page: 'login' | 'register') {
  const [ready, setReady] = useState(false);
  const configRef = useRef<RecaptchaConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchConfig().then(async (cfg) => {
      if (cancelled) return;
      configRef.current = cfg ?? DISABLED;
      const enabled = page === 'login' ? configRef.current.loginEnabled : configRef.current.registerEnabled;
      if (enabled && configRef.current.siteKey) {
        await loadScript(configRef.current.siteKey).catch(() => {/* ignore */});
      }
      if (!cancelled) setReady(true);
    });
    return () => { cancelled = true; };
  }, [page]);

  async function execute(): Promise<string | null> {
    const cfg = configRef.current;
    if (!cfg) return null;
    const enabled = page === 'login' ? cfg.loginEnabled : cfg.registerEnabled;
    if (!enabled || !cfg.siteKey) return null;

    const gr = (window as any).grecaptcha;
    if (!gr) return null;

    return new Promise<string | null>((resolve) => {
      gr.ready(() => {
        gr.execute(cfg.siteKey, { action: page })
          .then((token: string) => resolve(token))
          .catch(() => resolve(null));
      });
    });
  }

  return { ready, execute };
}
