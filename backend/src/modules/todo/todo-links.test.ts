import { beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { grantModule, revokeModule } from "../../auth/modules";
import db from "../../db/client";
import {
  cashflowClients,
  cashflowInvoices,
  minorSprints,
  modules,
  todoCategories,
  todoHiddenLinks,
  todoTasks,
} from "../../db/schema";
import { today } from "../../shared/dates";
import { setupTestDb } from "../../test-utils";
import { TodoLinks } from "./todo-links";
import { listOpenRows, nowIso } from "./todo-records";

const DAY = 86_400_000;
const links = new TodoLinks();
let userId: number;
let clientId: number;

function dayFromNow(days: number): string {
  return today(new Date(Date.now() + days * DAY));
}

function addInvoice(values: Partial<typeof cashflowInvoices.$inferInsert> = {}) {
  return db
    .insert(cashflowInvoices)
    .values({
      clientId,
      invoiceNumber: `2026-${Math.floor(Math.random() * 1e9)}`,
      status: "sent",
      dateCreated: Date.now() - 10 * DAY,
      paymentDueDate: Date.now() + 3 * DAY,
      ...values,
    })
    .returning()
    .get();
}

function addSprint(daysAhead: number) {
  return db
    .insert(minorSprints)
    .values({
      userId,
      sprintNumber: "1",
      name: "Sprint",
      startDate: "2026-01-01",
      endDate: "2026-01-14",
      showAndGrowDate: dayFromNow(daysAhead),
    })
    .returning()
    .get();
}

function taskFor(source: "cashflow" | "minor", id: number) {
  return db
    .select()
    .from(todoTasks)
    .where(eq(todoTasks.sourceId, id))
    .all()
    .find((r) => r.sourceModule === source);
}

describe("todo links", () => {
  beforeEach(async () => {
    userId = (await setupTestDb()).testerId;
    for (const { moduleId } of db.select().from(modules).all()) grantModule(userId, moduleId);
    db.delete(todoTasks).run();
    db.delete(todoHiddenLinks).run();
    db.delete(todoCategories).run();
    db.delete(cashflowClients).run();
    db.delete(minorSprints).run();
    clientId = db.insert(cashflowClients).values({ userId, name: "Acme" }).returning().get().id;
  });

  it("creates invoice tasks only inside the 7 day window", () => {
    const near = addInvoice({ paymentDueDate: Date.now() + 7 * DAY, invoiceNumber: "A-7" });
    const far = addInvoice({ paymentDueDate: Date.now() + 8 * DAY, invoiceNumber: "A-8" });
    links.sync(userId);
    expect(taskFor("cashflow", near.id)).toMatchObject({
      title: "Factuur A-7 · Acme",
      dueDate: dayFromNow(7),
      completedAt: null,
    });
    expect(taskFor("cashflow", far.id)).toBeUndefined();
  });

  it("creates overdue tasks, skips drafts and paid, and never duplicates", () => {
    const overdue = addInvoice({ paymentDueDate: Date.now() - 20 * DAY });
    addInvoice({ status: "draft" });
    addInvoice({ status: "paid", datePaid: Date.now() });
    addInvoice({ paymentDueDate: null });
    links.sync(userId);
    links.sync(userId);
    const rows = db.select().from(todoTasks).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].sourceId).toBe(overdue.id);
    expect(rows[0].categoryId).not.toBeNull();
    expect(rows[0].projectId).not.toBeNull();
  });

  it("puts new tasks at the top, earliest date first", () => {
    const later = addInvoice({ paymentDueDate: Date.now() + 5 * DAY });
    const sooner = addInvoice({ paymentDueDate: Date.now() + 1 * DAY });
    links.sync(userId);
    expect(listOpenRows(userId).map((r) => r.sourceId)).toEqual([sooner.id, later.id]);
  });

  it("creates a Show & Grow task per sprint inside the window", () => {
    const near = addSprint(7);
    const far = addSprint(8);
    links.sync(userId);
    expect(taskFor("minor", near.id)).toMatchObject({ title: "Show & Grow voorbereiden", dueDate: dayFromNow(7) });
    expect(taskFor("minor", far.id)).toBeUndefined();
  });

  it("respects module access", () => {
    addInvoice();
    addSprint(2);
    const cashflowId = db.select().from(modules).where(eq(modules.moduleName, "cashflow")).get()?.moduleId ?? 0;
    revokeModule(userId, cashflowId);
    try {
      links.sync(userId);
      expect(
        db
          .select()
          .from(todoTasks)
          .all()
          .map((r) => r.sourceModule),
      ).toEqual(["minor"]);
    } finally {
      grantModule(userId, cashflowId);
    }
  });

  it("follows the source without touching lastEditedAt", () => {
    const invoice = addInvoice({ invoiceNumber: "F-1" });
    links.sync(userId);
    const before = taskFor("cashflow", invoice.id);
    db.update(cashflowInvoices)
      .set({ invoiceNumber: "F-2", paymentDueDate: Date.now() + 5 * DAY })
      .where(eq(cashflowInvoices.id, invoice.id))
      .run();
    links.sync(userId);
    const after = taskFor("cashflow", invoice.id);
    expect(after).toMatchObject({ title: "Factuur F-2 · Acme", dueDate: dayFromNow(5) });
    expect(after?.lastEditedAt).toBe(before?.lastEditedAt ?? "");
  });

  it("soft-deletes silently when the source no longer qualifies, without hiding it", () => {
    const invoice = addInvoice();
    const sprint = addSprint(3);
    links.sync(userId);
    db.update(cashflowInvoices).set({ status: "draft" }).where(eq(cashflowInvoices.id, invoice.id)).run();
    db.delete(minorSprints).where(eq(minorSprints.id, sprint.id)).run();
    links.sync(userId);
    expect(taskFor("cashflow", invoice.id)?.deletedAt).not.toBeNull();
    expect(taskFor("minor", sprint.id)?.deletedAt).not.toBeNull();
    expect(db.select().from(todoHiddenLinks).all()).toHaveLength(0);
    links.sync(userId);
    expect(db.select().from(todoTasks).all()).toHaveLength(2);
  });

  it("brings a silently removed task back when its source qualifies again", () => {
    const invoice = addInvoice();
    links.sync(userId);
    const id = taskFor("cashflow", invoice.id)?.id;
    db.update(cashflowInvoices).set({ status: "draft" }).where(eq(cashflowInvoices.id, invoice.id)).run();
    links.sync(userId);
    db.update(cashflowInvoices).set({ status: "sent" }).where(eq(cashflowInvoices.id, invoice.id)).run();
    links.sync(userId);
    expect(taskFor("cashflow", invoice.id)).toMatchObject({ id, deletedAt: null, completedAt: null });
  });

  it("leaves the list when the date moves past the window and returns inside it", () => {
    const invoice = addInvoice();
    links.sync(userId);
    const later = Date.now() + 30 * DAY;
    db.update(cashflowInvoices).set({ paymentDueDate: later }).where(eq(cashflowInvoices.id, invoice.id)).run();
    links.sync(userId);
    expect(taskFor("cashflow", invoice.id)?.deletedAt).not.toBeNull();
    expect(listOpenRows(userId)).toHaveLength(0);
    const sooner = Date.now() + 2 * DAY;
    db.update(cashflowInvoices).set({ paymentDueDate: sooner }).where(eq(cashflowInvoices.id, invoice.id)).run();
    links.sync(userId);
    expect(taskFor("cashflow", invoice.id)).toMatchObject({ deletedAt: null, dueDate: dayFromNow(2) });
  });

  it("does not hide a deleted task's source behind a revival", () => {
    const invoice = addInvoice();
    links.sync(userId);
    const row = taskFor("cashflow", invoice.id);
    const ref = { userId, sourceModule: "cashflow" as const, sourceId: invoice.id, sourcePreviousStatus: null };
    db.update(todoTasks)
      .set({ deletedAt: nowIso() })
      .where(eq(todoTasks.id, row?.id ?? 0))
      .run();
    links.hide(ref);
    links.sync(userId);
    expect(taskFor("cashflow", invoice.id)?.deletedAt).not.toBeNull();
  });

  it("keeps the real payment date when the invoice was already paid", () => {
    const paidAt = Date.now() - 5 * DAY;
    const invoice = addInvoice({ status: "paid", datePaid: paidAt });
    const ref = { userId, sourceModule: "cashflow" as const, sourceId: invoice.id, sourcePreviousStatus: null };
    expect(links.onComplete(ref)).toBeNull();
    links.onRevert(ref);
    const row = db.select().from(cashflowInvoices).where(eq(cashflowInvoices.id, invoice.id)).get();
    expect(row).toMatchObject({ status: "paid", datePaid: paidAt });
  });

  it("completes silently when the invoice is paid", () => {
    const invoice = addInvoice();
    links.sync(userId);
    db.update(cashflowInvoices)
      .set({ status: "paid", datePaid: Date.now() })
      .where(eq(cashflowInvoices.id, invoice.id))
      .run();
    links.sync(userId);
    const row = taskFor("cashflow", invoice.id);
    expect(row?.completedAt).not.toBeNull();
    expect(row?.deletedAt).toBeNull();
    expect(row?.sourcePreviousStatus).toBeNull();
    links.sync(userId);
    expect(db.select().from(todoTasks).all()).toHaveLength(1);
  });

  it("round-trips onComplete and onRevert on an invoice", () => {
    const invoice = addInvoice({ status: "overdue", paymentDueDate: Date.now() - DAY });
    const ref = { userId, sourceModule: "cashflow" as const, sourceId: invoice.id, sourcePreviousStatus: null };
    const previous = links.onComplete(ref);
    expect(previous).toBe("overdue");
    const paid = db.select().from(cashflowInvoices).where(eq(cashflowInvoices.id, invoice.id)).get();
    expect(paid?.status).toBe("paid");
    expect(paid?.datePaid).not.toBeNull();
    links.onRevert({ ...ref, sourcePreviousStatus: previous });
    const reverted = db.select().from(cashflowInvoices).where(eq(cashflowInvoices.id, invoice.id)).get();
    expect(reverted?.status).toBe("overdue");
    expect(reverted?.datePaid).toBeNull();
  });

  it("does not touch invoices of another user or sprint completions", () => {
    const invoice = addInvoice();
    const other = {
      userId: userId + 999,
      sourceModule: "cashflow" as const,
      sourceId: invoice.id,
      sourcePreviousStatus: null,
    };
    expect(links.onComplete(other)).toBeNull();
    links.onRevert({ ...other, sourcePreviousStatus: "draft" });
    expect(db.select().from(cashflowInvoices).where(eq(cashflowInvoices.id, invoice.id)).get()?.status).toBe("sent");
    const sprint = addSprint(2);
    expect(
      links.onComplete({ userId, sourceModule: "minor", sourceId: sprint.id, sourcePreviousStatus: null }),
    ).toBeNull();
  });

  it("hides and unhides a source item", () => {
    const invoice = addInvoice();
    const ref = { userId, sourceModule: "cashflow" as const, sourceId: invoice.id, sourcePreviousStatus: null };
    links.hide(ref);
    links.hide(ref);
    expect(db.select().from(todoHiddenLinks).all()).toHaveLength(1);
    links.sync(userId);
    expect(db.select().from(todoTasks).all()).toHaveLength(0);
    links.unhide(ref);
    links.sync(userId);
    expect(db.select().from(todoTasks).all()).toHaveLength(1);
  });

  it("does not recreate a completed task", () => {
    const invoice = addInvoice();
    links.sync(userId);
    db.update(todoTasks).set({ completedAt: new Date().toISOString() }).run();
    links.sync(userId);
    expect(taskFor("cashflow", invoice.id)?.completedAt).not.toBeNull();
    expect(db.select().from(todoTasks).all()).toHaveLength(1);
  });
});
