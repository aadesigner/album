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
  NAV_STYLE_META,
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

function NavPreview({ theme }: { theme: WebThemeConfig }) {
  const bg = fillBackground(theme.navBgMode, theme.navBg, theme.navBgTo);
  const style = theme.navStyle;
  const links = ['How it works', 'Examples', 'Pricing'];

  if (style === 'pills') {
    return (
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${ADMIN.line}`, background: '#F3EEE6' }}>
        <div className="px-4 py-3 flex items-center justify-between gap-3" style={{ background: bg }}>
          <span
            className="px-3 py-1.5 text-[12px] font-semibold rounded-full"
            style={{ background: theme.navAccent, color: theme.navAccentOn }}
          >
            Përgjithmonë
          </span>
          <div className="hidden sm:flex items-center gap-1.5">
            {links.map((l) => (
              <span
                key={l}
                className="px-3 py-1 text-[11px] rounded-full"
                style={{ background: `${theme.navText}12`, color: theme.navText }}
              >
                {l}
              </span>
            ))}
          </div>
          <span
            className="px-3 py-1.5 text-[11px] font-semibold rounded-full"
            style={{ background: theme.navAccent, color: theme.navAccentOn }}
          >
            Create
          </span>
        </div>
        <div className="h-16 opacity-40" style={{ background: 'linear-gradient(180deg,#ddd,transparent)' }} />
      </div>
    );
  }

  if (style === 'editorial') {
    return (
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${ADMIN.line}`, background: '#EDE6DC' }}>
        <div
          className="px-5 py-4 flex items-end justify-between gap-4"
          style={{ background: bg, borderBottom: `1px solid ${theme.navMuted}33` }}
        >
          <span style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontStyle: 'italic', color: theme.navText }}>
            Përgjithmonë
          </span>
          <div className="hidden sm:flex items-center gap-5 pb-1">
            {links.map((l) => (
              <span key={l} className="text-[12.5px]" style={{ color: theme.navMuted }}>{l}</span>
            ))}
          </div>
          <span className="text-[12px] font-medium underline underline-offset-4" style={{ color: theme.navAccent }}>
            Start →
          </span>
        </div>
        <div className="h-14" />
      </div>
    );
  }

  if (style === 'glass') {
    return (
      <div className="rounded-2xl overflow-hidden relative" style={{ border: `1px solid ${ADMIN.line}` }}>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg,#2a2030,#1a3040)' }} />
        <div
          className="relative px-4 py-3.5 flex items-center justify-between gap-3"
          style={{
            background: theme.navBgMode === 'gradient'
              ? fillBackground('gradient', `${theme.navBg}cc`, `${theme.navBgTo}aa`)
              : `${theme.navBg}cc`,
            backdropFilter: 'blur(14px)',
            borderBottom: `1px solid ${theme.navText}22`,
          }}
        >
          <span className="text-[13px] font-semibold tracking-wide" style={{ color: theme.navText }}>PËRGJITHMONË</span>
          <div className="hidden sm:flex gap-5">
            {links.map((l) => (
              <span key={l} className="text-[11px] tracking-[0.08em] uppercase" style={{ color: theme.navMuted }}>{l}</span>
            ))}
          </div>
          <span
            className="px-3.5 py-1.5 text-[11px] rounded-full font-semibold"
            style={{ background: theme.navAccent, color: theme.navAccentOn }}
          >
            Create
          </span>
        </div>
        <div className="relative h-16" />
      </div>
    );
  }

  if (style === 'solid') {
    return (
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${ADMIN.line}` }}>
        <div className="px-4 py-3.5 flex items-center justify-between gap-3" style={{ background: bg }}>
          <span className="text-[13px] font-bold tracking-wide" style={{ color: theme.navText }}>Përgjithmonë</span>
          <div className="hidden sm:flex gap-5">
            {links.map((l) => (
              <span key={l} className="text-[12px] font-medium" style={{ color: theme.navMuted }}>{l}</span>
            ))}
          </div>
          <span
            className="px-4 py-2 text-[11px] font-bold rounded-full uppercase tracking-wider"
            style={{ background: theme.navAccent, color: theme.navAccentOn }}
          >
            Create book
          </span>
        </div>
        <div className="h-14 bg-neutral-100" />
      </div>
    );
  }

  // classic
  return (
    <div className="rounded-2xl overflow-hidden bg-white" style={{ border: `1px solid ${ADMIN.line}` }}>
      <div className="px-4 py-3.5 flex items-center justify-between gap-3" style={{ background: bg }}>
        <span className="text-[12px] font-semibold" style={{ color: theme.navText }}>Përgjithmonë</span>
        <div className="hidden sm:flex gap-6">
          {links.map((l, i) => (
            <span
              key={l}
              className="text-[10px] uppercase tracking-[0.14em] font-medium"
              style={{ color: i === 0 ? theme.navText : theme.navMuted }}
            >
              {l}
            </span>
          ))}
        </div>
        <span
          className="px-4 py-2 text-[10px] uppercase tracking-[0.12em] font-semibold rounded-full"
          style={{ background: theme.navAccent, color: theme.navAccentOn }}
        >
          Create
        </span>
      </div>
      <div className="h-14 bg-neutral-50" />
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
        <p
          className="leading-none mb-5"
          style={{ fontFamily: 'Georgia, serif', fontSize: 36, fontWeight: 500, color: theme.footerText }}
        >
          {siteName}
        </p>
        <div className="grid grid-cols-3 gap-4 text-[11px]">
          {['Product', 'Company', 'Legal'].map((h) => (
            <div key={h}>
              <p className="uppercase tracking-[0.16em] mb-2" style={{ color: theme.footerAccent, fontSize: 9 }}>{h}</p>
              <p style={{ color: theme.footerMuted }}>Link one</p>
              <p style={{ color: theme.footerMuted }}>Link two</p>
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
        <div className="pt-3 text-[11px]" style={{ borderTop: `1px solid ${theme.footerMuted}33`, color: theme.footerMuted }}>
          © {new Date().getFullYear()} {siteName}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden px-5 py-8 text-center" style={{ background: bg, border: `1px solid ${ADMIN.line}` }}>
      <p className="font-serif italic text-[28px]" style={{ color: theme.footerText }}>{siteName}<span style={{ color: theme.footerMuted, fontSize: '0.4em' }}>.al</span></p>
      <p className="text-[10px] uppercase tracking-[0.22em] mt-2" style={{ color: theme.footerMuted }}>Premium photo albums</p>
      <div className="flex justify-center gap-3 mt-4">
        <span className="w-8 h-8 rounded-full" style={{ background: `${theme.footerText}14` }} />
        <span className="w-8 h-8 rounded-full" style={{ background: `${theme.footerText}14` }} />
      </div>
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
              Pick a completely different navbar and footer look, tune colors or gradients, and preview before saving.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!dirty}
              onClick={() => setDraft(serverTheme)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-medium disabled:opacity-40"
              style={{ borderRadius: ADMIN.radius, border: `1px solid ${ADMIN.line}`, color: ADMIN.ink, background: ADMIN.card }}
            >
              <RotateCcw size={13} /> Reset
            </button>
            <button
              type="button"
              disabled={!dirty || updateSettings.isPending}
              onClick={save}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
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

        {/* Live demos */}
        <section className="mb-10 space-y-4">
          <p className="text-[10px] uppercase tracking-[0.16em] font-semibold" style={{ color: ADMIN.muted }}>Live preview</p>
          <NavPreview theme={draft} />
          <FooterPreview theme={draft} siteName={siteName} />
        </section>

        {/* Quick palettes */}
        <section className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.16em] font-semibold mb-3" style={{ color: ADMIN.muted }}>
            Color moods
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {WEB_THEME_PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => patch(p.patch)}
                className="text-left p-3 transition-transform active:scale-[0.98]"
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
        </section>

        {/* Nav styles */}
        <section className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.16em] font-semibold mb-3" style={{ color: ADMIN.muted }}>
            Navbar style
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {(Object.keys(NAV_STYLE_META) as NavStyleId[]).map((id) => {
              const meta = NAV_STYLE_META[id];
              const active = draft.navStyle === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => patch({ navStyle: id })}
                  className="text-left p-4 transition-all"
                  style={{
                    borderRadius: `calc(${ADMIN.radius} + 2px)`,
                    border: active ? `1.5px solid ${ADMIN.accent}` : `1px solid ${ADMIN.line}`,
                    background: active ? ADMIN.accentSoft : ADMIN.card,
                    boxShadow: active ? `0 8px 24px ${ADMIN.accent}22` : undefined,
                  }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-serif text-[16px]" style={{ color: ADMIN.ink }}>{meta.name}</p>
                    {active && (
                      <span className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: ADMIN.accent, color: ADMIN.accentOn }}>
                        <Check size={11} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] leading-snug" style={{ color: ADMIN.muted }}>{meta.blurb}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Footer styles */}
        <section className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.16em] font-semibold mb-3" style={{ color: ADMIN.muted }}>
            Footer style
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {(Object.keys(FOOTER_STYLE_META) as FooterStyleId[]).map((id) => {
              const meta = FOOTER_STYLE_META[id];
              const active = draft.footerStyle === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => patch({ footerStyle: id })}
                  className="text-left p-4 transition-all"
                  style={{
                    borderRadius: `calc(${ADMIN.radius} + 2px)`,
                    border: active ? `1.5px solid ${ADMIN.accent}` : `1px solid ${ADMIN.line}`,
                    background: active ? ADMIN.accentSoft : ADMIN.card,
                    boxShadow: active ? `0 8px 24px ${ADMIN.accent}22` : undefined,
                  }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-serif text-[16px]" style={{ color: ADMIN.ink }}>{meta.name}</p>
                    {active && (
                      <span className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: ADMIN.accent, color: ADMIN.accentOn }}>
                        <Check size={11} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] leading-snug" style={{ color: ADMIN.muted }}>{meta.blurb}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Colors */}
        <section className="grid md:grid-cols-2 gap-8">
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
                  className="px-3 py-1.5 text-[11px] font-semibold capitalize"
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
                  className="px-3 py-1.5 text-[11px] font-semibold capitalize"
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
        </section>

        <PricingCopyEditor />
      </div>
    </AdminLayout>
  );
}
