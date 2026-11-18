import type { TodoTask } from "@backend/types/todo";

export const UNDO_WINDOW_MS = 5000;
export const UNDO_STACK_LIMIT = 20;

export interface UndoEntry {
  kind: "complete" | "delete";
  task: TodoTask;
}

export interface UndoState {
  entries: UndoEntry[];
  deadline: number | null;
}

export const emptyUndo: UndoState = { entries: [], deadline: null };

export function pushUndo(state: UndoState, entry: UndoEntry, now: number): UndoState {
  const entries = [...state.entries.filter((e) => e.task.id !== entry.task.id), entry].slice(-UNDO_STACK_LIMIT);
  return { entries, deadline: now + UNDO_WINDOW_MS };
}

export function popUndo(state: UndoState, now: number): { state: UndoState; entry: UndoEntry | null } {
  if (isExpired(state, now)) return { state: emptyUndo, entry: null };
  const entry = state.entries.at(-1) ?? null;
  const entries = state.entries.slice(0, -1);
  return { state: { entries, deadline: entries.length > 0 ? now + UNDO_WINDOW_MS : null }, entry };
}

export function isExpired(state: UndoState, now: number): boolean {
  return state.deadline === null || now >= state.deadline;
}

export function expireUndo(state: UndoState, now: number): UndoState {
  return state.entries.length > 0 && isExpired(state, now) ? emptyUndo : state;
}

export function secondsLeft(state: UndoState, now: number): number {
  if (state.deadline === null || state.entries.length === 0) return 0;
  return Math.max(0, Math.min(UNDO_WINDOW_MS / 1000, Math.ceil((state.deadline - now) / 1000)));
}

export function undoVisible(state: UndoState, now: number): boolean {
  return state.entries.length > 0 && !isExpired(state, now);
}
