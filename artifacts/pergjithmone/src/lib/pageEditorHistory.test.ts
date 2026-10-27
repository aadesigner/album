import { describe, it, expect } from "vitest";
import {
  PAGE_EDITOR_MAX_STEPS,
  emptyEditorHistory,
  recordEditorEdit,
  undoEditorHistory,
  redoEditorHistory,
} from "./pageEditorHistory";

describe("page editor history", () => {
  it("groups consecutive edits on the same path into one undo step", () => {
    let history = emptyEditorHistory();
    let present: Record<string, unknown> = { title: "A" };

    history = recordEditorEdit(history, present, "title");
    present = { title: "AB" };
    history = recordEditorEdit(history, present, "title");
    present = { title: "ABC" };

    expect(history.past).toHaveLength(1);
    expect(history.past[0]).toEqual({ title: "A" });

    const undone = undoEditorHistory(history, present);
    expect(undone?.present).toEqual({ title: "A" });
    expect(undone?.history.past).toHaveLength(0);
    expect(undone?.history.future).toHaveLength(1);
  });

  it("keeps at most 5 undo and 5 redo steps", () => {
    let history = emptyEditorHistory();
    let present: Record<string, unknown> = { n: 0 };

    for (let i = 1; i <= 8; i++) {
      history = recordEditorEdit(history, present, `step.${i}`);
      present = { n: i };
    }

    expect(history.past).toHaveLength(PAGE_EDITOR_MAX_STEPS);
    expect(history.past[0]).toEqual({ n: 3 });
    expect(history.past[4]).toEqual({ n: 7 });

    const steps: Record<string, unknown>[] = [];
    for (let i = 0; i < 8; i++) {
      const next = undoEditorHistory(history, present);
      if (!next) break;
      history = next.history;
      present = next.present;
      steps.push(present);
    }
    expect(steps).toHaveLength(5);

    const redos: Record<string, unknown>[] = [];
    for (let i = 0; i < 8; i++) {
      const next = redoEditorHistory(history, present);
      if (!next) break;
      history = next.history;
      present = next.present;
      redos.push(present);
    }
    expect(redos).toHaveLength(5);
    expect(present).toEqual({ n: 8 });
  });

  it("clears redo when a new edit is made", () => {
    let history = emptyEditorHistory();
    let present: Record<string, unknown> = { title: "A" };
    history = recordEditorEdit(history, present, "title");
    present = { title: "B" };
    const undone = undoEditorHistory(history, present);
    expect(undone).not.toBeNull();
    history = undone!.history;
    present = undone!.present;
    expect(history.future).toHaveLength(1);

    history = recordEditorEdit(history, present, "other");
    expect(history.future).toHaveLength(0);
  });
});
