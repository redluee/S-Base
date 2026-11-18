import { beforeEach, describe, expect, it } from "bun:test";
import db from "../db/client";
import { todoCategories, todoTasks } from "../db/schema";
import { call, login } from "../test-http";
import { setupTestDb } from "../test-utils";

let cookie: string;
let categoryId: number;

async function create(title: string, withCategory = false): Promise<{ id: number }> {
  const res = await call(cookie, "POST", "/api/todo/tasks", {
    title,
    categoryId: withCategory ? categoryId : undefined,
  });
  expect(res.status).toBe(200);
  return (await res.json()) as { id: number };
}

async function order(): Promise<string[]> {
  const snapshot = (await (await call(cookie, "GET", "/api/todo")).json()) as { tasks: { title: string }[] };
  return snapshot.tasks.map((t) => t.title);
}

describe("todo task routes", () => {
  beforeEach(async () => {
    const { adminId } = await setupTestDb();
    db.delete(todoTasks).run();
    db.delete(todoCategories).run();
    categoryId = db
      .insert(todoCategories)
      .values({ userId: adminId, name: "Werk", color: "blue" })
      .returning()
      .get().id;
    cookie = await login();
  });

  it("requires a login", async () => {
    expect((await call("", "GET", "/api/todo")).status).toBe(401);
    expect((await call("", "POST", "/api/todo/tasks", { title: "x" })).status).toBe(401);
  });

  it("answers schema errors with common.invalidRequest", async () => {
    for (const [method, path, body] of [
      ["POST", "/api/todo/tasks", { title: 5 }],
      ["POST", "/api/todo/tasks", { title: "x", dueDate: "morgen" }],
      ["PATCH", "/api/todo/tasks/1", { flagged: "ja" }],
      ["POST", "/api/todo/tasks/1/move", { afterId: "x" }],
    ] as const) {
      const res = await call(cookie, method, path, body);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "common.invalidRequest" });
    }
  });

  it("maps validation errors to their keys", async () => {
    const empty = await call(cookie, "POST", "/api/todo/tasks", { title: "   " });
    expect(empty.status).toBe(400);
    expect(await empty.json()).toMatchObject({ error: "todo.titleRequired" });
    const date = await call(cookie, "POST", "/api/todo/tasks", { title: "x", dueDate: "2026-13-45" });
    expect(await date.json()).toEqual({ error: "todo.invalidDate" });
    const cat = await call(cookie, "POST", "/api/todo/tasks", { title: "x", categoryId: 99999 });
    expect(cat.status).toBe(404);
    expect(await cat.json()).toEqual({ error: "todo.categoryNotFound" });
    expect((await call(cookie, "GET", "/api/todo/tasks/99999")).status).toBe(404);
  });

  it("keeps the global order consistent after moves in a filtered view", async () => {
    const e = await create("e", true);
    await create("d");
    const c = await create("c", true);
    await create("b");
    const a = await create("a", true);
    expect(await order()).toEqual(["a", "b", "c", "d", "e"]);

    const res = await call(cookie, "POST", `/api/todo/tasks/${a.id}/move`, { afterId: e.id, beforeId: null });
    expect(res.status).toBe(200);
    expect(await order()).toEqual(["b", "c", "d", "e", "a"]);

    await call(cookie, "POST", `/api/todo/tasks/${e.id}/move`, { afterId: null, beforeId: c.id });
    expect(await order()).toEqual(["b", "e", "c", "d", "a"]);

    const count = (await (await call(cookie, "GET", "/api/todo/count")).json()) as { open: number };
    expect(count.open).toBe(5);
  });
});
