import type { TodoSnapshot } from "@backend/types/todo";
import { EMPTY_QUEUE, type OfflineView, type QueuedOp, type QueueState } from "./offline-todo";

export const TODO_CACHE_KEY = "sbase_todo_cache_v1";
export const TODO_QUEUE_KEY = "sbase_todo_queue_v1";

export interface TodoStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export function scopedKey(key: string, scope: number | string): string {
  return scope === "" ? key : `${key}_${scope}`;
}

export function browserStorage(scope: number | string = ""): TodoStorage | null {
  if (typeof window === "undefined") return null;
  try {
    const storage = window.localStorage;
    const scoped = (key: string) => scopedKey(key, scope);
    return {
      get: (key) => storage.getItem(scoped(key)),
      set: (key, value) => storage.setItem(scoped(key), value),
      remove: (key) => storage.removeItem(scoped(key)),
    };
  } catch {
    return null;
  }
}

function read(storage: TodoStorage | null, key: string): unknown {
  if (!storage) return null;
  try {
    const raw = storage.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(storage: TodoStorage | null, key: string, value: unknown): void {
  if (!storage) return;
  try {
    storage.set(key, JSON.stringify(value));
  } catch {}
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSnapshot(value: unknown): value is TodoSnapshot {
  return (
    isRecord(value) &&
    Array.isArray(value.tasks) &&
    Array.isArray(value.categories) &&
    Array.isArray(value.projects) &&
    Array.isArray(value.recentCompleted) &&
    typeof value.completedCount === "number"
  );
}

export function loadView(storage: TodoStorage | null): OfflineView | null {
  const data = read(storage, TODO_CACHE_KEY);
  if (!isRecord(data) || !isSnapshot(data.snapshot)) return null;
  return { snapshot: data.snapshot, trash: Array.isArray(data.trash) ? data.trash : [] };
}

export function saveView(storage: TodoStorage | null, view: OfflineView): void {
  write(storage, TODO_CACHE_KEY, view);
}

export function loadQueue(storage: TodoStorage | null): QueueState {
  const data = read(storage, TODO_QUEUE_KEY);
  if (!isRecord(data) || !Array.isArray(data.ops)) return EMPTY_QUEUE;
  const idMap = isRecord(data.idMap) ? (data.idMap as Record<string, number>) : {};
  return { ops: data.ops as QueuedOp[], idMap };
}

export function saveQueue(storage: TodoStorage | null, queue: QueueState): void {
  if (queue.ops.length > 0) return write(storage, TODO_QUEUE_KEY, queue);
  try {
    storage?.remove(TODO_QUEUE_KEY);
  } catch {}
}

export function clearTodoOffline(storage: TodoStorage | null): void {
  try {
    storage?.remove(TODO_CACHE_KEY);
    storage?.remove(TODO_QUEUE_KEY);
  } catch {}
}
