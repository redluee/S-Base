import { describe, expect, test } from "bun:test";
import type { TodoSnapshot, TodoTask } from "@backend/types/todo";
import { ApiError } from "@/lib/api/core";
import {
  applyOp,
  applyQueue,
  classifyTodoError,
  EMPTY_QUEUE,
  enqueueOp,
  type OfflineView,
  type QueuedOp,
  type QueueState,
  remapView,
  replayQueue,
  type ReplayApi,
  resolveOp,
} from "./offline-todo";

const NOW = "2026-01-01T10:00:00.000Z";

function task(id: number, position: number, extra: Partial<TodoTask> = {}): TodoTask {
  return {
    id,
    title: `Taak ${id}`,
    categoryId: null,
    projectId: null,
    dueDate: null,
    flagged: false,
    notes: "",
    position,
    createdAt: "2025-12-01T00:00:00.000Z",
    lastEditedAt: "2025-12-01T00:00:00.000Z",
    completedAt: null,
    link: null,
    subtasks: [],
    ...extra,
  };
}

function view(tasks: TodoTask[], extra: Partial<TodoSnapshot> = {}): OfflineView {
  return {
    snapshot: { tasks, categories: [], projects: [], completedCount: 10, recentCompleted: [], ...extra },
    trash: [],
  };
}

describe("classifyTodoError", () => {
  test("classifies by status", () => {
    expect(classifyTodoError(new TypeError("Failed to fetch"))).toBe("transient");
    expect(classifyTodoError(new ApiError("x", 401))).toBe("unauthorized");
    expect(classifyTodoError(new ApiError("x", 503))).toBe("transient");
    expect(classifyTodoError(new ApiError("x", 429))).toBe("transient");
    expect(classifyTodoError(new ApiError("x", 404))).toBe("permanent");
    expect(classifyTodoError(new ApiError("x", 409))).toBe("permanent");
    expect(classifyTodoError(new ApiError("x", 500))).toBe("transient");
  });
});

describe("enqueueOp coalescing", () => {
  test("merges edits per field, latest value wins, other fields stay untouched", () => {
    let ops: QueuedOp[] = [];
    ops = enqueueOp(ops, { kind: "update", id: 5, patch: { title: "A", flagged: true } });
    ops = enqueueOp(ops, { kind: "update", id: 5, patch: { title: "B" } });
    ops = enqueueOp(ops, { kind: "update", id: 6, patch: { notes: "x" } });
    expect(ops).toEqual([
      { kind: "update", id: 5, patch: { title: "B", flagged: true } },
      { kind: "update", id: 6, patch: { notes: "x" } },
    ]);
  });

  test("only the last move per task survives", () => {
    let ops: QueuedOp[] = [];
    ops = enqueueOp(ops, { kind: "move", id: 1, move: { afterId: 2, beforeId: null } });
    ops = enqueueOp(ops, { kind: "move", id: 3, move: { afterId: null, beforeId: 1 } });
    ops = enqueueOp(ops, { kind: "move", id: 1, move: { afterId: 4, beforeId: null } });
    expect(ops).toEqual([
      { kind: "move", id: 3, move: { afterId: null, beforeId: 1 } },
      { kind: "move", id: 1, move: { afterId: 4, beforeId: null } },
    ]);
  });

  test("complete then uncomplete cancels out, and so do remove and undelete", () => {
    let ops = enqueueOp([], { kind: "complete", id: 1 });
    ops = enqueueOp(ops, { kind: "uncomplete", id: 1 });
    expect(ops).toEqual([]);
    ops = enqueueOp(ops, { kind: "remove", id: 2 });
    ops = enqueueOp(ops, { kind: "undelete", id: 2 });
    expect(ops).toEqual([]);
  });

  test("a repeated state op is ignored and unrelated ops are kept", () => {
    let ops = enqueueOp([], { kind: "complete", id: 1 });
    ops = enqueueOp(ops, { kind: "complete", id: 1 });
    ops = enqueueOp(ops, { kind: "remove", id: 1 });
    ops = enqueueOp(ops, { kind: "complete", id: 2 });
    expect(ops.map((o) => o.kind)).toEqual(["complete", "remove", "complete"]);
  });

  test("undelete after complete+remove only cancels the remove", () => {
    let ops = enqueueOp([], { kind: "complete", id: 1 });
    ops = enqueueOp(ops, { kind: "remove", id: 1 });
    ops = enqueueOp(ops, { kind: "undelete", id: 1 });
    expect(ops).toEqual([{ kind: "complete", id: 1 }]);
  });
});

