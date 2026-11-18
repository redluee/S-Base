import { beforeEach, describe, expect, it } from "bun:test";
import db from "../db/client";
import { todoTasks } from "../db/schema";
import { nowIso } from "../modules/todo/todo-records";
import { call, login } from "../test-http";
import { setupTestDb } from "../test-utils";

describe("todo completion routes", () => {
  let cookie: string;
  let adminId: number;

  beforeEach(async () => {
    adminId = (await setupTestDb()).adminId;
    db.delete(todoTasks).run();
    cookie = await login();
  });

  function insertTask() {
    const at = nowIso();
    return db
      .insert(todoTasks)
      .values({ userId: adminId, title: "Taak", position: 0, createdAt: at, lastEditedAt: at })
      .returning()
      .get();
  }

  it("completes, uncompletes, deletes and undeletes a task", async () => {
    const task = insertTask();
    const done = await call(cookie, "POST", `/api/todo/tasks/${task.id}/complete`);
    expect(done.status).toBe(200);
    expect(await done.json()).toMatchObject({ completedCount: 1, task: { id: task.id } });

    const again = await call(cookie, "POST", `/api/todo/tasks/${task.id}/complete`);
    expect(again.status).toBe(409);
    expect(await again.json()).toEqual({ error: "todo.alreadyCompleted" });

    const back = await call(cookie, "POST", `/api/todo/tasks/${task.id}/uncomplete`);
    expect(await back.json()).toMatchObject({ completedCount: 0, task: { completedAt: null } });

    const removed = await call(cookie, "DELETE", `/api/todo/tasks/${task.id}`);
    expect(await removed.json()).toEqual({ success: true });

    const restored = await call(cookie, "POST", `/api/todo/tasks/${task.id}/undelete`);
    expect(await restored.json()).toMatchObject({ id: task.id, title: "Taak" });
  });

  it("answers 404 for another user's task", async () => {
    const task = insertTask();
    const tester = await login("tester");
    const res = await call(tester, "POST", `/api/todo/tasks/${task.id}/complete`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "todo.taskNotFound" });
  });
});
