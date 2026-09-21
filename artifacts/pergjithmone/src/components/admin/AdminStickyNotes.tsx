import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useGetAdminSettings,
  useUpdateAdminSettings,
  getGetAdminSettingsQueryKey,
} from '@workspace/api-client-react-tsconfig';
import { useQueryClient } from '@tanstack/react-query';
import { StickyNote, Plus, Trash2, X, Loader2, Check, ChevronDown } from 'lucide-react';
import { useAdminTheme } from '@/components/layout/AdminLayout';
import type { AdminTokens } from '@/lib/adminTheme';

export type AdminStickyNote = {
  id: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
};

const OPEN_KEY = 'admin-sticky-notes-open';
const MAX_NOTES = 40;
const MAX_LEN = 2000;

function parseNotes(raw: unknown): AdminStickyNote[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((n): n is AdminStickyNote =>
      !!n && typeof n === 'object' && typeof (n as any).id === 'string' && typeof (n as any).text === 'string')
    .map((n) => ({
      id: n.id,
      text: n.text,
      createdAt: n.createdAt || new Date().toISOString(),
      ...(n.updatedAt ? { updatedAt: n.updatedAt } : {}),
    }));
}

function formatWhen(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function AdminStickyNotes() {
  const theme = useAdminTheme().theme;
  const { data: settings, isLoading } = useGetAdminSettings();
  const updateSettings = useUpdateAdminSettings();
  const queryClient = useQueryClient();

  const serverNotes = useMemo(
    () => parseNotes((settings as any)?.adminNotes),
    [settings],
  );

  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(OPEN_KEY) === '1'; } catch { return false; }
  });
  const [notes, setNotes] = useState<AdminStickyNote[]>([]);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hydratedRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!settings) return;
    // Don't clobber local edits while a save is in flight
    if (saving) return;
    setNotes(serverNotes);
    hydratedRef.current = true;
  }, [serverNotes, settings, saving]);

  useEffect(() => {
    try { localStorage.setItem(OPEN_KEY, open ? '1' : '0'); } catch { /* ignore */ }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const persist = useCallback(async (next: AdminStickyNote[]) => {
    setSaving(true);
    setError(null);
    try {
      await updateSettings.mutateAsync({
        data: { adminNotes: next } as any,
      });
      await queryClient.invalidateQueries({ queryKey: getGetAdminSettingsQueryKey() });
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1600);
    } catch (err: any) {
      setError(err?.data?.error || err?.message || 'Failed to save notes');
    } finally {
      setSaving(false);
    }
  }, [updateSettings, queryClient]);

  const schedulePersist = useCallback((next: AdminStickyNote[]) => {
    setNotes(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void persist(next); }, 450);
  }, [persist]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const addNote = () => {
    const text = draft.trim();
    if (!text) return;
    if (notes.length >= MAX_NOTES) {
      setError(`Max ${MAX_NOTES} notes`);
      return;
    }
    const note: AdminStickyNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text: text.slice(0, MAX_LEN),
      createdAt: new Date().toISOString(),
    };
    setDraft('');
    schedulePersist([note, ...notes]);
    draftRef.current?.focus();
  };

  const removeNote = (id: string) => {
    schedulePersist(notes.filter((n) => n.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setEditText('');
    }
  };

  const startEdit = (n: AdminStickyNote) => {
    setEditingId(n.id);
    setEditText(n.text);
  };

  const commitEdit = () => {
    if (!editingId) return;
    const text = editText.trim();
    if (!text) {
      removeNote(editingId);
      return;
    }
    const now = new Date().toISOString();
    schedulePersist(notes.map((n) =>
      n.id === editingId ? { ...n, text: text.slice(0, MAX_LEN), updatedAt: now } : n,
    ));
    setEditingId(null);
    setEditText('');
  };

  const t = theme;

  return (
    <div
      className="fixed z-40 flex flex-col items-end gap-2 pointer-events-none"
      style={{
        right: 'max(0.85rem, env(safe-area-inset-right))',
        bottom: 'max(0.85rem, env(safe-area-inset-bottom))',
      }}
    >
      {/* Expanded panel */}
      {open && (
        <div
          ref={panelRef}
          className="pointer-events-auto w-[min(22rem,calc(100vw-1.7rem))] max-h-[min(70dvh,520px)] flex flex-col overflow-hidden shadow-2xl"
          style={{
            background: t.card,
            border: `1px solid ${t.line}`,
            borderRadius: `calc(${t.radius} + 6px)`,
            boxShadow: '0 18px 48px rgba(20,12,16,0.18), 0 4px 12px rgba(20,12,16,0.08)',
          }}
          role="dialog"
          aria-label="Admin notes"
        >
          <div
            className="flex items-center gap-2 px-3.5 py-2.5 shrink-0"
            style={{ borderBottom: `1px solid ${t.line}`, background: t.accentSoft }}
          >
            <StickyNote size={15} style={{ color: t.accentDeep }} />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold leading-tight" style={{ color: t.ink, fontFamily: t.fontSerif }}>
                Team notes
              </p>
              <p className="text-[10px] leading-tight mt-0.5" style={{ color: t.muted }}>
                Shared across all admin pages
              </p>
            </div>
            <span className="text-[10px] tabular-nums px-1.5 py-0.5 rounded-full font-semibold"
              style={{ background: t.bg, color: t.muted }}>
              {notes.length}
            </span>
            {(saving || savedFlash) && (
              <span className="text-[10px] flex items-center gap-1" style={{ color: savedFlash ? t.success : t.muted }}>
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                {saving ? 'Saving' : 'Saved'}
              </span>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: t.muted }}
              aria-label="Close notes"
            >
              <X size={15} />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2.5 space-y-2 overscroll-contain">
            {isLoading && !hydratedRef.current ? (
              <div className="flex items-center justify-center gap-2 py-10 text-[12px]" style={{ color: t.muted }}>
                <Loader2 size={14} className="animate-spin" /> Loading…
              </div>
            ) : notes.length === 0 ? (
              <p className="text-[12px] text-center py-8 px-4 leading-relaxed" style={{ color: t.muted }}>
                No notes yet. Add a reminder for the team — it stays here on every admin page.
              </p>
            ) : (
              notes.map((n) => (
                <NoteCard
                  key={n.id}
                  note={n}
                  theme={t}
                  editing={editingId === n.id}
                  editText={editText}
                  onEditText={setEditText}
                  onStartEdit={() => startEdit(n)}
                  onCommitEdit={commitEdit}
                  onCancelEdit={() => { setEditingId(null); setEditText(''); }}
                  onRemove={() => removeNote(n.id)}
                />
              ))
            )}
          </div>

          <div className="shrink-0 px-3 pb-3 pt-1" style={{ borderTop: `1px solid ${t.line}` }}>
            {error && (
              <p className="text-[11px] mb-2 px-1" style={{ color: '#8B3A3A' }}>{error}</p>
            )}
            <div className="flex gap-2 items-end">
              <textarea
                ref={draftRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    addNote();
                  }
                }}
                placeholder="Write a note…"
                rows={2}
                className="flex-1 min-w-0 resize-none text-[13px] leading-snug px-3 py-2 outline-none"
                style={{
                  background: t.bg,
                  border: `1px solid ${t.line}`,
                  borderRadius: t.radius,
                  color: t.ink,
                  fontFamily: t.fontSans,
                }}
              />
              <button
                type="button"
                onClick={addNote}
                disabled={!draft.trim() || saving}
                className="shrink-0 h-10 w-10 flex items-center justify-center text-white disabled:opacity-40 transition-opacity"
                style={{
                  background: `linear-gradient(145deg, ${t.accent}, ${t.accentDeep})`,
                  borderRadius: t.radius,
                }}
                aria-label="Add note"
                title="Add note (Ctrl/⌘+Enter)"
              >
                <Plus size={18} />
              </button>
            </div>
            <p className="text-[9px] mt-1.5 px-0.5" style={{ color: t.muted }}>
              Ctrl/⌘+Enter to add · {draft.length}/{MAX_LEN}
            </p>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto relative flex items-center gap-2 pl-3.5 pr-3.5 h-11 text-white shadow-lg active:scale-[0.97] transition-transform"
        style={{
          background: open
            ? t.ink
            : `linear-gradient(145deg, ${t.accent}, ${t.accentDeep})`,
          borderRadius: 999,
          boxShadow: '0 10px 28px rgba(20,12,16,0.22)',
          fontFamily: t.fontSans,
        }}
        aria-expanded={open}
        aria-label={open ? 'Close notes' : 'Open notes'}
      >
        {open ? <ChevronDown size={16} /> : <StickyNote size={16} />}
        <span className="text-[12px] font-semibold tracking-wide hidden sm:inline">
          {open ? 'Close' : 'Notes'}
        </span>
        {!open && notes.length > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 min-w-[1.15rem] h-[1.15rem] px-1 flex items-center justify-center text-[9px] font-bold rounded-full"
            style={{ background: t.ink, color: '#fff', border: `2px solid ${t.bg}` }}
          >
            {notes.length > 9 ? '9+' : notes.length}
          </span>
        )}
      </button>
    </div>
  );
}