describe("applyOp", () => {
  test("create puts a temp task on top with normalised title", () => {
    const next = applyOp(view([task(1, 0), task(2, 1)]), { kind: "create", tempId: -7, input: { title: "  Nieuw  " } }, NOW);
    expect(next.snapshot.tasks.map((t) => t.id)).toEqual([-7, 1, 2]);
    expect(next.snapshot.tasks[0]).toMatchObject({ title: "Nieuw", createdAt: NOW, completedAt: null });
  });

  test("update patches fields and touches lastEditedAt", () => {
    const next = applyOp(view([task(1, 0)]), { kind: "update", id: 1, patch: { flagged: true } }, NOW);
    expect(next.snapshot.tasks[0]).toMatchObject({ flagged: true, lastEditedAt: NOW });
  });

  test("move reorders", () => {
    const next = applyOp(view([task(1, 0), task(2, 1), task(3, 2)]), { kind: "move", id: 3, move: { afterId: null, beforeId: 1 } }, NOW);
    expect(next.snapshot.tasks.map((t) => t.id)).toEqual([3, 1, 2]);
  });

  test("complete moves the task to recent and counts up; uncomplete reverses", () => {
    const done = applyOp(view([task(1, 0), task(2, 1)]), { kind: "complete", id: 1 }, NOW);
    expect(done.snapshot.tasks.map((t) => t.id)).toEqual([2]);
    expect(done.snapshot.completedCount).toBe(11);
    expect(done.snapshot.recentCompleted[0]).toMatchObject({ id: 1, completedAt: NOW });
    const back = applyOp(done, { kind: "uncomplete", id: 1 }, NOW);
    expect(back.snapshot.tasks.map((t) => t.id)).toEqual([1, 2]);
    expect(back.snapshot.tasks[0].completedAt).toBeNull();
    expect(back.snapshot.completedCount).toBe(10);
    expect(back.snapshot.recentCompleted).toEqual([]);
  });

  test("remove keeps the task in trash so undelete can bring it back", () => {
    const removed = applyOp(view([task(1, 0)]), { kind: "remove", id: 1 }, NOW);
    expect(removed.snapshot.tasks).toEqual([]);
    expect(removed.trash.map((t) => t.id)).toEqual([1]);
    const back = applyOp(removed, { kind: "undelete", id: 1 }, NOW);
    expect(back.snapshot.tasks.map((t) => t.id)).toEqual([1]);
    expect(back.trash).toEqual([]);
  });

  test("ops on unknown tasks leave the view unchanged", () => {
    const base = view([task(1, 0)]);
    expect(applyOp(base, { kind: "complete", id: 99 }, NOW)).toBe(base);
    expect(applyOp(base, { kind: "remove", id: 99 }, NOW)).toBe(base);
    expect(applyOp(base, { kind: "undelete", id: 99 }, NOW)).toBe(base);
  });

  test("applyQueue folds in order (create, update, complete on a temp id)", () => {
    const ops: QueuedOp[] = [
      { kind: "create", tempId: -1, input: { title: "T" } },
      { kind: "update", id: -1, patch: { notes: "n" } },
      { kind: "complete", id: -1 },
    ];
    const next = applyQueue(view([]), ops, NOW);
    expect(next.snapshot.tasks).toEqual([]);
    expect(next.snapshot.recentCompleted[0]).toMatchObject({ id: -1, notes: "n" });
  });
});

describe("remap and resolve", () => {
  test("remapView swaps a temp id for the real task", () => {
    const created = applyOp(view([task(1, 0)]), { kind: "create", tempId: -3, input: { title: "T" } }, NOW);
    const next = remapView(created, -3, task(40, -1, { title: "T" }));
    expect(next.snapshot.tasks.map((t) => t.id)).toEqual([40, 1]);
  });

  test("resolveOp maps ids and move anchors, drops unresolved ones", () => {
    const map = { "-1": 40 };
    expect(resolveOp({ kind: "complete", id: -1 }, map)).toEqual({ kind: "complete", id: 40 });
    expect(resolveOp({ kind: "complete", id: -2 }, map)).toBeNull();
    expect(resolveOp({ kind: "move", id: 5, move: { afterId: -1, beforeId: null } }, map)).toEqual({
      kind: "move",
      id: 5,
      move: { afterId: 40, beforeId: null },
    });
    expect(resolveOp({ kind: "move", id: 5, move: { afterId: -2, beforeId: null } }, map)).toBeNull();
    expect(resolveOp({ kind: "move", id: 5, move: { afterId: -2, beforeId: 9 } }, map)).toEqual({
      kind: "move",
      id: 5,
      move: { afterId: null, beforeId: 9 },
    });
  });
});

