import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout, ADMIN } from '@/components/layout/AdminLayout';
import {
  useGetAdminSettings,
  useUpdateAdminSettings,
  getGetAdminSettingsQueryKey,
  getGetAppSettingsQueryKey,
} from '@workspace/api-client-react-tsconfig';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, RotateCcw, Save } from 'lucide-react';
import {
  FOOTER_STYLE_META,
  FOOTER_STYLE_PRESETS,
  NAV_STYLE_META,
  NAV_STYLE_PRESETS,
  WEB_THEME_DEFAULTS,
  WEB_THEME_PALETTES,
  fillBackground,
  parseWebTheme,
  type FooterStyleId,
  type NavStyleId,
  type WebThemeConfig,
} from '@/lib/webTheme';
import { PricingCopyEditor } from '@/components/admin/PricingCopyEditor';

function ColorField({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  const hex = value.startsWith('#') && (value.length === 7 || value.length === 4) ? value : '#888888';
  return (
    <label className="flex flex-col gap-1.5 min-w-0">
      <span className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: ADMIN.muted }}>
        {label}
      </span>
      <div
        className="flex items-center gap-2 px-2 py-1.5"
        style={{ background: ADMIN.card, border: `1px solid ${ADMIN.line}`, borderRadius: ADMIN.radius }}
      >
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="w-8 h-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 text-[12px] bg-transparent outline-none font-mono"
          style={{ color: ADMIN.ink }}
        />
      </div>
    </label>
  );
}

/** Tiny structural thumbnail — shows layout bones, not just a color swatch. */
function NavThumb({ id, theme }: { id: NavStyleId; theme: WebThemeConfig }) {
  const t = { ...theme, ...NAV_STYLE_PRESETS[id], navStyle: id };
  const bg = fillBackground(t.navBgMode, t.navBg, t.navBgTo);
  const links = [1, 2, 3];

  if (id === 'editorial') {
    return (
      <div className="rounded-xl overflow-hidden h-[72px]" style={{ background: bg, border: `1px solid ${ADMIN.line}` }}>
        <div className="h-4 flex items-center justify-between px-2" style={{ borderBottom: `1px solid ${t.navMuted}33` }}>
          <span className="w-10 h-1 rounded" style={{ background: t.navMuted }} />
          <span className="w-8 h-1 rounded" style={{ background: t.navMuted }} />
        </div>
        <div className="px-2 h-[56px] flex items-end justify-between pb-2 gap-2">
          <span className="italic font-serif text-[15px] leading-none" style={{ color: t.navText }}>Aa</span>
          <div className="flex gap-1.5 items-center pb-0.5">
            {links.map((n) => <span key={n} className="w-4 h-1 rounded" style={{ background: t.navMuted }} />)}
          </div>
          <span className="w-8 h-1 rounded mb-0.5" style={{ background: t.navAccent }} />
        </div>
      </div>
    );
  }

  if (id === 'glass') {
    return (
      <div className="rounded-xl overflow-hidden h-[72px] relative" style={{ background: 'linear-gradient(135deg,#2a2030,#1a3040)', border: `1px solid ${ADMIN.line}` }}>
        <div
          className="absolute left-3 right-3 top-4 h-9 flex items-center justify-between px-2.5"
          style={{
            background: `${t.navBg}cc`,
            borderRadius: 12,
            border: `1px solid ${t.navText}22`,
            backdropFilter: 'blur(8px)',
          }}
        >
          <span className="w-8 h-1.5 rounded" style={{ background: t.navText }} />
          <div className="flex gap-1">{links.map((n) => <span key={n} className="w-3 h-1 rounded" style={{ background: t.navMuted }} />)}</div>
          <span className="w-6 h-3 rounded-full" style={{ background: t.navAccent }} />
        </div>
      </div>
    );
  }

  if (id === 'pills') {
    return (
      <div className="rounded-xl overflow-hidden h-[72px] px-2.5 flex items-center gap-1.5" style={{ background: bg, border: `1px solid ${ADMIN.line}` }}>
        <span className="px-2 py-1 rounded-full text-[8px] font-semibold" style={{ background: t.navAccent, color: t.navAccentOn }}>Brand</span>
        {links.map((n) => (
          <span key={n} className="px-2 py-1 rounded-full text-[7px]" style={{ background: `${t.navText}12`, color: t.navMuted }}>Link</span>
        ))}
        <span className="ml-auto px-2 py-1 rounded-full text-[7px] font-semibold" style={{ background: t.navAccent, color: t.navAccentOn }}>Go</span>
      </div>
    );
  }

  if (id === 'solid') {
    return (
      <div className="rounded-xl overflow-hidden h-[72px] px-2.5 flex items-center gap-2" style={{ background: bg, border: `1px solid ${ADMIN.line}` }}>
        <span className="text-[10px] font-bold" style={{ color: t.navText }}>Brand</span>
        <span className="w-px h-4" style={{ background: `${t.navText}33` }} />
        <div className="flex gap-2 flex-1">
          {links.map((n) => <span key={n} className="w-5 h-1 rounded" style={{ background: t.navMuted }} />)}
        </div>
        <span className="px-2 py-1.5 text-[7px] font-bold uppercase" style={{ background: t.navAccent, color: t.navAccentOn, borderRadius: 3 }}>CTA</span>
      </div>
    );
  }

  // classic primary
  return (
    <div className="rounded-xl overflow-hidden h-[72px] px-2.5 flex items-center justify-between gap-2 bg-white" style={{ border: `1px solid ${ADMIN.line}` }}>
      <span className="w-9 h-3 rounded" style={{ background: '#1C1916' }} />
      <div className="flex gap-3">
        {links.map((n) => (
          <span key={n} className="flex flex-col items-center gap-0.5">
            <span className="w-5 h-1 rounded" style={{ background: n === 1 ? '#1C1916' : '#B0A89E' }} />
            {n === 1 && <span className="w-4 h-px" style={{ background: '#1C1916' }} />}
          </span>
        ))}
      </div>
      <span className="px-2 py-1 rounded-full text-[7px] font-semibold text-white" style={{ background: '#1C1916' }}>Create</span>
    </div>
  );
}

