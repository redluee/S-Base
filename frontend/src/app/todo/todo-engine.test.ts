import { describe, expect, test } from "bun:test";
import type { TodoSnapshot, TodoTask } from "@backend/types/todo";
import { ApiError } from "@/lib/api/core";
import { createTodoEngine } from "./todo-engine";
import { TODO_CACHE_KEY, TODO_QUEUE_KEY, type TodoStorage } from "./todo-offline-storage";
import type { TodoTransport } from "./todo-transport";

function task(id: number, position: number, title = `Taak ${id}`): TodoTask {
  return {
    id,
    title,
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
  };
}

function memoryStorage(): TodoStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    get: (key) => data.get(key) ?? null,
    set: (key, value) => void data.set(key, value),
    remove: (key) => void data.delete(key),
  };
}

function setup(snapshot: TodoSnapshot, online = true) {
  const state = { online, down: false, error: null as Error | null, calls: [] as string[], snapshot };
  const guard = () => {
    if (state.error) throw state.error;
    if (state.down) throw new TypeError("Failed to fetch");
  };
  let nextId = 500;
  const api = {
    snapshot: async () => {
      guard();
      return state.snapshot;
    },
    tasks: {
      get: async (id: number) => task(id, 0),
      create: async (input: { title: string }) => {
        guard();
        state.calls.push(`create:${input.title}`);
        nextId += 1;
        return task(nextId, -5, input.title);
      },
      update: async (id: number, patch: object) => {
        guard();
        state.calls.push(`update:${id}:${JSON.stringify(patch)}`);
        return task(id, 0);
      },
      move: async (id: number) => task(id, 0),
      complete: async (id: number) => {
        guard();
        state.calls.push(`complete:${id}`);
        return { task: task(id, 0), completedCount: 99 };
      },
      uncomplete: async (id: number) => ({ task: task(id, 0), completedCount: 0 }),
      remove: async (id: number) => {
        guard();
        state.calls.push(`remove:${id}`);
        return { success: true as const };
      },
      undelete: async (id: number) => task(id, 0),
      restore: async (id: number) => task(id, 0),
    },
    subtasks: {},
    categories: {},
    projects: {},
  } as unknown as TodoTransport;
  const storage = memoryStorage();
  const remaps: [number, number][] = [];
  let synced = 0;
  const engine = createTodoEngine({
    api,
    storage,
    isOnline: () => state.online,
    events: () => ({ onRemap: (a, t) => void remaps.push([a, t.id]), onSynced: () => void (synced += 1) }),
    now: () => "2026-01-01T10:00:00.000Z",
  });
  return { engine, state, storage, remaps, synced: () => synced };
}

const SNAPSHOT: TodoSnapshot = {
  tasks: [task(1, 0), task(2, 1)],
  categories: [],
  projects: [],
  completedCount: 5,
  recentCompleted: [],
};

describe("todo engine", () => {
  test("online snapshot refreshes the cache; offline snapshot serves it", async () => {
    const { engine, state, storage } = setup(SNAPSHOT);
    await engine.transport.snapshot();
    expect(storage.data.has(TODO_CACHE_KEY)).toBe(true);
    state.online = false;
    expect((await engine.transport.snapshot()).tasks.map((t) => t.id)).toEqual([1, 2]);
    expect(engine.getStatus().offline).toBe(false);
    engine.refreshStatus();
    expect(engine.getStatus().offline).toBe(true);
  });

  test("offline complete queues, returns the cached count + 1, and replays on reconnect", async () => {
    const { engine, state, synced } = setup(SNAPSHOT);
    await engine.transport.snapshot();
    state.online = false;
    const result = await engine.transport.tasks.complete(1);
    expect(result.completedCount).toBe(6);
    expect(engine.getStatus().pending).toBe(true);
    expect((await engine.transport.snapshot()).tasks.map((t) => t.id)).toEqual([2]);
    state.online = true;
    await engine.sync();
    expect(state.calls).toEqual(["complete:1"]);
    expect(engine.getStatus().pending).toBe(false);
    expect(synced()).toBe(1);
  });

  test("offline create returns a temp id; later edits remap on replay", async () => {
    const { engine, state, remaps, storage } = setup(SNAPSHOT);
    await engine.transport.snapshot();
    state.online = false;
    const created = await engine.transport.tasks.create({ title: "Nieuw" });
    expect(created.id).toBeLessThan(0);
    await engine.transport.tasks.update(created.id, { flagged: true });
    await engine.transport.tasks.update(created.id, { notes: "n" });
    await engine.transport.tasks.complete(created.id);
    expect(JSON.parse(storage.data.get(TODO_QUEUE_KEY) ?? "{}").ops).toHaveLength(3);
    state.online = true;
    await engine.sync();
    expect(state.calls).toEqual(["create:Nieuw", 'update:501:{"flagged":true,"notes":"n"}', "complete:501"]);
    expect(remaps).toEqual([[created.id, 501]]);
    expect(storage.data.has(TODO_QUEUE_KEY)).toBe(false);
  });

  test("a transient failure while online queues the mutation instead of failing", async () => {
    const { engine, state } = setup(SNAPSHOT);
    await engine.transport.snapshot();
    state.down = true;
    const result = await engine.transport.tasks.remove(2);
    expect(result).toEqual({ success: true });
    expect(engine.getStatus().pending).toBe(true);
    expect(engine.getStatus().offline).toBe(true);
    state.down = false;
    await engine.sync();
    expect(state.calls).toEqual(["remove:2"]);
    expect(engine.getStatus()).toEqual({ offline: false, pending: false });
  });

  test("a permanent error propagates and nothing is queued", async () => {
    const { engine, state, storage } = setup(SNAPSHOT);
    await engine.transport.snapshot();
    state.error = new ApiError("todo.taskNotFound", 404);
    await expect(engine.transport.tasks.complete(1)).rejects.toBeInstanceOf(ApiError);
    expect(storage.data.has(TODO_QUEUE_KEY)).toBe(false);
    expect(engine.getStatus().pending).toBe(false);
  });

  test("subtask and category mutations are rejected while offline", async () => {
    const { engine, state } = setup(SNAPSHOT, false);
    await expect(engine.transport.categories.create({ name: "x", color: "violet" })).rejects.toBeInstanceOf(ApiError);
    expect(state.calls).toEqual([]);
  });

  test("a 401 clears the cache and queue", async () => {
    const { engine, state, storage } = setup(SNAPSHOT);
    await engine.transport.snapshot();
    state.online = false;
    await engine.transport.tasks.complete(1);
    expect(storage.data.size).toBe(2);
    state.online = true;
    state.error = new ApiError("common.unauthorized", 401);
    await engine.sync();
    expect(storage.data.size).toBe(0);
    expect(engine.getStatus().pending).toBe(false);
  });
});