function NoteCard({
  note, theme: t, editing, editText, onEditText, onStartEdit, onCommitEdit, onCancelEdit, onRemove,
}: {
  note: AdminStickyNote;
  theme: AdminTokens;
  editing: boolean;
  editText: string;
  onEditText: (v: string) => void;
  onStartEdit: () => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className="group relative px-3 py-2.5"
      style={{
        background: t.bg,
        border: `1px solid ${t.line}`,
        borderRadius: t.radius,
        borderLeft: `3px solid ${t.accent}`,
      }}
    >
      {editing ? (
        <div className="space-y-2">
          <textarea
            autoFocus
            value={editText}
            onChange={(e) => onEditText(e.target.value.slice(0, MAX_LEN))}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onCancelEdit();
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                onCommitEdit();
              }
            }}
            rows={3}
            className="w-full resize-none text-[13px] leading-snug px-2.5 py-2 outline-none"
            style={{
              background: t.card,
              border: `1px solid ${t.line}`,
              borderRadius: `calc(${t.radius} - 2px)`,
              color: t.ink,
            }}
          />
          <div className="flex gap-1.5 justify-end">
            <button type="button" onClick={onCancelEdit}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium"
              style={{ color: t.muted }}>Cancel</button>
            <button type="button" onClick={onCommitEdit}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white"
              style={{ background: t.accentDeep }}>Save</button>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={onStartEdit}
            className="w-full text-left"
          >
            <p className="text-[13px] leading-snug whitespace-pre-wrap break-words" style={{ color: t.ink }}>
              {note.text}
            </p>
            <p className="text-[10px] mt-1.5" style={{ color: t.muted }}>
              {formatWhen(note.updatedAt || note.createdAt)}
              {note.updatedAt ? ' · edited' : ''}
            </p>
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 p-1.5 rounded-lg opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            style={{ color: '#8B3A3A', background: t.card }}
            aria-label="Delete note"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </>
      )}
    </div>
  );
}
