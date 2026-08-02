import { useEffect, useRef, useState } from 'react';

interface RecaptchaConfig {
  siteKey: string;
  loginEnabled: boolean;
  registerEnabled: boolean;
}

// Singleton so multiple hook instances share one fetch + one script tag
let configPromise: Promise<RecaptchaConfig> | null = null;
let scriptLoaded = false;

function fetchConfig(): Promise<RecaptchaConfig> {
  if (!configPromise) {
    configPromise = fetch('/api/config')
      .then((r) => r.json())
      .then((d) => d.recaptcha as RecaptchaConfig)
      .catch(() => ({ siteKey: '', loginEnabled: false, registerEnabled: false }));
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
      configRef.current = cfg;
      const enabled = page === 'login' ? cfg.loginEnabled : cfg.registerEnabled;
      if (enabled && cfg.siteKey) {
        await loadScript(cfg.siteKey).catch(() => {/* ignore */});
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
