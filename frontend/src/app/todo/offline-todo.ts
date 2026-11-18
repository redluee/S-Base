import { normalizeTodoTitle } from "@backend/shared/todo";
import type {
  TodoCompletionResult,
  TodoHistoryTask,
  TodoMove,
  TodoSnapshot,
  TodoTask,
  TodoTaskInput,
  TodoTaskPatch,
} from "@backend/types/todo";
import { ApiError } from "@/lib/api/core";
import { moveTask, patchTask, removeTask, replaceTaskId, sortByPosition, topPosition, upsertTask } from "./todo-state";

export type QueuedOp =
  | { kind: "create"; tempId: number; input: TodoTaskInput }
  | { kind: "update"; id: number; patch: TodoTaskPatch }
  | { kind: "move"; id: number; move: TodoMove }
  | { kind: "complete" | "uncomplete" | "remove" | "undelete"; id: number };

export interface OfflineView {
  snapshot: TodoSnapshot;
  trash: TodoTask[];
}

export interface QueueState {
  ops: QueuedOp[];
  idMap: Record<string, number>;
}

export type FailureKind = "transient" | "permanent" | "unauthorized";

export const EMPTY_QUEUE: QueueState = { ops: [], idMap: {} };
export const EMPTY_SNAPSHOT: TodoSnapshot = {
  tasks: [],
  categories: [],
  projects: [],
  completedCount: 0,
  recentCompleted: [],
};

const KEPT_ITEMS = 50;

export function classifyTodoError(err: unknown): FailureKind {
  if (!(err instanceof ApiError)) return "transient";
  const status = err.status;
  if (status === 401) return "unauthorized";
  if (status === 408 || status === 425 || status === 429 || status >= 500) return "transient";
  if (status >= 400) return "permanent";
  return "transient";
}

let tempIdCounter = Date.now();

export function createTempTaskId(): number {
  tempIdCounter += 1;
  return -tempIdCounter;
}

export function isTempTaskId(id: number | null | undefined): boolean {
  return typeof id === "number" && id < 0;
}

export function mapTaskId(id: number, idMap: Record<string, number>): number | null {
  if (!isTempTaskId(id)) return id;
  return idMap[String(id)] ?? null;
}

const COMPLEMENT: Partial<Record<QueuedOp["kind"], QueuedOp["kind"]>> = {
  complete: "uncomplete",
  uncomplete: "complete",
  remove: "undelete",
  undelete: "remove",
};

const STATE_KINDS = new Set<QueuedOp["kind"]>(["complete", "uncomplete", "remove", "undelete"]);

export function opTargetId(op: QueuedOp): number {
  return op.kind === "create" ? op.tempId : op.id;
}

export function enqueueOp(ops: QueuedOp[], op: QueuedOp): QueuedOp[] {
  if (op.kind === "update") {
    const index = ops.findIndex((o) => o.kind === "update" && o.id === op.id);
    const existing = ops[index];
    if (existing?.kind !== "update") return [...ops, op];
    const merged: QueuedOp = { kind: "update", id: op.id, patch: { ...existing.patch, ...op.patch } };
    return ops.map((o, i) => (i === index ? merged : o));
  }
  if (op.kind === "move") return [...ops.filter((o) => !(o.kind === "move" && o.id === op.id)), op];
  if (op.kind === "create") return [...ops, op];
  let last = -1;
  ops.forEach((o, i) => {
    if (STATE_KINDS.has(o.kind) && opTargetId(o) === op.id) last = i;
  });
  if (last === -1) return [...ops, op];
  if (ops[last].kind === op.kind) return ops;
  if (ops[last].kind === COMPLEMENT[op.kind]) return ops.filter((_, i) => i !== last);
  return [...ops, op];
}

function toHistoryTask(task: TodoTask, snapshot: TodoSnapshot, completedAt: string): TodoHistoryTask {
  const category = snapshot.categories.find((c) => c.id === task.categoryId);
  return { ...task, completedAt, categoryName: category?.name ?? null, categoryColor: category?.color ?? null };
}

function toOpenTask(done: TodoHistoryTask): TodoTask {
  const { categoryName, categoryColor, ...task } = { ...done };
  void categoryName;
  void categoryColor;
  return { ...task, completedAt: null };
}

