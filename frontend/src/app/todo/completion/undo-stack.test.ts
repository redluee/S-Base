import { describe, expect, it } from "bun:test";
import type { TodoTask } from "@backend/types/todo";
import { emptyUndo, expireUndo, popUndo, pushUndo, secondsLeft, UNDO_WINDOW_MS, undoVisible } from "./undo-stack";

const task = (id: number) => ({ id, title: `T${id}` }) as TodoTask;

describe("undo stack", () => {
  it("pushes actions and resets the countdown each time", () => {
    let state = pushUndo(emptyUndo, { kind: "complete", task: task(1) }, 0);
    expect(secondsLeft(state, 0)).toBe(5);
    expect(secondsLeft(state, 3200)).toBe(2);
    state = pushUndo(state, { kind: "delete", task: task(2) }, 3200);
    expect(state.deadline).toBe(3200 + UNDO_WINDOW_MS);
    expect(state.entries.map((e) => e.kind)).toEqual(["complete", "delete"]);
  });

  it("undoes the latest action first and resets the countdown", () => {
    let state = pushUndo(emptyUndo, { kind: "complete", task: task(1) }, 0);
    state = pushUndo(state, { kind: "delete", task: task(2) }, 100);
    const first = popUndo(state, 1000);
    expect(first.entry?.task.id).toBe(2);
    expect(first.state.deadline).toBe(1000 + UNDO_WINDOW_MS);
    const second = popUndo(first.state, 2000);
    expect(second.entry?.task.id).toBe(1);
    expect(second.state).toEqual(emptyUndo);
    expect(undoVisible(second.state, 2000)).toBe(false);
  });

  it("clears the stack when the time runs out", () => {
    const state = pushUndo(emptyUndo, { kind: "complete", task: task(1) }, 0);
    expect(undoVisible(state, 4999)).toBe(true);
    expect(undoVisible(state, 5000)).toBe(false);
    expect(expireUndo(state, 5000)).toEqual(emptyUndo);
    expect(expireUndo(state, 10)).toBe(state);
    expect(popUndo(state, 6000).entry).toBeNull();
  });

  it("keeps one entry per task", () => {
    let state = pushUndo(emptyUndo, { kind: "complete", task: task(1) }, 0);
    state = pushUndo(state, { kind: "delete", task: task(1) }, 10);
    expect(state.entries).toEqual([{ kind: "delete", task: task(1) }]);
  });
});
