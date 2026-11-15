import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StickyNote, Plus, Trash2, X, Check, ChevronDown } from 'lucide-react';
import { useAdminTheme } from '@/components/layout/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import type { AdminTokens } from '@/lib/adminTheme';

export type AdminStickyNote = {
  id: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
};

const OPEN_KEY = 'admin-personal-notes-open';
const MAX_NOTES = 40;
const MAX_LEN = 2000;

function storageKey(userId: number | string | undefined) {
  return `admin-personal-notes-v1:${userId ?? 'anon'}`;
}

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

function readNotes(userId: number | string | undefined): AdminStickyNote[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    return parseNotes(JSON.parse(raw));
  } catch {
    return [];
  }
}

function writeNotes(userId: number | string | undefined, notes: AdminStickyNote[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(notes.slice(0, MAX_NOTES)));
  } catch {
    // private mode / quota
  }
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

/** Personal reminders for the signed-in admin only (local to this browser). */
export function AdminStickyNotes() {
  const theme = useAdminTheme().theme;
  const { user } = useAuth();
  const userId = (user as any)?.id as number | undefined;

  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(OPEN_KEY) === '1'; } catch { return false; }
  });
  const [notes, setNotes] = useState<AdminStickyNote[]>([]);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const saveFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setNotes(readNotes(userId));
    setEditingId(null);
    setEditText('');
  }, [userId]);

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

  useEffect(() => () => {
    if (saveFlashTimer.current) clearTimeout(saveFlashTimer.current);
  }, []);

  const persist = useCallback((next: AdminStickyNote[]) => {
    setNotes(next);
    writeNotes(userId, next);
    setSavedFlash(true);
    if (saveFlashTimer.current) clearTimeout(saveFlashTimer.current);
    saveFlashTimer.current = setTimeout(() => setSavedFlash(false), 1200);
  }, [userId]);

  const addNote = () => {
    const text = draft.trim();
    if (!text) return;
    if (notes.length >= MAX_NOTES) return;
    const note: AdminStickyNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text: text.slice(0, MAX_LEN),
      createdAt: new Date().toISOString(),
    };
    setDraft('');
    persist([note, ...notes]);
    draftRef.current?.focus();
  };

  const removeNote = (id: string) => {
    persist(notes.filter((n) => n.id !== id));
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
    persist(notes.map((n) =>
      n.id === editingId ? { ...n, text: text.slice(0, MAX_LEN), updatedAt: now } : n,
    ));
    setEditingId(null);
    setEditText('');
  };

  const t = theme;

  return (
    <div
      className="fixed z-[25] flex flex-col items-end gap-2 pointer-events-none"
      style={{
        right: 'max(0.85rem, env(safe-area-inset-right))',
        bottom: 'max(0.85rem, env(safe-area-inset-bottom))',
      }}
    >
      {open && (
        <div
          className="pointer-events-auto w-[min(22rem,calc(100vw-1.7rem))] max-h-[min(70dvh,520px)] flex flex-col overflow-hidden shadow-2xl"
          style={{
            background: t.card,
            border: `1px solid ${t.line}`,
            borderRadius: 16,
            boxShadow: '0 18px 48px rgba(20,12,16,0.16)',
          }}
          role="dialog"
          aria-label="Personal notes"
        >
          <div
            className="flex items-center gap-2 px-3.5 py-2.5 shrink-0"
            style={{ borderBottom: `1px solid ${t.line}` }}
          >
            <StickyNote size={15} style={{ color: t.accent }} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold leading-tight" style={{ color: t.ink }}>
                Notes
              </p>
              <p className="text-[10px] leading-tight mt-0.5" style={{ color: t.muted }}>
                Private · only you, on this device
              </p>
            </div>
            <span
              className="text-[10px] tabular-nums px-1.5 py-0.5 rounded-full font-semibold"
              style={{ background: t.bg, color: t.muted }}
            >
              {notes.length}
            </span>
            {savedFlash && (
              <span className="text-[10px] flex items-center gap-1" style={{ color: t.muted }}>
                <Check size={11} /> Saved
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
            {notes.length === 0 ? (
              <p className="text-[12px] text-center py-8 px-4 leading-relaxed" style={{ color: t.muted }}>
                Add a personal reminder — only you will see it.
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
                placeholder="Remind yourself…"
                rows={2}
                className="flex-1 min-w-0 resize-none text-[13px] leading-snug px-3 py-2 outline-none"
                style={{
                  background: t.bg,
                  border: `1px solid ${t.line}`,
                  borderRadius: 10,
                  color: t.ink,
                  fontFamily: t.fontSans,
                }}
              />
              <button
                type="button"
                onClick={addNote}
                disabled={!draft.trim() || notes.length >= MAX_NOTES}
                className="shrink-0 h-10 w-10 flex items-center justify-center text-white disabled:opacity-40 transition-opacity"
                style={{
                  background: t.accent,
                  borderRadius: 10,
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

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto relative flex items-center gap-2 pl-3.5 pr-3.5 h-11 text-white shadow-lg active:scale-[0.97] transition-transform"
        style={{
          background: open ? t.ink : t.accent,
          borderRadius: 999,
          boxShadow: '0 10px 28px rgba(20,12,16,0.18)',
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
        borderRadius: 10,
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
              borderRadius: 8,
              color: t.ink,
            }}
          />
          <div className="flex gap-1.5 justify-end">
            <button type="button" onClick={onCancelEdit}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium"
              style={{ color: t.muted }}>Cancel</button>
            <button type="button" onClick={onCommitEdit}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white"
              style={{ background: t.accent }}>Save</button>
          </div>
        </div>
      ) : (
        <>
          <button type="button" onClick={onStartEdit} className="w-full text-left">
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
