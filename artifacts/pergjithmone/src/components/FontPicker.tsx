import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  EDITOR_FONTS,
  FONT_CATEGORY_LABELS,
  ensureEditorFonts,
  loadEditorFont,
  normalizeEditorFont,
  searchEditorFonts,
  type EditorFontCategory,
} from '@/lib/editorFonts';
import { ADMIN } from '@/components/layout/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';

const CATS: Array<EditorFontCategory | 'all'> = ['all', 'serif', 'sans', 'script', 'display', 'system'];

export function FontPicker({
  value,
  onChange,
  tone = 'light',
}: {
  value?: string | null;
  onChange: (fontFamily: string) => void;
  tone?: 'light' | 'admin';
}) {
  const { lang } = useLanguage();
  const current = normalizeEditorFont(value);
  const currentFont = EDITOR_FONTS.find((f) => f.value === current);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<EditorFontCategory | 'all'>('all');
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [box, setBox] = useState({ top: 0, left: 0, width: 240 });

  const admin = tone === 'admin';
  const ink = admin ? ADMIN.ink : '#1a1a1a';
  const muted = admin ? ADMIN.muted : '#888888';
  const line = admin ? ADMIN.line : '#e8e8e8';
  const card = admin ? ADMIN.card : '#ffffff';
  const bg = admin ? ADMIN.bg : '#fafafa';

  useEffect(() => { void ensureEditorFonts(); }, []);

  const results = useMemo(() => searchEditorFonts(query, cat), [query, cat]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const width = Math.max(r.width, 260);
      const left = Math.min(r.left, window.innerWidth - width - 8);
      const below = r.bottom + 6;
      const top = below + 320 > window.innerHeight ? Math.max(8, r.top - 326) : below;
      setBox({ top, left, width });
    }
    setOpen(true);
    setTimeout(() => searchRef.current?.focus(), 20);
  };

  const pick = (fontFamily: string) => {
    loadEditorFont(fontFamily);
    onChange(fontFamily);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="relative min-w-0 flex-1">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full h-8 px-2 rounded-lg text-left text-[12px] outline-none truncate"
        style={{
          border: `1px solid ${line}`,
          background: bg,
          color: ink,
          fontFamily: current,
        }}
      >
        {currentFont?.label || 'Georgia'}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="listbox"
          className="fixed z-[80] rounded-xl overflow-hidden shadow-xl"
          style={{
            top: box.top,
            left: box.left,
            width: box.width,
            background: card,
            border: `1px solid ${line}`,
          }}
        >
          <div className="p-2 pb-1.5" style={{ borderBottom: `1px solid ${line}` }}>
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={lang === 'sq' ? 'Kërko font…' : 'Search fonts…'}
              className="w-full h-8 px-2.5 rounded-lg text-[12px] outline-none"
              style={{ background: bg, color: ink, border: `1px solid ${line}` }}
            />
            <div className="mt-1.5 flex flex-wrap gap-1">
              {CATS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCat(c)}
                  className="h-6 px-2 rounded-full text-[9px] font-semibold uppercase tracking-[0.08em]"
                  style={
                    cat === c
                      ? { background: ink, color: card }
                      : { background: bg, color: muted }
                  }
                >
                  {FONT_CATEGORY_LABELS[c][lang]}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[240px] overflow-y-auto py-1">
            {results.length === 0 ? (
              <p className="px-3 py-4 text-[12px] text-center" style={{ color: muted }}>
                {lang === 'sq' ? 'Asnjë font' : 'No fonts match'}
              </p>
            ) : (
              results.map((f) => {
                const on = f.value === current;
                return (
                  <button
                    key={f.id}
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => pick(f.value)}
                    className="w-full px-3 py-1.5 text-left text-[13px] leading-tight"
                    style={{
                      fontFamily: f.value,
                      background: on ? (admin ? ADMIN.bg : '#f3f3f3') : 'transparent',
                      color: ink,
                    }}
                  >
                    <span className="block truncate">{f.label}</span>
                    <span
                      className="block text-[9px] uppercase tracking-[0.1em] mt-0.5"
                      style={{ color: muted, fontFamily: 'inherit' }}
                    >
                      {FONT_CATEGORY_LABELS[f.category][lang]}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
