import { beforeEach, describe, expect, it } from "bun:test";
import db from "../db/client";
import { todoCategories, todoTasks } from "../db/schema";
import { call, login } from "../test-http";
import { setupTestDb } from "../test-utils";
import type { TodoCategory, TodoProject } from "../types/todo";

describe("todo category routes", () => {
  let cookie: string;

  beforeEach(async () => {
    await setupTestDb();
    db.delete(todoTasks).run();
    db.delete(todoCategories).run();
    cookie = await login();
  });

  async function createCategory(name: string, color = "blue"): Promise<TodoCategory> {
    const res = await call(cookie, "POST", "/api/todo/categories", { name, color });
    expect(res.status).toBe(200);
    return (await res.json()) as TodoCategory;
  }

  it("creates, updates, reorders and deletes categories", async () => {
    const a = await createCategory("Werk");
    const b = await createCategory("Thuis", "pink");
    const patched = await call(cookie, "PATCH", `/api/todo/categories/${a.id}`, { color: "teal" });
    expect(((await patched.json()) as TodoCategory).color).toBe("teal");
    const withIcon = await call(cookie, "PATCH", `/api/todo/categories/${b.id}`, { icon: "home" });
    expect(((await withIcon.json()) as TodoCategory).icon).toBe("home");

    const reordered = await call(cookie, "POST", "/api/todo/categories/reorder", { ids: [b.id, a.id] });
    expect(((await reordered.json()) as TodoCategory[]).map((c) => c.id)).toEqual([b.id, a.id]);

    const removed = await call(cookie, "DELETE", `/api/todo/categories/${a.id}`);
    expect(await removed.json()).toEqual({ success: true, uncategorised: 0 });
  });

  it("answers validation and not-found errors with keys", async () => {
    const bad = await call(cookie, "POST", "/api/todo/categories", { name: " ", color: "blue" });
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ error: "todo.nameRequired" });

    const badColor = await call(cookie, "POST", "/api/todo/categories", { name: "X", color: "purple" });
    expect(await badColor.json()).toEqual({ error: "common.invalidRequest" });

    const badIcon = await call(cookie, "POST", "/api/todo/categories", { name: "X", color: "blue", icon: "rocket" });
    expect(await badIcon.json()).toEqual({ error: "common.invalidRequest" });

    const missing = await call(cookie, "PATCH", "/api/todo/categories/999999", { color: "teal" });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "todo.categoryNotFound" });

    const order = await call(cookie, "POST", "/api/todo/categories/reorder", { ids: [999999] });
    expect(await order.json()).toEqual({ error: "todo.invalidOrder" });
  });

  it("manages projects through the routes", async () => {
    const work = await createCategory("Werk");
    const created = await call(cookie, "POST", "/api/todo/projects", { categoryId: work.id, name: "Klus" });
    const project = (await created.json()) as TodoProject;
    expect(project).toMatchObject({ name: "Klus", categoryId: work.id });

    const renamed = await call(cookie, "PATCH", `/api/todo/projects/${project.id}`, { name: "Karwei" });
    expect(((await renamed.json()) as TodoProject).name).toBe("Karwei");

    const order = await call(cookie, "POST", `/api/todo/categories/${work.id}/projects/reorder`, { ids: [project.id] });
    expect(order.status).toBe(200);

    expect(await (await call(cookie, "DELETE", `/api/todo/projects/${project.id}`)).json()).toEqual({ success: true });
    const gone = await call(cookie, "DELETE", `/api/todo/projects/${project.id}`);
    expect(await gone.json()).toEqual({ error: "todo.projectNotFound" });
  });
});