function recorder(overrides: Partial<ReplayApi> = {}) {
  const calls: string[] = [];
  let nextId = 100;
  const api: ReplayApi = {
    create: async (input) => {
      calls.push(`create:${input.title}`);
      nextId += 1;
      return task(nextId, 0, { title: input.title });
    },
    update: async (id, patch) => {
      calls.push(`update:${id}:${JSON.stringify(patch)}`);
      return task(id, 0);
    },
    move: async (id, move) => {
      calls.push(`move:${id}:${move.afterId}:${move.beforeId}`);
      return task(id, 0);
    },
    complete: async (id) => void calls.push(`complete:${id}`),
    uncomplete: async (id) => void calls.push(`uncomplete:${id}`),
    remove: async (id) => void calls.push(`remove:${id}`),
    undelete: async (id) => void calls.push(`undelete:${id}`),
    ...overrides,
  };
  return { api, calls };
}

describe("replayQueue", () => {
  test("remaps a temp id across create, update and complete, in order", async () => {
    const { api, calls } = recorder();
    const remaps: [number, number][] = [];
    const start: QueueState = {
      idMap: {},
      ops: [
        { kind: "create", tempId: -1, input: { title: "T" } },
        { kind: "update", id: -1, patch: { flagged: true } },
        { kind: "complete", id: -1 },
        { kind: "move", id: 7, move: { afterId: -1, beforeId: null } },
      ],
    };
    const result = await replayQueue(start, api, { onRemap: (temp, t) => remaps.push([temp, t.id]) });
    expect(calls).toEqual(["create:T", 'update:101:{"flagged":true}', "complete:101", "move:7:101:null"]);
    expect(remaps).toEqual([[-1, 101]]);
    expect(result).toEqual({ queue: EMPTY_QUEUE, stoppedBy: null, dropped: 0 });
  });

  test("drops an op on a permanent error and continues", async () => {
    const { api, calls } = recorder({
      update: async () => {
        throw new ApiError("todo.taskNotFound", 404);
      },
    });
    const result = await replayQueue(
      { idMap: {}, ops: [{ kind: "update", id: 1, patch: { title: "x" } }, { kind: "complete", id: 2 }] },
      api,
    );
    expect(calls).toEqual(["complete:2"]);
    expect(result.dropped).toBe(1);
    expect(result.stoppedBy).toBeNull();
  });

  test("a failed create drops the later ops on its temp id", async () => {
    const { api, calls } = recorder({
      create: async () => {
        throw new ApiError("todo.invalid", 400);
      },
    });
    const result = await replayQueue(
      {
        idMap: {},
        ops: [
          { kind: "create", tempId: -1, input: { title: "T" } },
          { kind: "complete", id: -1 },
          { kind: "complete", id: 5 },
        ],
      },
      api,
    );
    expect(calls).toEqual(["complete:5"]);
    expect(result.dropped).toBe(2);
  });

  test("stops on a transient error and keeps the rest, including the id map", async () => {
    let fail = true;
    const { api } = recorder({
      complete: async () => {
        if (fail) throw new TypeError("Failed to fetch");
      },
    });
    const progress: QueueState[] = [];
    const start: QueueState = {
      idMap: {},
      ops: [
        { kind: "create", tempId: -1, input: { title: "T" } },
        { kind: "complete", id: -1 },
        { kind: "remove", id: 9 },
      ],
    };
    const result = await replayQueue(start, api, { onProgress: (q) => progress.push(q) });
    expect(result.stoppedBy).toBe("transient");
    expect(result.queue.ops).toEqual([
      { kind: "complete", id: -1 },
      { kind: "remove", id: 9 },
    ]);
    expect(result.queue.idMap).toEqual({ "-1": 101 });
    expect(progress).toHaveLength(1);
    fail = false;
    const again = await replayQueue(result.queue, api);
    expect(again.stoppedBy).toBeNull();
  });

  test("stops on 401", async () => {
    const { api } = recorder({
      remove: async () => {
        throw new ApiError("x", 401);
      },
    });
    const result = await replayQueue({ idMap: {}, ops: [{ kind: "remove", id: 1 }] }, api);
    expect(result.stoppedBy).toBe("unauthorized");
    expect(result.queue.ops).toHaveLength(1);
  });
});
