import { and, eq, inArray } from "drizzle-orm";
import db from "../../db/client";
import { cashflowClients, cashflowInvoices } from "../../db/schema";
import type { InvoiceStatus } from "../../shared/cashflow";

export interface TodoInvoiceRow {
  id: number;
  invoiceNumber: string;
  clientName: string;
  status: InvoiceStatus;
  paymentDueDate: number | null;
  dateCreated: number | null;
}

export function listTodoInvoices(userId: number): TodoInvoiceRow[] {
  return db
    .select({
      id: cashflowInvoices.id,
      invoiceNumber: cashflowInvoices.invoiceNumber,
      clientName: cashflowClients.name,
      status: cashflowInvoices.status,
      paymentDueDate: cashflowInvoices.paymentDueDate,
      dateCreated: cashflowInvoices.dateCreated,
    })
    .from(cashflowInvoices)
    .innerJoin(cashflowClients, eq(cashflowInvoices.clientId, cashflowClients.id))
    .where(eq(cashflowClients.userId, userId))
    .all();
}

export function paidInvoiceIds(userId: number, ids: number[]): Set<number> {
  if (ids.length === 0) return new Set();
  return new Set(
    db
      .select({ id: cashflowInvoices.id })
      .from(cashflowInvoices)
      .innerJoin(cashflowClients, eq(cashflowInvoices.clientId, cashflowClients.id))
      .where(
        and(eq(cashflowClients.userId, userId), eq(cashflowInvoices.status, "paid"), inArray(cashflowInvoices.id, ids)),
      )
      .all()
      .map((row) => row.id),
  );
}

export function ownedInvoiceStatus(userId: number, id: number): InvoiceStatus | null {
  return (
    db
      .select({ status: cashflowInvoices.status })
      .from(cashflowInvoices)
      .innerJoin(cashflowClients, eq(cashflowInvoices.clientId, cashflowClients.id))
      .where(and(eq(cashflowClients.userId, userId), eq(cashflowInvoices.id, id)))
      .get()?.status ?? null
  );
}

export function setOwnedInvoiceStatus(userId: number, id: number, status: InvoiceStatus, datePaid: number | null) {
  if (ownedInvoiceStatus(userId, id) === null) return;
  db.update(cashflowInvoices).set({ status, datePaid }).where(eq(cashflowInvoices.id, id)).run();
}
