import { beforeEach, describe, expect, it } from "bun:test";
import db from "../db/client";
import { todoTasks } from "../db/schema";
import { call, login } from "../test-http";
import { setupTestDb } from "../test-utils";

type Sub = { id: number; position: number; title: string; done: boolean; taskId: number };

describe("todo subtask routes", () => {
  let cookie: string;
  let taskId: number;

  beforeEach(async () => {
    const { adminId } = await setupTestDb();
    cookie = await login();
    db.delete(todoTasks).run();
    const at = new Date().toISOString();
    taskId = db
      .insert(todoTasks)
      .values({ userId: adminId, title: "Taak", position: 0, createdAt: at, lastEditedAt: at })
      .returning()
      .get().id;
  });

  it("creates, updates, moves and deletes", async () => {
    const a = (await (await call(cookie, "POST", `/api/todo/tasks/${taskId}/subtasks`, { title: "A" })).json()) as Sub;
    const b = (await (await call(cookie, "POST", `/api/todo/tasks/${taskId}/subtasks`, { title: "B" })).json()) as Sub;
    expect(a).toMatchObject({ title: "A", done: false, taskId });

    const done = await call(cookie, "PATCH", `/api/todo/subtasks/${a.id}`, { done: true });
    expect(((await done.json()) as Sub).done).toBe(true);

    const moved = await call(cookie, "POST", `/api/todo/subtasks/${b.id}/move`, { afterId: null, beforeId: a.id });
    expect(((await moved.json()) as Sub).position).toBeLessThan(a.position);

    const removed = await call(cookie, "DELETE", `/api/todo/subtasks/${a.id}`);
    expect(await removed.json()).toEqual({ success: true });
  });

  it("answers with the error contract", async () => {
    const missingTask = await call(cookie, "POST", "/api/todo/tasks/999999/subtasks", { title: "A" });
    expect(missingTask.status).toBe(404);
    expect(await missingTask.json()).toEqual({ error: "todo.taskNotFound" });

    const missingSub = await call(cookie, "PATCH", "/api/todo/subtasks/999999", { done: true });
    expect(missingSub.status).toBe(404);
    expect(await missingSub.json()).toEqual({ error: "todo.subtaskNotFound" });

    const empty = await call(cookie, "POST", `/api/todo/tasks/${taskId}/subtasks`, { title: " " });
    expect(empty.status).toBe(400);
    expect(await empty.json()).toEqual({ error: "todo.titleRequired" });

    const invalid = await call(cookie, "PATCH", "/api/todo/subtasks/1", { done: "yes" });
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({ error: "common.invalidRequest" });
  });
});
