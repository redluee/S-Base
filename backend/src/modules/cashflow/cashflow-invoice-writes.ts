import { and, eq, ne, sql } from "drizzle-orm";
import db from "../../db/client";
import { cashflowClients, cashflowInvoiceLines, cashflowInvoices } from "../../db/schema";
import { lineTotals } from "../../shared/cashflow";
import { ConflictError, ValidationError } from "../../utils/errors";
import type { CashflowClients } from "./cashflow-clients";
import { patch, patchText, trimOrNull } from "./cashflow-helpers";
import type { CashflowInvoices } from "./cashflow-invoices";
import type { CashflowProjects } from "./cashflow-projects";
import type { CashflowTradeNames } from "./cashflow-trade-names";
import type { InvoiceInput, InvoiceLineInput } from "./cashflow-types";

function replaceLines(invoiceId: number, lines: InvoiceLineInput[]) {
  db.delete(cashflowInvoiceLines).where(eq(cashflowInvoiceLines.invoiceId, invoiceId)).run();
  const totals = lineTotals(lines);
  lines.forEach((line, i) => {
    const isDiscount = line.type === "discount";
    db.insert(cashflowInvoiceLines)
      .values({
        invoiceId,
        date: line.date ?? null,
        taskDescription: line.taskDescription,
        quantity: isDiscount ? 1 : line.quantity || 1,
        unitPrice: isDiscount ? 0 : (line.unitPrice ?? 0),
        totalCost: totals[i],
        type: line.type,
        discountType: isDiscount ? (line.discountType ?? null) : null,
        discountValue: isDiscount ? (line.discountValue ?? null) : null,
      })
      .run();
  });
}

export class CashflowInvoiceWrites {
  constructor(
    private readonly invoices: CashflowInvoices,
    private readonly clients: CashflowClients,
    private readonly projects: CashflowProjects,
    private readonly tradeNames: CashflowTradeNames,
  ) {}

  private assertNumberFree(userId: number, invoiceNumber: string, excludeId?: number) {
    const conditions = [
      eq(cashflowClients.userId, userId),
      sql`LOWER(${cashflowInvoices.invoiceNumber}) = LOWER(${invoiceNumber})`,
    ];
    if (excludeId !== undefined) conditions.push(ne(cashflowInvoices.id, excludeId));
    const taken = db
      .select({ id: cashflowInvoices.id })
      .from(cashflowInvoices)
      .innerJoin(cashflowClients, eq(cashflowInvoices.clientId, cashflowClients.id))
      .where(and(...conditions))
      .get();
    if (taken) throw new ConflictError("cashflow.invoiceNumberInUse");
  }

  create(userId: number, data: InvoiceInput) {
    const invoiceNumber = data.invoiceNumber?.trim();
    if (!invoiceNumber) throw new ValidationError("cashflow.invoiceNumberRequired");
    this.assertNumberFree(userId, invoiceNumber);

    const project = data.projectId ? this.projects.getById(userId, data.projectId) : null;
    const clientId = data.clientId ?? project?.clientId;
    if (!clientId) throw new ValidationError("cashflow.clientRequired");
    const status = data.status ?? "draft";

    const invoice = db
      .insert(cashflowInvoices)
      .values({
        clientId: this.clients.getById(userId, clientId).id,
        projectId: project?.id ?? null,
        tradeNameId: this.tradeNames.ownedIdOrNull(userId, data.tradeNameId ?? project?.tradeNameId),
        invoiceNumber,
        name: trimOrNull(data.name),
        dateCreated: data.dateCreated ?? null,
        dateService: data.dateService ?? null,
        paymentDueDate: data.paymentDueDate ?? null,
        datePaid: data.datePaid !== undefined ? data.datePaid : status === "paid" ? Date.now() : null,
        status,
        isKor: data.isKor,
      })
      .returning()
      .get();

    replaceLines(invoice.id, data.lines ?? []);
    return this.invoices.getById(userId, invoice.id);
  }

  update(userId: number, id: number, data: InvoiceInput) {
    const existing = this.invoices.requireOwned(userId, id);
    const invoiceNumber = data.invoiceNumber?.trim();
    if (data.invoiceNumber !== undefined) {
      if (!invoiceNumber) throw new ValidationError("cashflow.invoiceNumberRequired");
      this.assertNumberFree(userId, invoiceNumber, id);
    }

    const status = data.status ?? existing.status;
    const becamePaid = status === "paid" && existing.status !== "paid";
    const leftPaid = status !== "paid" && existing.status === "paid";
    const datePaid =
      data.datePaid !== undefined ? data.datePaid : becamePaid ? Date.now() : leftPaid ? null : existing.datePaid;

    db.update(cashflowInvoices)
      .set({
        clientId: data.clientId === undefined ? existing.clientId : this.clients.getById(userId, data.clientId).id,
        projectId: patch(
          data.projectId === undefined ? undefined : data.projectId && this.projects.getById(userId, data.projectId).id,
          existing.projectId,
        ),
        tradeNameId: patch(
          data.tradeNameId === undefined ? undefined : this.tradeNames.ownedIdOrNull(userId, data.tradeNameId),
          existing.tradeNameId,
        ),
        invoiceNumber: invoiceNumber || existing.invoiceNumber,
        name: patchText(data.name, existing.name),
        dateCreated: patch(data.dateCreated, existing.dateCreated),
        dateService: patch(data.dateService, existing.dateService),
        paymentDueDate: patch(data.paymentDueDate, existing.paymentDueDate),
        datePaid,
        status,
        isKor: patch(data.isKor, existing.isKor),
      })
      .where(eq(cashflowInvoices.id, id))
      .run();

    if (data.lines) replaceLines(id, data.lines);
    return this.invoices.getById(userId, id);
  }
}
