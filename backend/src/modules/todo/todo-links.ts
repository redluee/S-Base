import { and, eq, inArray, isNotNull } from "drizzle-orm";
import db from "../../db/client";
import { minorSprints, todoHiddenLinks, todoTasks } from "../../db/schema";
import { computeInvoiceStatus, INVOICE_STATUSES, type InvoiceStatus } from "../../shared/cashflow";
import { isCalendarDate, today } from "../../shared/dates";
import { invoiceTaskTitle, isLinkedTaskVisible, SHOW_AND_GROW_TASK_TITLE, type TodoSource } from "../../shared/todo";
import { listTodoInvoices, ownedInvoiceStatus, paidInvoiceIds, setOwnedInvoiceStatus } from "../cashflow/cashflow-todo";
import { accessibleSources, ensureSystemCategory, nowIso, topPosition } from "./todo-records";

export interface LinkedTaskRef {
  userId: number;
  sourceModule: TodoSource;
  sourceId: number;
  sourcePreviousStatus: string | null;
}

interface Desired {
  title: string;
  dueDate: string;
}

type DesiredMap = Map<number, Desired>;

function desiredInvoices(userId: number, now: number): DesiredMap {
  const map: DesiredMap = new Map();
  for (const invoice of listTodoInvoices(userId)) {
    const status = computeInvoiceStatus(invoice.status, invoice.paymentDueDate, invoice.dateCreated, now);
    if ((status !== "sent" && status !== "overdue") || !invoice.paymentDueDate) continue;
    map.set(invoice.id, {
      title: invoiceTaskTitle(invoice.invoiceNumber, invoice.clientName),
      dueDate: today(new Date(invoice.paymentDueDate)),
    });
  }
  return map;
}

function desiredSprints(userId: number): DesiredMap {
  const map: DesiredMap = new Map();
  const sprints = db
    .select({ id: minorSprints.id, showAndGrowDate: minorSprints.showAndGrowDate })
    .from(minorSprints)
    .where(eq(minorSprints.userId, userId))
    .all();
  for (const sprint of sprints) {
    if (isCalendarDate(sprint.showAndGrowDate)) {
      map.set(sprint.id, { title: SHOW_AND_GROW_TASK_TITLE, dueDate: sprint.showAndGrowDate });
    }
  }
  return map;
}

export class TodoLinks {
  sync(userId: number): void {
    const sources = accessibleSources(userId);
    if (sources.length === 0) return;
    const now = new Date();
    const desired: Partial<Record<TodoSource, DesiredMap>> = {};
    if (sources.includes("cashflow")) desired.cashflow = desiredInvoices(userId, now.getTime());
    if (sources.includes("minor")) desired.minor = desiredSprints(userId);
    const system = ensureSystemCategory(userId);

    db.transaction(() => {
      const existing = db
        .select()
        .from(todoTasks)
        .where(
          and(
            eq(todoTasks.userId, userId),
            isNotNull(todoTasks.sourceModule),
            inArray(todoTasks.sourceModule, sources),
          ),
        )
        .all();
      const hidden = db.select().from(todoHiddenLinks).where(eq(todoHiddenLinks.userId, userId)).all();
      const known = new Set(existing.map((row) => `${row.sourceModule}:${row.sourceId}`));
      const blocked = new Set(hidden.map((row) => `${row.sourceModule}:${row.sourceId}`));
      const at = nowIso();

      const openCashflow = existing.filter((r) => r.sourceModule === "cashflow" && !r.completedAt && !r.deletedAt);
      const paid = paidInvoiceIds(
        userId,
        openCashflow.map((r) => r.sourceId ?? 0),
      );

      for (const row of existing) {
        if (row.completedAt || !row.sourceModule || row.sourceId === null) continue;
        const key = `${row.sourceModule}:${row.sourceId}`;
        const want = desired[row.sourceModule]?.get(row.sourceId);
        const visible = !!want && isLinkedTaskVisible(want.dueDate, now);
        if (row.deletedAt) {
          if (want && visible && !blocked.has(key)) {
            db.update(todoTasks)
              .set({ title: want.title, dueDate: want.dueDate, deletedAt: null, position: topPosition(userId) })
              .where(eq(todoTasks.id, row.id))
              .run();
          }
          continue;
        }
        if (!want) {
          const patch =
            row.sourceModule === "cashflow" && paid.has(row.sourceId) ? { completedAt: at } : { deletedAt: at };
          db.update(todoTasks).set(patch).where(eq(todoTasks.id, row.id)).run();
        } else if (!visible) {
          db.update(todoTasks).set({ deletedAt: at }).where(eq(todoTasks.id, row.id)).run();
        } else if (row.title !== want.title || row.dueDate !== want.dueDate) {
          db.update(todoTasks).set({ title: want.title, dueDate: want.dueDate }).where(eq(todoTasks.id, row.id)).run();
        }
      }

      const fresh: { source: TodoSource; id: number; want: Desired }[] = [];
      for (const source of sources) {
        for (const [id, want] of desired[source] ?? []) {
          const key = `${source}:${id}`;
          if (known.has(key) || blocked.has(key) || !isLinkedTaskVisible(want.dueDate, now)) continue;
          fresh.push({ source, id, want });
        }
      }
      fresh.sort((a, b) => b.want.dueDate.localeCompare(a.want.dueDate) || b.id - a.id);
      for (const { source, id, want } of fresh) {
        db.insert(todoTasks)
          .values({
            userId,
            title: want.title,
            categoryId: system.category.id,
            projectId: system.projects[source]?.id ?? null,
            dueDate: want.dueDate,
            position: topPosition(userId),
            sourceModule: source,
            sourceId: id,
            createdAt: at,
            lastEditedAt: at,
          })
          .run();
      }
    });
  }

  onComplete(task: LinkedTaskRef): string | null {
    if (task.sourceModule !== "cashflow") return null;
    const previous = ownedInvoiceStatus(task.userId, task.sourceId);
    if (previous === null || previous === "paid") return null;
    setOwnedInvoiceStatus(task.userId, task.sourceId, "paid", Date.now());
    return previous;
  }

  onRevert(task: LinkedTaskRef): void {
    if (task.sourceModule !== "cashflow" || !task.sourcePreviousStatus) return;
    const previous = INVOICE_STATUSES.find((s): s is InvoiceStatus => s === task.sourcePreviousStatus);
    if (!previous) return;
    setOwnedInvoiceStatus(task.userId, task.sourceId, previous, null);
  }

  hide(task: LinkedTaskRef): void {
    db.insert(todoHiddenLinks)
      .values({ userId: task.userId, sourceModule: task.sourceModule, sourceId: task.sourceId })
      .onConflictDoNothing()
      .run();
  }

  unhide(task: LinkedTaskRef): void {
    db.delete(todoHiddenLinks)
      .where(
        and(
          eq(todoHiddenLinks.userId, task.userId),
          eq(todoHiddenLinks.sourceModule, task.sourceModule),
          eq(todoHiddenLinks.sourceId, task.sourceId),
        ),
      )
      .run();
  }
}