export function applyOp(view: OfflineView, op: QueuedOp, now: string): OfflineView {
  const { snapshot, trash } = view;
  const { tasks } = snapshot;
  const withSnapshot = (next: Partial<TodoSnapshot>, nextTrash = trash): OfflineView => ({
    snapshot: { ...snapshot, ...next },
    trash: nextTrash,
  });

  if (op.kind === "create") {
    const task: TodoTask = {
      id: op.tempId,
      title: normalizeTodoTitle(op.input.title),
      categoryId: op.input.categoryId ?? null,
      projectId: op.input.projectId ?? null,
      dueDate: op.input.dueDate ?? null,
      flagged: false,
      notes: "",
      position: topPosition(sortByPosition(tasks)),
      createdAt: now,
      lastEditedAt: now,
      completedAt: null,
      link: null,
      subtasks: [],
    };
    return withSnapshot({ tasks: upsertTask(tasks, task) });
  }
  if (op.kind === "update") return withSnapshot({ tasks: patchTask(tasks, op.id, op.patch, now) });
  if (op.kind === "move") return withSnapshot({ tasks: moveTask(tasks, op.id, op.move) });

  const open = tasks.find((t) => t.id === op.id);
  if (op.kind === "complete") {
    if (!open) return view;
    return withSnapshot({
      tasks: removeTask(tasks, op.id),
      completedCount: snapshot.completedCount + 1,
      recentCompleted: [
        toHistoryTask(open, snapshot, now),
        ...snapshot.recentCompleted.filter((t) => t.id !== op.id),
      ].slice(0, KEPT_ITEMS),
    });
  }
  if (op.kind === "uncomplete") {
    const done = snapshot.recentCompleted.find((t) => t.id === op.id);
    if (!done) return view;
    return withSnapshot({
      tasks: upsertTask(tasks, toOpenTask(done)),
      completedCount: Math.max(0, snapshot.completedCount - 1),
      recentCompleted: snapshot.recentCompleted.filter((t) => t.id !== op.id),
    });
  }
  if (op.kind === "remove") {
    if (!open) return view;
    return withSnapshot({ tasks: removeTask(tasks, op.id) }, [open, ...trash.filter((t) => t.id !== op.id)].slice(0, KEPT_ITEMS));
  }
  const deleted = trash.find((t) => t.id === op.id);
  if (!deleted) return view;
  return withSnapshot(
    { tasks: upsertTask(tasks, deleted) },
    trash.filter((t) => t.id !== op.id),
  );
}

export function applyQueue(view: OfflineView, ops: QueuedOp[], now: string): OfflineView {
  return ops.reduce((acc, op) => applyOp(acc, op, now), view);
}

export function completionResult(view: OfflineView, id: number): TodoCompletionResult | null {
  const task = view.snapshot.recentCompleted.find((t) => t.id === id) ?? view.snapshot.tasks.find((t) => t.id === id);
  return task ? { task, completedCount: view.snapshot.completedCount } : null;
}

export function remapView(view: OfflineView, tempId: number, task: TodoTask): OfflineView {
  return {
    snapshot: {
      ...view.snapshot,
      tasks: replaceTaskId(view.snapshot.tasks, tempId, task),
      recentCompleted: view.snapshot.recentCompleted.map((t) => (t.id === tempId ? { ...t, id: task.id } : t)),
    },
    trash: view.trash.map((t) => (t.id === tempId ? task : t)),
  };
}

export function resolveOp(op: QueuedOp, idMap: Record<string, number>): QueuedOp | null {
  if (op.kind === "create") return op;
  const id = mapTaskId(op.id, idMap);
  if (id === null) return null;
  if (op.kind !== "move") return { ...op, id };
  const afterId = op.move.afterId === null ? null : mapTaskId(op.move.afterId, idMap);
  const beforeId = op.move.beforeId === null ? null : mapTaskId(op.move.beforeId, idMap);
  if (afterId === null && beforeId === null && (op.move.afterId !== null || op.move.beforeId !== null)) return null;
  return { kind: "move", id, move: { afterId, beforeId } };
}

export interface ReplayApi {
  create(input: TodoTaskInput): Promise<TodoTask>;
  update(id: number, patch: TodoTaskPatch): Promise<TodoTask>;
  move(id: number, move: TodoMove): Promise<TodoTask>;
  complete(id: number): Promise<unknown>;
  uncomplete(id: number): Promise<unknown>;
  remove(id: number): Promise<unknown>;
  undelete(id: number): Promise<unknown>;
}

export interface ReplayHooks {
  onRemap?: (tempId: number, task: TodoTask) => void;
  onProgress?: (queue: QueueState) => void;
}

export interface ReplayResult {
  queue: QueueState;
  stoppedBy: FailureKind | null;
  dropped: number;
}

function send(api: ReplayApi, op: QueuedOp): Promise<unknown> {
  switch (op.kind) {
    case "create":
      return api.create(op.input);
    case "update":
      return api.update(op.id, op.patch);
    case "move":
      return api.move(op.id, op.move);
    default:
      return api[op.kind](op.id);
  }
}

export async function replayQueue(start: QueueState, api: ReplayApi, hooks: ReplayHooks = {}): Promise<ReplayResult> {
  let queue: QueueState = { ops: [...start.ops], idMap: { ...start.idMap } };
  let dropped = 0;
  const advance = () => {
    queue = { ...queue, ops: queue.ops.slice(1) };
    hooks.onProgress?.(queue);
  };
  while (queue.ops.length > 0) {
    const op = queue.ops[0];
    const resolved = resolveOp(op, queue.idMap);
    if (!resolved) {
      dropped += 1;
      advance();
      continue;
    }
    try {
      const result = await send(api, resolved);
      if (op.kind === "create") {
        const task = result as TodoTask;
        queue = { ...queue, idMap: { ...queue.idMap, [String(op.tempId)]: task.id } };
        hooks.onRemap?.(op.tempId, task);
      }
      advance();
    } catch (err) {
      const kind = classifyTodoError(err);
      if (kind !== "permanent") return { queue, stoppedBy: kind, dropped };
      dropped += 1;
      advance();
    }
  }
  return { queue: EMPTY_QUEUE, stoppedBy: null, dropped };
}
