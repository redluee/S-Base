import { and, desc, eq, like, sql, type SQL } from "drizzle-orm";
import db from "../../db/client";
import {
  cashflowClients,
  cashflowInvoiceLines,
  cashflowInvoices,
  cashflowProjects,
  cashflowTradeNames,
} from "../../db/schema";
import { computeInvoiceStatus, type InvoiceStatus } from "../../shared/cashflow";
import { NotFoundError, orNotFound } from "../../utils/errors";

export const invoiceDate = sql<number>`COALESCE(${cashflowInvoices.datePaid}, ${cashflowInvoices.dateCreated}, ${cashflowInvoices.dateService}, CAST(strftime('%s', ${cashflowInvoices.createdAt}) AS INTEGER) * 1000)`;
const invoiceNumberSequence = sql<number>`MAX(CAST(SUBSTR(${cashflowInvoices.invoiceNumber}, 6) AS INTEGER))`;

export class CashflowInvoices {
  nextNumber(userId: number, year = new Date().getFullYear()): string {
    const latest = db
      .select({ sequence: invoiceNumberSequence })
      .from(cashflowInvoices)
      .innerJoin(cashflowClients, eq(cashflowInvoices.clientId, cashflowClients.id))
      .where(and(eq(cashflowClients.userId, userId), like(cashflowInvoices.invoiceNumber, `${year}-%`)))
      .get();
    return `${year}-${String((latest?.sequence ?? 0) + 1).padStart(3, "0")}`;
  }

  list(userId: number, status?: InvoiceStatus, projectId?: number, clientId?: number) {
    const conditions: SQL[] = [eq(cashflowClients.userId, userId)];
    if (status) conditions.push(eq(cashflowInvoices.status, status));
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
        bookedAt: invoiceDate,
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

  getById(userId: number, id: number) {
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
      .where(and(eq(cashflowInvoices.id, id), eq(cashflowClients.userId, userId)))
      .get();

    if (!row) throw new NotFoundError("cashflow.invoiceNotFound");

    const status = computeInvoiceStatus(row.status, row.paymentDueDate, row.dateCreated, Date.now());
    const lines = db.select().from(cashflowInvoiceLines).where(eq(cashflowInvoiceLines.invoiceId, id)).all();
    const total = lines.reduce((sum, l) => sum + l.totalCost, 0);
    return { ...row, status, lines, total };
  }

  requireOwned(userId: number, id: number) {
    const row = db
      .select({ invoice: cashflowInvoices })
      .from(cashflowInvoices)
      .innerJoin(cashflowClients, eq(cashflowInvoices.clientId, cashflowClients.id))
      .where(and(eq(cashflowInvoices.id, id), eq(cashflowClients.userId, userId)))
      .get();
    return orNotFound(row, "cashflow.invoiceNotFound").invoice;
  }

  markAsPaid(userId: number, id: number, datePaid?: number | null) {
    const existing = this.requireOwned(userId, id);
    db.update(cashflowInvoices)
      .set({ status: "paid", datePaid: datePaid !== undefined ? datePaid : (existing.datePaid ?? Date.now()) })
      .where(eq(cashflowInvoices.id, id))
      .run();
    return this.getById(userId, id);
  }

  remove(userId: number, id: number) {
    this.requireOwned(userId, id);
    db.delete(cashflowInvoices).where(eq(cashflowInvoices.id, id)).run();
    return { deleted: true };
  }
}
