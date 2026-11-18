import { beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { grantModule } from "../auth/modules";
import db from "../db/client";
import { cashflowClients, cashflowInvoices, modules } from "../db/schema";
import { call, login } from "../test-http";
import { setupTestDb } from "../test-utils";
import type { TodoCompletionResult, TodoSnapshot, TodoTask } from "../types/todo";

const DAY = 86_400_000;

describe("linked invoice tasks through the API", () => {
  let cookie: string;
  let invoiceId: number;

  beforeEach(async () => {
    const userId = (await setupTestDb()).testerId;
    for (const { moduleId } of db.select().from(modules).all()) grantModule(userId, moduleId);
    cookie = await login("tester");
    const client = db.insert(cashflowClients).values({ userId, name: "Klant" }).returning().get();
    invoiceId = db
      .insert(cashflowInvoices)
      .values({
        clientId: client.id,
        invoiceNumber: `R-${Math.floor(Math.random() * 1e9)}`,
        status: "sent",
        dateCreated: Date.now() - 10 * DAY,
        paymentDueDate: Date.now() + 2 * DAY,
      })
      .returning()
      .get().id;
  });

  const invoice = () => db.select().from(cashflowInvoices).where(eq(cashflowInvoices.id, invoiceId)).get();

  it("marks the invoice paid on complete and reverts it on undo and restore", async () => {
    const snapshot = (await (await call(cookie, "GET", "/api/todo")).json()) as TodoSnapshot;
    const task = snapshot.tasks.find((t) => t.link?.module === "cashflow" && t.link.id === invoiceId);
    expect(task).toBeDefined();
    const id = (task as TodoTask).id;

    const done = (await (await call(cookie, "POST", `/api/todo/tasks/${id}/complete`)).json()) as TodoCompletionResult;
    expect(done.task.completedAt).not.toBeNull();
    expect(invoice()).toMatchObject({ status: "paid" });
    expect(invoice()?.datePaid).not.toBeNull();

    expect((await call(cookie, "POST", `/api/todo/tasks/${id}/uncomplete`)).status).toBe(200);
    expect(invoice()).toMatchObject({ status: "sent", datePaid: null });

    await call(cookie, "POST", `/api/todo/tasks/${id}/complete`);
    expect((await call(cookie, "POST", `/api/todo/tasks/${id}/restore`)).status).toBe(200);
    expect(invoice()).toMatchObject({ status: "sent", datePaid: null });
  });

  it("rejects editing the locked title of a linked task", async () => {
    const snapshot = (await (await call(cookie, "GET", "/api/todo")).json()) as TodoSnapshot;
    const task = snapshot.tasks.find((t) => t.link?.id === invoiceId) as TodoTask;
    const res = await call(cookie, "PATCH", `/api/todo/tasks/${task.id}`, { title: "Anders" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "todo.linkedFieldLocked" });
    expect((await call(cookie, "PATCH", `/api/todo/tasks/${task.id}`, { flagged: true })).status).toBe(200);
  });
});
