import { and, eq, ne, sql } from "drizzle-orm";
import db from "../../db/client";
import { cashflowClients, cashflowInvoiceLines, cashflowInvoices } from "../../db/schema";
import { ConflictError, ValidationError } from "../../utils/errors";
import { isInvoiceStatus, trimOrNull } from "./cashflow-helpers";
import type { CashflowInvoices } from "./cashflow-invoices";
import type { CashflowProjects } from "./cashflow-projects";
import type { InvoiceInput, InvoiceLineInput } from "./cashflow-types";

function lineValues(invoiceId: number, line: InvoiceLineInput) {
  return {
    invoiceId,
    date: line.date ?? null,
    taskDescription: line.taskDescription,
    quantity: Number(line.quantity ?? 1),
    unitPrice: Number(line.unitPrice ?? 0),
    totalCost: Number(line.totalCost),
    type: line.type ?? "hours",
    discountType: line.discountType ?? null,
    discountValue: line.discountValue !== undefined && line.discountValue !== null ? Number(line.discountValue) : null,
  };
}

export class CashflowInvoiceWrites {
  constructor(
    private readonly invoices: CashflowInvoices,
    private readonly projects: CashflowProjects,
  ) {}

  private numberInUse(userId: number, invoiceNumber: string, excludeId?: number) {
    const conditions = [
      eq(cashflowClients.userId, userId),
      sql`LOWER(${cashflowInvoices.invoiceNumber}) = LOWER(${invoiceNumber})`,
    ];
    if (excludeId !== undefined) conditions.push(ne(cashflowInvoices.id, excludeId));
    return !!db.select({ id: cashflowInvoices.id })
      .from(cashflowInvoices)
      .innerJoin(cashflowClients, eq(cashflowInvoices.clientId, cashflowClients.id))
      .where(and(...conditions))
      .get();
  }

  create(userId: number, data: InvoiceInput) {
    const invNum = data.invoiceNumber?.trim();
    if (!invNum) throw new ValidationError("cashflow.invoiceNumberRequired");
    if (this.numberInUse(userId, invNum)) throw new ConflictError("cashflow.invoiceNumberInUse");

    let finalClientId = data.clientId;
    let finalTradeNameId = data.tradeNameId;

    if (data.projectId) {
      const proj = this.projects.getById(data.projectId);
      if (!finalClientId) finalClientId = proj.clientId;
      if (!finalTradeNameId) finalTradeNameId = proj.tradeNameId ?? null;
    }

    if (!finalClientId) throw new ValidationError("cashflow.clientRequired");

    const status = data.status ?? "draft";
    const datePaid = data.datePaid !== undefined ? data.datePaid : (status === "paid" ? Date.now() : null);

    const invoice = db.insert(cashflowInvoices).values({
      clientId: finalClientId,
      projectId: data.projectId ?? null,
      tradeNameId: finalTradeNameId ?? null,
      invoiceNumber: invNum,
      name: trimOrNull(data.name),
      dateCreated: data.dateCreated ?? null,
      dateService: data.dateService ?? null,
      paymentDueDate: data.paymentDueDate ?? null,
      datePaid,
      status,
      isKor: data.isKor,
    }).returning().get();

    for (const line of data.lines ?? []) {
      db.insert(cashflowInvoiceLines).values(lineValues(invoice.id, line)).run();
    }

    return this.invoices.getById(invoice.id);
  }

  update(id: number, data: InvoiceInput) {
    const existing = this.invoices.findRow(id);
    if (data.status && !isInvoiceStatus(data.status)) throw new ValidationError("cashflow.invalidStatus");

    if (data.invoiceNumber !== undefined) {
      const invNum = data.invoiceNumber.trim();
      if (!invNum) throw new ValidationError("cashflow.invoiceNumberRequired");

      const client = db.select({ userId: cashflowClients.userId })
        .from(cashflowClients)
        .where(eq(cashflowClients.id, existing.clientId))
        .get();

      if (client && this.numberInUse(client.userId, invNum, id)) throw new ConflictError("cashflow.invoiceNumberInUse");
    }

    const nextStatus = data.status ?? existing.status;
    let nextDatePaid = data.datePaid;
    if (nextDatePaid === undefined) {
      if (nextStatus === "paid" && existing.status !== "paid") {
        nextDatePaid = Date.now();
      } else if (nextStatus !== "paid" && existing.status === "paid") {
        nextDatePaid = null;
      } else {
        nextDatePaid = existing.datePaid;
      }
    }

    const finalProjectId = data.projectId !== undefined ? data.projectId : existing.projectId;
    const finalTradeNameId = data.tradeNameId !== undefined ? data.tradeNameId : existing.tradeNameId;

    db.update(cashflowInvoices).set({
      clientId: data.clientId ?? existing.clientId,
      projectId: finalProjectId,
      tradeNameId: finalTradeNameId,
      invoiceNumber: data.invoiceNumber?.trim() ?? existing.invoiceNumber,
      name: data.name !== undefined ? trimOrNull(data.name) : existing.name,
      dateCreated: data.dateCreated !== undefined ? data.dateCreated : existing.dateCreated,
      dateService: data.dateService !== undefined ? data.dateService : existing.dateService,
      paymentDueDate: data.paymentDueDate !== undefined ? data.paymentDueDate : existing.paymentDueDate,
      datePaid: nextDatePaid,
      status: nextStatus,
      isKor: data.isKor !== undefined ? data.isKor : existing.isKor,
    }).where(eq(cashflowInvoices.id, id)).run();

    if (data.lines) {
      db.delete(cashflowInvoiceLines).where(eq(cashflowInvoiceLines.invoiceId, id)).run();
      for (const line of data.lines) {
        db.insert(cashflowInvoiceLines).values(lineValues(id, line)).run();
      }
    }

    return this.invoices.getById(id);
  }
}
