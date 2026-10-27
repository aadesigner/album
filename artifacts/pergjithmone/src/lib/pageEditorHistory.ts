export const PAGE_EDITOR_MAX_STEPS = 5;

export type PageSnapshot = Record<string, unknown>;

export function clonePageContent(content: PageSnapshot): PageSnapshot {
  return JSON.parse(JSON.stringify(content)) as PageSnapshot;
}

export type EditorHistory = {
  past: PageSnapshot[];
  future: PageSnapshot[];
  lastPath: string | null;
};

export function emptyEditorHistory(): EditorHistory {
  return { past: [], future: [], lastPath: null };
}

/** Record an edit. Consecutive patches to the same path stay one step. */
export function recordEditorEdit(
  history: EditorHistory,
  present: PageSnapshot,
  path: string,
): EditorHistory {
  if (history.lastPath === path) {
    return { ...history, future: [] };
  }
  return {
    past: [...history.past, clonePageContent(present)].slice(-PAGE_EDITOR_MAX_STEPS),
    future: [],
    lastPath: path,
  };
}

export function undoEditorHistory(
  history: EditorHistory,
  present: PageSnapshot,
): { history: EditorHistory; present: PageSnapshot } | null {
  if (!history.past.length) return null;
  const past = history.past.slice();
  const previous = past.pop()!;
  return {
    present: previous,
    history: {
      past,
      future: [clonePageContent(present), ...history.future].slice(0, PAGE_EDITOR_MAX_STEPS),
      lastPath: null,
    },
  };
}

export function redoEditorHistory(
  history: EditorHistory,
  present: PageSnapshot,
): { history: EditorHistory; present: PageSnapshot } | null {
  if (!history.future.length) return null;
  const [next, ...rest] = history.future;
  return {
    present: next,
    history: {
      past: [...history.past, clonePageContent(present)].slice(-PAGE_EDITOR_MAX_STEPS),
      future: rest,
      lastPath: null,
    },
  };
}
