import type { TodoCompletionResult, TodoSnapshot, TodoTask } from "@backend/types/todo";
import { ApiError } from "@/lib/api/core";
import {
  applyOp,
  classifyTodoError,
  completionResult,
  createTempTaskId,
  EMPTY_QUEUE,
  EMPTY_SNAPSHOT,
  enqueueOp,
  isTempTaskId,
  type OfflineView,
  type QueuedOp,
  type QueueState,
  remapView,
  replayQueue,
} from "./offline-todo";
import {
  clearTodoOffline,
  loadQueue,
  loadView,
  saveQueue,
  saveView,
  type TodoStorage,
} from "./todo-offline-storage";
import { upsertTask } from "./todo-state";
import type { TodoTransport, TodoTransportEvents } from "./todo-transport";

export interface TodoEngineDeps {
  api: TodoTransport;
  storage: TodoStorage | null;
  isOnline: () => boolean;
  events: () => TodoTransportEvents;
  now?: () => string;
}

export interface TodoEngineStatus {
  offline: boolean;
  pending: boolean;
}

const REFRESH_DELAY_MS = 800;

export function createTodoEngine(deps: TodoEngineDeps) {
  const { api, storage } = deps;
  const now = deps.now ?? (() => new Date().toISOString());
  let view: OfflineView | null = loadView(storage);
  let queue: QueueState = loadQueue(storage);
  let frozen = 0;
  let flushing: Promise<void> | null = null;
  let networkDown = false;
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;
  let status: TodoEngineStatus = { offline: false, pending: queue.ops.length > 0 };
  const listeners = new Set<() => void>();

  const computeStatus = (): TodoEngineStatus => ({
    offline: !deps.isOnline() || networkDown,
    pending: queue.ops.length > 0,
  });
  const emit = () => {
    const next = computeStatus();
    if (next.offline === status.offline && next.pending === status.pending) return;
    status = next;
    for (const listener of listeners) listener();
  };
  const setNetworkDown = (down: boolean) => {
    networkDown = down;
    emit();
  };
  const setQueue = (next: QueueState) => {
    queue = next;
    saveQueue(storage, queue);
    emit();
  };
  const setView = (next: OfflineView) => {
    view = next;
    saveView(storage, view);
  };
  const clearAll = () => {
    view = null;
    queue = EMPTY_QUEUE;
    frozen = 0;
    clearTodoOffline(storage);
    emit();
  };
  const unavailable = () => new ApiError("todo.saveFailed", 503);

  async function fetchSnapshot(): Promise<TodoSnapshot> {
    const snapshot = await api.snapshot();
    setView({ snapshot, trash: view?.trash ?? [] });
    setNetworkDown(false);
    return snapshot;
  }

  function failure(err: unknown): "transient" | "permanent" {
    const kind = classifyTodoError(err);
    if (kind === "unauthorized") {
      clearAll();
      return "permanent";
    }
    if (kind === "transient") setNetworkDown(true);
    return kind;
  }

  async function runFlush(notify: boolean): Promise<void> {
    let flushed = false;
    do {
      const before = queue.ops.length;
      frozen = before;
      const result = await replayQueue(queue, api.tasks, {
        onRemap: (tempId, task) => {
          if (view) setView(remapView(view, tempId, task));
          deps.events().onRemap(tempId, task);
        },
        onProgress: (progress) => {
          frozen = Math.max(0, frozen - 1);
          setQueue({ idMap: progress.idMap, ops: queue.ops.slice(1) });
        },
      });
      frozen = 0;
      flushed = flushed || before > 0;
      if (result.stoppedBy === "unauthorized") return clearAll();
      if (result.stoppedBy === "transient") return setNetworkDown(true);
    } while (queue.ops.length > 0);
    setNetworkDown(false);
    if (flushed && notify) deps.events().onSynced();
  }

  function flush(notify = true): Promise<void> {
    if (flushing) return flushing;
    if (!deps.isOnline() || queue.ops.length === 0) return Promise.resolve();
    flushing = runFlush(notify).finally(() => {
      flushing = null;
    });
    return flushing;
  }

  async function sync(): Promise<void> {
    await flush();
    if (queue.ops.length > 0) await flush();
    if (deps.isOnline() && queue.ops.length === 0) {
      try {
        await fetchSnapshot();
      } catch (err) {
        failure(err);
      }
    }
  }

  function scheduleRefresh() {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      if (deps.isOnline() && queue.ops.length === 0) void fetchSnapshot().catch(failure);
    }, REFRESH_DELAY_MS);
  }

  function enqueue(op: QueuedOp) {
    const tail = enqueueOp(queue.ops.slice(frozen), op);
    setQueue({ ...queue, ops: [...queue.ops.slice(0, frozen), ...tail] });
  }

  function queueOp<T>(op: QueuedOp, result: (v: OfflineView) => T | null): T {
    const base = view ?? { snapshot: EMPTY_SNAPSHOT, trash: [] };
    const applied = applyOp(base, op, now());
    const value = result(applied);
    if (value === null) throw unavailable();
    setView(applied);
    enqueue(op);
    void flush();
    return value;
  }

  async function mutate<T>(
    op: () => QueuedOp,
    ids: number[],
    send: () => Promise<T>,
    result: (v: OfflineView) => T | null,
    writeThrough: (v: OfflineView, value: T) => OfflineView,
  ): Promise<T> {
    if (queue.ops.length > 0 || !deps.isOnline() || ids.some(isTempTaskId)) return queueOp(op(), result);
    try {
      const value = await send();
      setNetworkDown(false);
      if (view) setView(writeThrough(view, value));
      return value;
    } catch (err) {
      if (failure(err) === "permanent") throw err;
      return queueOp(op(), result);
    }
  }

  async function onlineOnly<T>(ids: number[], send: () => Promise<T>): Promise<T> {
    if (!deps.isOnline() || ids.some(isTempTaskId)) throw unavailable();
    try {
      const value = await send();
      setNetworkDown(false);
      scheduleRefresh();
      return value;
    } catch (err) {
      failure(err);
      throw err;
    }
  }

  const upserting = (v: OfflineView, task: TodoTask): OfflineView => ({
    snapshot: { ...v.snapshot, tasks: upsertTask(v.snapshot.tasks, task) },
    trash: v.trash.filter((t) => t.id !== task.id),
  });
  const taskOf = (id: number) => (v: OfflineView) => v.snapshot.tasks.find((t) => t.id === id) ?? null;
  const completion = (id: number) => (v: OfflineView) => completionResult(v, id);
  const throughCompletion =
    (op: QueuedOp & { id: number }) =>
    (v: OfflineView, value: TodoCompletionResult): OfflineView => {
      const applied = applyOp(v, op, now());
      return { ...applied, snapshot: { ...applied.snapshot, completedCount: value.completedCount } };
    };

  const tasks: TodoTransport["tasks"] = {
    get: (id) => onlineOnly([id], () => api.tasks.get(id)),
    restore: (id) => onlineOnly([id], () => api.tasks.restore(id)),
    create: (input) => {
      const tempId = createTempTaskId();
      return mutate(
        () => ({ kind: "create", tempId, input }),
        [],
        () => api.tasks.create(input),
        (v) => v.snapshot.tasks.find((t) => t.id === tempId) ?? null,
        upserting,
      );
    },
    update: (id, patch) =>
      mutate(() => ({ kind: "update", id, patch }), [id], () => api.tasks.update(id, patch), taskOf(id), upserting),
    move: (id, move) =>
      mutate(() => ({ kind: "move", id, move }), [id, move.afterId ?? 0, move.beforeId ?? 0], () => api.tasks.move(id, move), taskOf(id), upserting),
    complete: (id) =>
      mutate(() => ({ kind: "complete", id }), [id], () => api.tasks.complete(id), completion(id), throughCompletion({ kind: "complete", id })),
    uncomplete: (id) =>
      mutate(() => ({ kind: "uncomplete", id }), [id], () => api.tasks.uncomplete(id), completion(id), throughCompletion({ kind: "uncomplete", id })),
    remove: (id) =>
      mutate(
        () => ({ kind: "remove", id }),
        [id],
        () => api.tasks.remove(id),
        (v) => (v.trash.some((t) => t.id === id) ? { success: true as const } : null),
        (v) => applyOp(v, { kind: "remove", id }, now()),
      ),
    undelete: (id) =>
      mutate(() => ({ kind: "undelete", id }), [id], () => api.tasks.undelete(id), taskOf(id), upserting),
  };

  const transport: TodoTransport = {
    snapshot: async () => {
      if (deps.isOnline() && queue.ops.length > 0) await flush(false);
      if (deps.isOnline() && queue.ops.length === 0) {
        try {
          return await fetchSnapshot();
        } catch (err) {
          if (failure(err) === "permanent") throw err;
        }
      }
      if (view) return view.snapshot;
      throw unavailable();
    },
    tasks,
    subtasks: {
      create: (taskId, input) => onlineOnly([taskId], () => api.subtasks.create(taskId, input)),
      update: (id, patch) => onlineOnly([], () => api.subtasks.update(id, patch)),
      move: (id, move) => onlineOnly([], () => api.subtasks.move(id, move)),
      remove: (id) => onlineOnly([], () => api.subtasks.remove(id)),
    },
    categories: {
      create: (input) => onlineOnly([], () => api.categories.create(input)),
      update: (id, patch) => onlineOnly([], () => api.categories.update(id, patch)),
      reorder: (ids) => onlineOnly([], () => api.categories.reorder(ids)),
      remove: (id) => onlineOnly([], () => api.categories.remove(id)),
    },
    projects: {
      create: (input) => onlineOnly([input.categoryId], () => api.projects.create(input)),
      update: (id, patch) => onlineOnly([], () => api.projects.update(id, patch)),
      reorder: (categoryId, ids) => onlineOnly([], () => api.projects.reorder(categoryId, ids)),
      remove: (id) => onlineOnly([], () => api.projects.remove(id)),
    },
  };

  return {
    transport,
    sync,
    refreshStatus: emit,
    getStatus: () => status,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose: () => {
      if (refreshTimer) clearTimeout(refreshTimer);
    },
  };
}

export type TodoEngine = ReturnType<typeof createTodoEngine>;
