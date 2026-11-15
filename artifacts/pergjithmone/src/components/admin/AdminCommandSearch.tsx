import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'wouter';
import { Search, CornerDownLeft } from 'lucide-react';
import type { AdminTokens } from '@/lib/adminTheme';

export type AdminSearchEntry = {
  href: string;
  label: string;
  group: string;
  keywords?: string[];
  Icon?: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
};

function scoreEntry(q: string, entry: AdminSearchEntry): number {
  if (!q) return 1;
  const hay = [entry.label, entry.group, ...(entry.keywords || [])].join(' ').toLowerCase();
  if (hay.includes(q)) return q.length / Math.max(3, hay.length) + (entry.label.toLowerCase().startsWith(q) ? 2 : 0);
  const parts = q.split(/\s+/).filter(Boolean);
  if (parts.every((p) => hay.includes(p))) return 0.4;
  return 0;
}

export function AdminCommandSearch({
  theme,
  entries,
  open,
  onOpenChange,
  triggerClassName,
  hideTrigger = false,
}: {
  theme: AdminTokens;
  entries: AdminSearchEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerClassName?: string;
  /** Keyboard + dialog only (layout root). Sidebar/header render their own openers. */
  hideTrigger?: boolean;
}) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries
      .map((e) => ({ e, s: scoreEntry(q, e) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || a.e.label.localeCompare(b.e.label))
      .map((x) => x.e)
      .slice(0, 12);
  }, [entries, query]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(!open);
        return;
      }
      if (!open) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onOpenChange(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, Math.max(0, results.length - 1)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
      } else if (e.key === 'Enter' && results[active]) {
        e.preventDefault();
        setLocation(results[active].href);
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange, results, active, setLocation]);

  const go = (href: string) => {
    setLocation(href);
    onOpenChange(false);
  };

  return (
    <>
      {!hideTrigger && (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className={triggerClassName || 'w-full flex items-center gap-2 px-2.5 py-2 text-left transition-colors'}
          style={{
            borderRadius: theme.radius,
            background: `${theme.sidebarHover}`,
            color: theme.sidebarText,
            border: `1px solid ${theme.sidebarLine}`,
            fontFamily: theme.fontSans,
          }}
          aria-label="Search admin pages"
        >
          <Search size={14} strokeWidth={2} className="shrink-0 opacity-80" />
          <span className="flex-1 text-[12px] truncate opacity-80">Search pages…</span>
          <kbd
            className="hidden sm:inline text-[9px] font-semibold tracking-wide px-1.5 py-0.5 rounded"
            style={{ background: `${theme.sidebarActive}`, color: theme.sidebarTextActive, opacity: 0.85 }}
          >
            ⌘K
          </kbd>
        </button>
      )}

      {open && createPortal(
        <div
          className="fixed inset-0 z-[90] flex items-start justify-center px-3 pt-[max(12vh,env(safe-area-inset-top))] sm:pt-[14vh]"
          style={{ background: 'rgba(20,14,10,0.45)', backdropFilter: 'blur(8px)' }}
          onClick={() => onOpenChange(false)}
        >
          <div
            role="dialog"
            aria-modal
            aria-label="Search admin"
            className="w-full max-w-lg overflow-hidden shadow-2xl"
            style={{
              background: theme.card,
              borderRadius: `calc(${theme.radius} + 0.35rem)`,
              border: `1px solid ${theme.line}`,
              boxShadow: theme.cardShadow,
              maxHeight: 'min(70dvh, 520px)',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center gap-2.5 px-4 py-3"
              style={{ borderBottom: `1px solid ${theme.line}` }}
            >
              <Search size={16} style={{ color: theme.muted }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Orders, Design Studio, Settings…"
                className="flex-1 bg-transparent outline-none text-[15px]"
                style={{ color: theme.ink, fontFamily: theme.fontSans }}
              />
              <span className="text-[10px] uppercase tracking-wider" style={{ color: theme.muted }}>Esc</span>
            </div>
            <div className="overflow-y-auto flex-1 py-1.5">
              {results.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm" style={{ color: theme.muted }}>
                  No matching pages
                </p>
              ) : (
                results.map((r, i) => {
                  const Icon = r.Icon;
                  const on = i === active;
                  return (
                    <button
                      key={`${r.href}-${r.label}`}
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(r.href)}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left"
                      style={{
                        background: on ? theme.accentSoft : 'transparent',
                        color: theme.ink,
                      }}
                    >
                      <span
                        className="w-8 h-8 flex items-center justify-center shrink-0"
                        style={{
                          borderRadius: `calc(${theme.radius} - 4px)`,
                          background: on ? theme.accent : theme.bg,
                          color: on ? theme.accentOn : theme.muted,
                        }}
                      >
                        {Icon ? <Icon size={15} strokeWidth={2} /> : <Search size={14} />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13.5px] font-semibold truncate" style={{ fontFamily: theme.fontSans }}>
                          {r.label}
                        </span>
                        <span className="block text-[10px] uppercase tracking-[0.12em] mt-0.5" style={{ color: theme.muted }}>
                          {r.group}
                        </span>
                      </span>
                      {on && <CornerDownLeft size={14} style={{ color: theme.muted }} />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
