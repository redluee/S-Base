import { beforeEach, describe, expect, it } from "bun:test";
import db from "../db/client";
import { todoTasks } from "../db/schema";
import { call, login } from "../test-http";
import { setupTestDb } from "../test-utils";
import type { TodoHistoryPage, TodoTask } from "../types/todo";

describe("todo history routes", () => {
  let cookie: string;
  let userId: number;

  beforeEach(async () => {
    userId = (await setupTestDb()).adminId;
    cookie = await login();
    db.delete(todoTasks).run();
  });

  function insert(title: string, completedAt: string | null) {
    return db
      .insert(todoTasks)
      .values({
        userId,
        title,
        position: 0,
        completedAt,
        createdAt: "2026-01-01T00:00:00.000Z",
        lastEditedAt: "2026-01-01T00:00:00.000Z",
      })
      .returning()
      .get();
  }

  it("lists, paginates and rejects a bad cursor", async () => {
    insert("A", "2026-03-01T10:00:00.000Z");
    insert("B", "2026-03-02T10:00:00.000Z");
    const page = (await (await call(cookie, "GET", "/api/todo/history?limit=1")).json()) as TodoHistoryPage;
    expect(page.items.map((i) => i.title)).toEqual(["B"]);
    const next = (await (
      await call(cookie, "GET", `/api/todo/history?limit=1&cursor=${page.nextCursor}`)
    ).json()) as TodoHistoryPage;
    expect(next.items.map((i) => i.title)).toEqual(["A"]);
    expect(next.nextCursor).toBeNull();
    const bad = await call(cookie, "GET", "/api/todo/history?cursor=zzz");
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ error: "todo.invalidCursor" });
  });

  it("returns the pulse and restores a completed task", async () => {
    const task = insert("Klaar", new Date().toISOString());
    const pulse = await (await call(cookie, "GET", "/api/todo/history/pulse")).json();
    expect(pulse).toHaveLength(365);
    const restored = await call(cookie, "POST", `/api/todo/tasks/${task.id}/restore`);
    expect(restored.status).toBe(200);
    expect(((await restored.json()) as TodoTask).completedAt).toBeNull();
    const again = await call(cookie, "POST", `/api/todo/tasks/${task.id}/restore`);
    expect(again.status).toBe(400);
    expect(await again.json()).toEqual({ error: "todo.notCompleted" });
    expect((await call(cookie, "POST", "/api/todo/tasks/99999/restore")).status).toBe(404);
  });
});