function FooterThumb({ id, theme }: { id: FooterStyleId; theme: WebThemeConfig }) {
  const t = { ...theme, ...FOOTER_STYLE_PRESETS[id], footerStyle: id };
  const bg = fillBackground(t.footerBgMode, t.footerBg, t.footerBgTo);

  if (id === 'slim') {
    return (
      <div className="rounded-xl h-[72px] px-3 flex items-center justify-between gap-2" style={{ background: bg, border: `1px solid ${ADMIN.line}` }}>
        <span className="w-10 h-1.5 rounded" style={{ background: t.footerText }} />
        <div className="flex gap-2">{[1, 2, 3].map((n) => <span key={n} className="w-4 h-1 rounded" style={{ background: t.footerMuted }} />)}</div>
        <span className="w-4 h-4 rounded-full" style={{ background: `${t.footerText}22` }} />
      </div>
    );
  }
  if (id === 'band') {
    return (
      <div className="rounded-xl overflow-hidden h-[72px]" style={{ border: `1px solid ${ADMIN.line}` }}>
        <div className="h-11 flex flex-col items-center justify-center gap-1" style={{ background: bg }}>
          <span className="w-16 h-2 rounded" style={{ background: t.footerText }} />
          <span className="w-10 h-1 rounded" style={{ background: t.footerMuted }} />
        </div>
        <div className="h-[28px] bg-white flex items-center justify-center gap-3">
          {[1, 2, 3, 4].map((n) => <span key={n} className="w-4 h-1 rounded bg-neutral-300" />)}
        </div>
      </div>
    );
  }
  if (id === 'magazine') {
    return (
      <div className="rounded-xl h-[72px] px-3 py-2" style={{ background: bg, border: `1px solid ${ADMIN.line}` }}>
        <span className="block font-serif text-[22px] leading-none mb-2" style={{ color: t.footerText }}>Aa</span>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="space-y-1">
              <span className="block w-full h-1 rounded" style={{ background: t.footerAccent }} />
              <span className="block w-3/4 h-1 rounded" style={{ background: t.footerMuted }} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (id === 'light') {
    return (
      <div className="rounded-xl h-[72px] px-3 py-2.5 grid grid-cols-4 gap-2" style={{ background: bg, border: `1px solid ${ADMIN.line}` }}>
        <div>
          <span className="block w-8 h-2 rounded mb-1" style={{ background: t.footerText }} />
          <span className="block w-10 h-1 rounded" style={{ background: t.footerMuted }} />
        </div>
        {[1, 2, 3].map((n) => (
          <div key={n} className="space-y-1 pt-0.5">
            <span className="block w-full h-1 rounded" style={{ background: t.footerText }} />
            <span className="block w-2/3 h-1 rounded" style={{ background: t.footerMuted }} />
          </div>
        ))}
      </div>
    );
  }
  // classic
  return (
    <div className="rounded-xl h-[72px] px-3 py-2.5 text-center" style={{ background: bg, border: `1px solid ${ADMIN.line}` }}>
      <span className="block font-serif italic text-[14px] leading-none" style={{ color: t.footerText }}>Brand</span>
      <div className="flex items-center justify-center gap-2 my-1.5">
        <span className="h-px w-6" style={{ background: `${t.footerText}22` }} />
        <span style={{ color: t.footerAccent, fontSize: 7 }}>◆</span>
        <span className="h-px w-6" style={{ background: `${t.footerText}22` }} />
      </div>
      <div className="grid grid-cols-3 gap-2 max-w-[140px] mx-auto">
        {[1, 2, 3].map((n) => <span key={n} className="h-1 rounded" style={{ background: t.footerMuted }} />)}
      </div>
    </div>
  );
}

function NavPreview({ theme }: { theme: WebThemeConfig }) {
  const bg = fillBackground(theme.navBgMode, theme.navBg, theme.navBgTo);
  const style = theme.navStyle;
  const links = ['How it works', 'Examples', 'Pricing'];

  if (style === 'editorial') {
    return (
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${ADMIN.line}`, background: bg }}>
        <div className="px-4 py-1.5 flex justify-between text-[9px] uppercase tracking-wider" style={{ borderBottom: `1px solid ${theme.navMuted}28`, color: theme.navMuted }}>
          <span>Premium albums</span>
          <span>SQ · EN · Login</span>
        </div>
        <div className="px-5 py-4 flex items-end justify-between gap-4">
          <span style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontStyle: 'italic', color: theme.navText }}>Përgjithmonë</span>
          <div className="hidden sm:flex items-center gap-3 pb-1 text-[12px]" style={{ color: theme.navMuted }}>
            {links.map((l, i) => (
              <React.Fragment key={l}>
                {i > 0 && <span>·</span>}
                <span>{l}</span>
              </React.Fragment>
            ))}
          </div>
          <span className="text-[12px] underline underline-offset-4" style={{ color: theme.navAccent }}>Start →</span>
        </div>
      </div>
    );
  }

  if (style === 'glass') {
    return (
      <div className="rounded-2xl overflow-hidden relative h-[88px]" style={{ border: `1px solid ${ADMIN.line}` }}>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg,#2a2030,#1a3040)' }} />
        <div className="relative px-4 pt-4">
          <div
            className="px-4 py-3 flex items-center justify-between gap-3"
            style={{
              background: `${theme.navBg}d0`,
              backdropFilter: 'blur(12px)',
              borderRadius: 16,
              border: `1px solid ${theme.navText}22`,
            }}
          >
            <span className="text-[11px] font-semibold tracking-[0.14em] uppercase" style={{ color: theme.navText }}>Përgjithmonë</span>
            <div className="hidden sm:flex gap-4">
              {links.map((l) => (
                <span key={l} className="text-[10px] uppercase tracking-wider" style={{ color: theme.navMuted }}>{l}</span>
              ))}
            </div>
            <span className="px-3 py-1.5 text-[10px] rounded-full font-semibold" style={{ background: theme.navAccent, color: theme.navAccentOn }}>Create</span>
          </div>
        </div>
      </div>
    );
  }

  if (style === 'pills') {
    return (
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${ADMIN.line}`, background: bg }}>
        <div className="px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 text-[12px] font-semibold rounded-full" style={{ background: theme.navAccent, color: theme.navAccentOn }}>Përgjithmonë</span>
            <div className="hidden sm:flex gap-1.5">
              {links.map((l) => (
                <span key={l} className="px-3 py-1 text-[11px] rounded-full" style={{ background: `${theme.navText}12`, color: theme.navText }}>{l}</span>
              ))}
            </div>
          </div>
          <span className="px-3 py-1.5 text-[11px] font-semibold rounded-full" style={{ background: theme.navAccent, color: theme.navAccentOn }}>Create</span>
        </div>
      </div>
    );
  }

  if (style === 'solid') {
    return (
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${ADMIN.line}` }}>
        <div className="px-4 py-3.5 flex items-center justify-between gap-3" style={{ background: bg }}>
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-bold" style={{ color: theme.navText }}>Përgjithmonë</span>
            <span className="w-px h-4" style={{ background: `${theme.navText}33` }} />
            <div className="hidden sm:flex gap-4">
              {links.map((l) => (
                <span key={l} className="text-[12px] font-medium" style={{ color: theme.navMuted }}>{l}</span>
              ))}
            </div>
          </div>
          <span className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider" style={{ background: theme.navAccent, color: theme.navAccentOn, borderRadius: 4 }}>
            Create book
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden bg-white" style={{ border: `1px solid ${ADMIN.line}` }}>
      <div className="px-4 py-3.5 flex items-center justify-between gap-3" style={{ background: bg }}>
        <span className="text-[12px] font-semibold" style={{ color: theme.navText }}>Përgjithmonë</span>
        <div className="hidden sm:flex gap-6">
          {links.map((l, i) => (
            <span key={l} className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: i === 0 ? theme.navText : theme.navMuted }}>{l}</span>
          ))}
        </div>
        <span className="px-4 py-2 text-[10px] uppercase tracking-[0.12em] font-semibold rounded-full" style={{ background: theme.navAccent, color: theme.navAccentOn }}>
          Create
        </span>
      </div>
    </div>
  );
}

function FooterPreview({ theme, siteName }: { theme: WebThemeConfig; siteName: string }) {
  const bg = fillBackground(theme.footerBgMode, theme.footerBg, theme.footerBgTo);
  const style = theme.footerStyle;

  if (style === 'slim') {
    return (
      <div className="rounded-2xl overflow-hidden px-4 py-3.5 flex flex-wrap items-center justify-between gap-3" style={{ background: bg, border: `1px solid ${ADMIN.line}` }}>
        <span className="text-[12px] font-semibold" style={{ color: theme.footerText }}>{siteName}</span>
        <div className="flex gap-4 text-[11px]" style={{ color: theme.footerMuted }}>
          <span>Pricing</span><span>About</span><span>Contact</span>
        </div>
        <span className="text-[11px]" style={{ color: theme.footerAccent }}>@pergjithmone.al</span>
      </div>
    );
  }

  if (style === 'band') {
    return (
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${ADMIN.line}` }}>
        <div className="px-5 py-6 text-center" style={{ background: bg }}>
          <p className="text-[18px] font-serif italic" style={{ color: theme.footerText }}>{siteName}</p>
          <p className="text-[11px] mt-1 tracking-[0.2em] uppercase" style={{ color: theme.footerMuted }}>Memories that last</p>
        </div>
        <div className="px-4 py-3 flex justify-center gap-5 text-[11px] bg-white" style={{ color: '#666' }}>
          <span>How it works</span><span>Examples</span><span>FAQ</span>
        </div>
      </div>
    );
  }

  if (style === 'magazine') {
    return (
      <div className="rounded-2xl overflow-hidden px-5 py-6" style={{ background: bg, border: `1px solid ${ADMIN.line}` }}>
        <p className="leading-none mb-5" style={{ fontFamily: 'Georgia, serif', fontSize: 36, fontWeight: 500, color: theme.footerText }}>
          {siteName}
        </p>
        <div className="grid grid-cols-3 gap-4 text-[11px]">
          {['Product', 'Company', 'Legal'].map((h) => (
            <div key={h}>
              <p className="uppercase tracking-[0.16em] mb-2" style={{ color: theme.footerAccent, fontSize: 9 }}>{h}</p>
              <p style={{ color: theme.footerMuted }}>Link one</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (style === 'light') {
    return (
      <div className="rounded-2xl overflow-hidden px-5 py-6" style={{ background: bg, border: `1px solid ${ADMIN.line}` }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
          <div>
            <p className="font-serif text-lg mb-1" style={{ color: theme.footerText }}>{siteName}</p>
            <p className="text-[11px]" style={{ color: theme.footerMuted }}>Premium albums</p>
          </div>
          {['Product', 'Company', 'Legal'].map((h) => (
            <div key={h}>
              <p className="text-[10px] uppercase tracking-wider mb-2 font-semibold" style={{ color: theme.footerText }}>{h}</p>
              <p className="text-[12px]" style={{ color: theme.footerMuted }}>Item</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden px-5 py-8 text-center" style={{ background: bg, border: `1px solid ${ADMIN.line}` }}>
      <p className="font-serif italic text-[28px]" style={{ color: theme.footerText }}>{siteName}<span style={{ color: theme.footerMuted, fontSize: '0.4em' }}>.al</span></p>
      <div className="flex items-center justify-center gap-4 my-5">
        <span className="h-px w-16" style={{ background: `${theme.footerText}18` }} />
        <span style={{ color: theme.footerAccent, fontSize: 10 }}>◆</span>
        <span className="h-px w-16" style={{ background: `${theme.footerText}18` }} />
      </div>
      <div className="grid grid-cols-3 gap-3 text-[11px] text-left max-w-md mx-auto">
        {['Product', 'Company', 'Legal'].map((h) => (
          <div key={h}>
            <p className="uppercase tracking-wider mb-2" style={{ color: theme.footerMuted, fontSize: 9 }}>{h}</p>
            <p style={{ color: `${theme.footerText}99` }}>Link</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminWebTheme() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useGetAdminSettings();
  const updateSettings = useUpdateAdminSettings();
  const s = settings as Record<string, unknown> | undefined;

  const serverTheme = useMemo(
    () => parseWebTheme(s?.webTheme ?? WEB_THEME_DEFAULTS),
    [s?.webTheme],
  );
  const [draft, setDraft] = useState<WebThemeConfig>(serverTheme);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(serverTheme);
  }, [serverTheme]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(serverTheme);
  const siteName = String(s?.siteName || 'Përgjithmonë');

  const patch = (p: Partial<WebThemeConfig>) => setDraft((d) => ({ ...d, ...p }));

  const selectNav = (id: NavStyleId) => {
    patch({ navStyle: id, ...NAV_STYLE_PRESETS[id] });
  };
  const selectFooter = (id: FooterStyleId) => {
    patch({ footerStyle: id, ...FOOTER_STYLE_PRESETS[id] });
  };

  const save = async () => {
    setError(null);
    try {
      await updateSettings.mutateAsync({ data: { webTheme: draft } as any });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetAdminSettingsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetAppSettingsQueryKey() }),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (e: any) {
      setError(e?.data?.error || e?.message || 'Could not save theme.');
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-24" style={{ color: ADMIN.muted }}>
          <Loader2 className="animate-spin" size={22} />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-10 pb-28">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] font-semibold mb-2" style={{ color: ADMIN.muted }}>
              Website
            </p>
            <h1 className="font-serif text-3xl font-medium" style={{ color: ADMIN.ink }}>Web Theme</h1>
            <p className="text-sm mt-2 max-w-xl" style={{ color: ADMIN.muted }}>
              Choose a completely different menu and footer layout. Classic stays the primary default — alternatives change structure, not just colors.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!dirty}
              onClick={() => setDraft(serverTheme)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-medium disabled:opacity-40 cursor-pointer"
              style={{ borderRadius: ADMIN.radius, border: `1px solid ${ADMIN.line}`, color: ADMIN.ink, background: ADMIN.card }}
            >
              <RotateCcw size={13} /> Reset
            </button>
            <button
              type="button"
              disabled={!dirty || updateSettings.isPending}
              onClick={save}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold disabled:opacity-50 cursor-pointer"
              style={{ borderRadius: ADMIN.radius, background: ADMIN.accent, color: ADMIN.accentOn }}
            >
              {updateSettings.isPending ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : <Save size={13} />}
              {saved ? 'Saved' : 'Save theme'}
            </button>
          </div>
        </div>

        {error && (
          <p className="mb-4 text-sm px-3 py-2 rounded-lg" style={{ background: '#FEE2E2', color: '#991B1B' }}>{error}</p>
        )}

        <section className="mb-10 space-y-4">
          <p className="text-[10px] uppercase tracking-[0.16em] font-semibold" style={{ color: ADMIN.muted }}>Live preview</p>
          <NavPreview theme={draft} />
          <FooterPreview theme={draft} siteName={siteName} />
        </section>

        {/* Menu layouts */}
        <section className="mb-10">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <p className="text-[10px] uppercase tracking-[0.16em] font-semibold" style={{ color: ADMIN.muted }}>
              Menu layouts
            </p>
            <p className="text-[11px]" style={{ color: ADMIN.muted }}>Structure changes on the live site</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(Object.keys(NAV_STYLE_META) as NavStyleId[]).map((id) => {
              const meta = NAV_STYLE_META[id];
              const active = draft.navStyle === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectNav(id)}
                  className="text-left p-3 transition-all cursor-pointer"
                  style={{
                    borderRadius: `calc(${ADMIN.radius} + 2px)`,
                    border: active ? `1.5px solid ${ADMIN.accent}` : `1px solid ${ADMIN.line}`,
                    background: active ? ADMIN.accentSoft : ADMIN.card,
                    boxShadow: active ? `0 8px 24px ${ADMIN.accent}22` : undefined,
                  }}
                >
                  <NavThumb id={id} theme={draft} />
                  <div className="flex items-center justify-between gap-2 mt-3 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="font-serif text-[16px] truncate" style={{ color: ADMIN.ink }}>{meta.name}</p>
                      {meta.primary && (
                        <span
                          className="shrink-0 text-[9px] uppercase tracking-[0.12em] font-semibold px-1.5 py-0.5 rounded"
                          style={{ background: ADMIN.accent, color: ADMIN.accentOn }}
                        >
                          Primary
                        </span>
                      )}
                    </div>
                    {active && (
                      <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: ADMIN.accent, color: ADMIN.accentOn }}>
                        <Check size={11} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] leading-snug mb-1.5" style={{ color: ADMIN.muted }}>{meta.blurb}</p>
                  <p className="text-[10px] font-mono leading-snug" style={{ color: ADMIN.ink, opacity: 0.55 }}>{meta.layout}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Footer layouts */}
        <section className="mb-10">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <p className="text-[10px] uppercase tracking-[0.16em] font-semibold" style={{ color: ADMIN.muted }}>
              Footer layouts
            </p>
            <p className="text-[11px]" style={{ color: ADMIN.muted }}>Different page endings</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(Object.keys(FOOTER_STYLE_META) as FooterStyleId[]).map((id) => {
              const meta = FOOTER_STYLE_META[id];
              const active = draft.footerStyle === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectFooter(id)}
                  className="text-left p-3 transition-all cursor-pointer"
                  style={{
                    borderRadius: `calc(${ADMIN.radius} + 2px)`,
                    border: active ? `1.5px solid ${ADMIN.accent}` : `1px solid ${ADMIN.line}`,
                    background: active ? ADMIN.accentSoft : ADMIN.card,
                    boxShadow: active ? `0 8px 24px ${ADMIN.accent}22` : undefined,
                  }}
                >
                  <FooterThumb id={id} theme={draft} />
                  <div className="flex items-center justify-between gap-2 mt-3 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="font-serif text-[16px] truncate" style={{ color: ADMIN.ink }}>{meta.name}</p>
                      {meta.primary && (
                        <span
                          className="shrink-0 text-[9px] uppercase tracking-[0.12em] font-semibold px-1.5 py-0.5 rounded"
                          style={{ background: ADMIN.accent, color: ADMIN.accentOn }}
                        >
                          Primary
                        </span>
                      )}
                    </div>
                    {active && (
                      <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: ADMIN.accent, color: ADMIN.accentOn }}>
                        <Check size={11} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] leading-snug mb-1.5" style={{ color: ADMIN.muted }}>{meta.blurb}</p>
                  <p className="text-[10px] font-mono leading-snug" style={{ color: ADMIN.ink, opacity: 0.55 }}>{meta.layout}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Optional color fine-tune */}
        <section className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.16em] font-semibold mb-1" style={{ color: ADMIN.muted }}>
            Optional — fine-tune colors
          </p>
          <p className="text-[12px] mb-4" style={{ color: ADMIN.muted }}>
            Layouts ship with matching palettes. Override only if you need a custom mood.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-6">
            {WEB_THEME_PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => patch(p.patch)}
                className="text-left p-3 transition-transform active:scale-[0.98] cursor-pointer"
                style={{
                  borderRadius: ADMIN.radius,
                  border: `1px solid ${ADMIN.line}`,
                  background: ADMIN.card,
                }}
              >
                <div
                  className="h-8 rounded-md mb-2"
                  style={{
                    background: fillBackground(
                      (p.patch.navBgMode as any) || 'solid',
                      p.patch.navBg || '#fff',
                      p.patch.navBgTo || p.patch.navBg || '#fff',
                    ),
                  }}
                />
                <p className="text-[12px] font-semibold" style={{ color: ADMIN.ink }}>{p.name}</p>
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] font-semibold mb-3" style={{ color: ADMIN.muted }}>
                Navbar colors
              </p>
              <div className="flex gap-2 mb-3">
                {(['solid', 'gradient'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => patch({ navBgMode: m })}
                    className="px-3 py-1.5 text-[11px] font-semibold capitalize cursor-pointer"
                    style={{
                      borderRadius: 999,
                      background: draft.navBgMode === m ? ADMIN.accent : ADMIN.card,
                      color: draft.navBgMode === m ? ADMIN.accentOn : ADMIN.ink,
                      border: `1px solid ${ADMIN.line}`,
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <ColorField label="Background" value={draft.navBg} onChange={(v) => patch({ navBg: v })} />
                {draft.navBgMode === 'gradient' && (
                  <ColorField label="Gradient to" value={draft.navBgTo} onChange={(v) => patch({ navBgTo: v })} />
                )}
                <ColorField label="Text" value={draft.navText} onChange={(v) => patch({ navText: v })} />
                <ColorField label="Muted" value={draft.navMuted} onChange={(v) => patch({ navMuted: v })} />
                <ColorField label="Accent" value={draft.navAccent} onChange={(v) => patch({ navAccent: v })} />
                <ColorField label="Accent text" value={draft.navAccentOn} onChange={(v) => patch({ navAccentOn: v })} />
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] font-semibold mb-3" style={{ color: ADMIN.muted }}>
                Footer colors
              </p>
              <div className="flex gap-2 mb-3">
                {(['solid', 'gradient'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => patch({ footerBgMode: m })}
                    className="px-3 py-1.5 text-[11px] font-semibold capitalize cursor-pointer"
                    style={{
                      borderRadius: 999,
                      background: draft.footerBgMode === m ? ADMIN.accent : ADMIN.card,
                      color: draft.footerBgMode === m ? ADMIN.accentOn : ADMIN.ink,
                      border: `1px solid ${ADMIN.line}`,
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <ColorField label="Background" value={draft.footerBg} onChange={(v) => patch({ footerBg: v })} />
                {draft.footerBgMode === 'gradient' && (
                  <ColorField label="Gradient to" value={draft.footerBgTo} onChange={(v) => patch({ footerBgTo: v })} />
                )}
                <ColorField label="Text" value={draft.footerText} onChange={(v) => patch({ footerText: v })} />
                <ColorField label="Muted" value={draft.footerMuted} onChange={(v) => patch({ footerMuted: v })} />
                <ColorField label="Accent" value={draft.footerAccent} onChange={(v) => patch({ footerAccent: v })} />
              </div>
            </div>
          </div>
        </section>

        <PricingCopyEditor />
      </div>
    </AdminLayout>
  );
}
