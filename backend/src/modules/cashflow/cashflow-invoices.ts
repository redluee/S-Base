import { and, desc, eq, like, sql, type SQL } from "drizzle-orm";
import db from "../../db/client";
import {
  cashflowClients,
  cashflowInvoiceLines,
  cashflowInvoices,
  cashflowProjects,
  cashflowTradeNames,
} from "../../db/schema";
import { NotFoundError } from "../../utils/errors";
import { computeInvoiceStatus, isInvoiceStatus } from "./cashflow-helpers";

export class CashflowInvoices {
  generateNumber(userId: number, year: number): string {
    const yearStr = String(year);
    const latest = db
      .select({ invoiceNumber: cashflowInvoices.invoiceNumber })
      .from(cashflowInvoices)
      .innerJoin(cashflowClients, eq(cashflowInvoices.clientId, cashflowClients.id))
      .where(and(eq(cashflowClients.userId, userId), like(cashflowInvoices.invoiceNumber, `${yearStr}-%`)))
      .orderBy(desc(cashflowInvoices.invoiceNumber))
      .limit(1)
      .get();

    if (!latest) return `${yearStr}-001`;
    const parts = latest.invoiceNumber.split("-");
    const num = parseInt(parts[1], 10) + 1;
    return `${yearStr}-${String(num).padStart(3, "0")}`;
  }

  list(userId: number, status?: string, projectId?: number, clientId?: number) {
    const conditions: SQL[] = [eq(cashflowClients.userId, userId)];
    if (isInvoiceStatus(status)) conditions.push(eq(cashflowInvoices.status, status));
    if (projectId) conditions.push(eq(cashflowInvoices.projectId, projectId));
    if (clientId) conditions.push(eq(cashflowInvoices.clientId, clientId));

    const rows = db
      .select({
        id: cashflowInvoices.id,
        invoiceNumber: cashflowInvoices.invoiceNumber,
        name: cashflowInvoices.name,
        status: cashflowInvoices.status,
        dateCreated: cashflowInvoices.dateCreated,
        dateService: cashflowInvoices.dateService,
        paymentDueDate: cashflowInvoices.paymentDueDate,
        datePaid: cashflowInvoices.datePaid,
        isKor: cashflowInvoices.isKor,
        projectId: cashflowInvoices.projectId,
        projectName: cashflowProjects.name,
        clientId: cashflowClients.id,
        clientName: cashflowClients.name,
        tradeNameDisplay: cashflowTradeNames.displayName,
        createdAt: cashflowInvoices.createdAt,
        total: sql<number>`(SELECT COALESCE(SUM(total_cost), 0) FROM cashflow_invoice_lines WHERE invoice_id = ${cashflowInvoices.id})`,
      })
      .from(cashflowInvoices)
      .innerJoin(cashflowClients, eq(cashflowInvoices.clientId, cashflowClients.id))
      .leftJoin(cashflowProjects, eq(cashflowInvoices.projectId, cashflowProjects.id))
      .leftJoin(
        cashflowTradeNames,
        eq(sql`COALESCE(${cashflowInvoices.tradeNameId}, ${cashflowProjects.tradeNameId})`, cashflowTradeNames.id),
      )
      .where(and(...conditions))
      .orderBy(desc(cashflowInvoices.createdAt), desc(cashflowInvoices.id))
      .all();

    const now = Date.now();
    return rows.map((inv) => ({
      ...inv,
      status: computeInvoiceStatus(inv.status, inv.paymentDueDate, inv.dateCreated, now),
    }));
  }

  getById(id: number) {
    const row = db
      .select({
        id: cashflowInvoices.id,
        invoiceNumber: cashflowInvoices.invoiceNumber,
        name: cashflowInvoices.name,
        status: cashflowInvoices.status,
        dateCreated: cashflowInvoices.dateCreated,
        dateService: cashflowInvoices.dateService,
        paymentDueDate: cashflowInvoices.paymentDueDate,
        datePaid: cashflowInvoices.datePaid,
        isKor: cashflowInvoices.isKor,
        createdAt: cashflowInvoices.createdAt,
        projectId: cashflowInvoices.projectId,
        projectName: cashflowProjects.name,
        projectLocation: cashflowProjects.location,
        clientId: cashflowClients.id,
        clientName: cashflowClients.name,
        clientAddress: cashflowClients.address,
        clientEmail: cashflowClients.email,
        clientKvk: cashflowClients.kvkNumber,
        tradeNameId: cashflowTradeNames.id,
        tradeNameDisplay: cashflowTradeNames.displayName,
        tradeNameAddress: cashflowTradeNames.address,
        tradeNameIban: cashflowTradeNames.iban,
        tradeNameKvk: cashflowTradeNames.kvkNumber,
        tradeNameVat: cashflowTradeNames.vatNumber,
      })
      .from(cashflowInvoices)
      .innerJoin(cashflowClients, eq(cashflowInvoices.clientId, cashflowClients.id))
      .leftJoin(cashflowProjects, eq(cashflowInvoices.projectId, cashflowProjects.id))
      .leftJoin(
        cashflowTradeNames,
        eq(sql`COALESCE(${cashflowInvoices.tradeNameId}, ${cashflowProjects.tradeNameId})`, cashflowTradeNames.id),
      )
      .where(eq(cashflowInvoices.id, id))
      .get();

    if (!row) throw new NotFoundError("cashflow.invoiceNotFound");

    const status = computeInvoiceStatus(row.status, row.paymentDueDate, row.dateCreated, Date.now());
    const lines = db.select().from(cashflowInvoiceLines).where(eq(cashflowInvoiceLines.invoiceId, id)).all();
    const total = lines.reduce((sum, l) => sum + l.totalCost, 0);
    return { ...row, status, lines, total };
  }

  findRow(id: number) {
    const row = db.select().from(cashflowInvoices).where(eq(cashflowInvoices.id, id)).get();
    if (!row) throw new NotFoundError("cashflow.invoiceNotFound");
    return row;
  }

  markAsPaid(id: number, datePaid?: number | null) {
    const existing = this.findRow(id);
    const finalDatePaid = datePaid !== undefined ? datePaid : (existing.datePaid ?? Date.now());
    db.update(cashflowInvoices)
      .set({ status: "paid", datePaid: finalDatePaid })
      .where(eq(cashflowInvoices.id, id))
      .run();
    return this.getById(id);
  }

  remove(id: number) {
    this.findRow(id);
    db.delete(cashflowInvoices).where(eq(cashflowInvoices.id, id)).run();
    return { deleted: true };
  }
}
