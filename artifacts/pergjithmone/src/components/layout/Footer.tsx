import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Link } from 'wouter';
import { useGetAppSettings } from '@workspace/api-client-react-tsconfig';
import { Instagram } from 'lucide-react';

const INSTAGRAM_URL = 'https://www.instagram.com/pergjithmone.al/';
const TIKTOK_URL = 'https://www.tiktok.com/@pergjithmone.al';

// lucide-react has no TikTok glyph — inline the brand mark so it matches
// the stroke-icon sizing/weight of the Instagram icon next to it.
function TikTokIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.6 5.82c-.9-.85-1.4-2.04-1.4-3.32h-3.02v13.5c0 1.44-1.17 2.6-2.6 2.6a2.6 2.6 0 0 1-2.6-2.6 2.6 2.6 0 0 1 2.6-2.6c.26 0 .51.04.75.11V10.5a5.62 5.62 0 0 0-.75-.05 5.62 5.62 0 0 0-5.62 5.62A5.62 5.62 0 0 0 9.58 21.7a5.62 5.62 0 0 0 5.62-5.62V8.7a8.63 8.63 0 0 0 5.02 1.6V7.28c-1.28 0-2.47-.5-3.32-1.4z"/>
    </svg>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex items-center justify-center rounded-full transition-colors duration-150"
      style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = '#fff'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
    >
      {children}
    </a>
  );
}

export function Footer() {
  const { lang } = useLanguage();
  const year = new Date().getFullYear();
  const { data: settings } = useGetAppSettings();
  const s = settings as any;
  const siteName = s?.siteName || 'Përgjithmonë';
  const tagline = lang === 'sq'
    ? (s?.siteTaglineAl || 'Albume fotografike premium · Shqipëri')
    : (s?.siteTaglineEn || 'Premium photo books · Albania');

  return (
    <footer style={{ background: '#0d0d0d', color: '#fff' }}>
      <div className="max-w-7xl mx-auto px-5 md:px-10 pt-14 pb-10">

        {/* Brand — large serif italic */}
        <div className="text-center mb-7">
          <p
            className="font-serif leading-none tracking-tight text-white/90"
            style={{ fontSize: 'clamp(30px, 4.5vw, 52px)', fontStyle: 'italic', fontWeight: 300 }}
          >
            {siteName}
            <span style={{ fontSize: '0.38em', color: 'rgba(255,255,255,0.32)', marginLeft: '0.08em' }}>.al</span>
          </p>
          <p className="mt-3 text-[10px] uppercase tracking-[0.30em] text-white/25">
            {tagline}
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <SocialLink href={INSTAGRAM_URL} label="Instagram">
              <Instagram size={17} strokeWidth={1.75} />
            </SocialLink>
            <SocialLink href={TIKTOK_URL} label="TikTok">
              <TikTokIcon size={16} />
            </SocialLink>
          </div>
        </div>

        {/* Ornamental divider */}
        <div className="flex items-center justify-center gap-5 mb-10">
          <span className="flex-1 max-w-[120px] h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ color: 'rgba(255,255,255,0.16)', fontSize: 10 }}>◆</span>
          <span className="flex-1 max-w-[120px] h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* Links grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-10 mb-12">

          <div>
            <p className="text-[9px] uppercase tracking-[0.24em] mb-5" style={{ color: 'rgba(255,255,255,0.25)' }}>
              {lang === 'sq' ? 'Produkt' : 'Product'}
            </p>
            <ul className="space-y-3.5">
              {[
                { href: '/si-funksionon', sq: 'Si funksionon', en: 'How it works' },
                { href: '/shembuj',       sq: 'Shembuj',       en: 'Examples'     },
                { href: '/cmime',         sq: 'Çmimet',        en: 'Pricing'      },
              ].map(l => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[13px] transition-colors duration-150"
                    style={{ color: 'rgba(255,255,255,0.40)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.88)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.40)')}
                  >
                    {lang === 'sq' ? l.sq : l.en}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[9px] uppercase tracking-[0.24em] mb-5" style={{ color: 'rgba(255,255,255,0.25)' }}>
              {lang === 'sq' ? 'Kompania' : 'Company'}
            </p>
            <ul className="space-y-3.5">
              {[
                { href: '/rreth-nesh', sq: 'Rreth nesh', en: 'About us' },
                { href: '/kontakt',    sq: 'Kontakt',    en: 'Contact'  },
                { href: '/faq',        sq: 'FAQ',        en: 'FAQ'      },
              ].map(l => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[13px] transition-colors duration-150"
                    style={{ color: 'rgba(255,255,255,0.40)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.88)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.40)')}
                  >
                    {lang === 'sq' ? l.sq : l.en}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[9px] uppercase tracking-[0.24em] mb-5" style={{ color: 'rgba(255,255,255,0.25)' }}>
              {lang === 'sq' ? 'Ligjore' : 'Legal'}
            </p>
            <ul className="space-y-3.5">
              {[
                { href: '/terms',   sq: 'Termat & Kushtet', en: 'Terms & Conditions' },
                { href: '/privacy', sq: 'Privatësia',       en: 'Privacy Policy'     },
              ].map(l => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[13px] transition-colors duration-150"
                    style={{ color: 'rgba(255,255,255,0.40)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.88)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.40)')}
                  >
                    {lang === 'sq' ? l.sq : l.en}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col md:flex-row items-center justify-between gap-3 pt-6"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
        >
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)' }}>
            © {year} {siteName} ·{' '}
            {lang === 'sq' ? 'Të gjitha të drejtat e rezervuara' : 'All rights reserved'}
          </p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)' }}>
            Made with ♥ in Albania
          </p>
        </div>
      </div>
    </footer>
  );
}
