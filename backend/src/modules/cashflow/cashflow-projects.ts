import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import db from "../../db/client";
import { cashflowClients, cashflowInvoices, cashflowProjects, cashflowTradeNames } from "../../db/schema";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { trimOrNull } from "./cashflow-helpers";
import type { ProjectInput } from "./cashflow-types";

export class CashflowProjects {
  list(userId: number, clientId?: number) {
    const conditions: SQL[] = [eq(cashflowClients.userId, userId)];
    if (clientId) conditions.push(eq(cashflowProjects.clientId, clientId));

    return db
      .select({
        id: cashflowProjects.id,
        name: cashflowProjects.name,
        description: cashflowProjects.description,
        location: cashflowProjects.location,
        createdAt: cashflowProjects.createdAt,
        clientId: cashflowClients.id,
        clientName: cashflowClients.name,
        clientEmail: cashflowClients.email,
        tradeNameId: cashflowTradeNames.id,
        tradeNameDisplay: cashflowTradeNames.displayName,
        invoiceCount: sql<number>`(SELECT COUNT(*) FROM cashflow_invoices WHERE project_id = ${cashflowProjects.id})`,
        totalBilled: sql<number>`(SELECT COALESCE(SUM(il.total_cost), 0) FROM cashflow_invoice_lines il INNER JOIN cashflow_invoices i ON il.invoice_id = i.id WHERE i.project_id = ${cashflowProjects.id} AND i.status = 'paid')`,
      })
      .from(cashflowProjects)
      .innerJoin(cashflowClients, eq(cashflowProjects.clientId, cashflowClients.id))
      .leftJoin(cashflowTradeNames, eq(cashflowProjects.tradeNameId, cashflowTradeNames.id))
      .where(and(...conditions))
      .orderBy(desc(cashflowProjects.createdAt))
      .all();
  }

  getById(id: number) {
    const row = db
      .select({
        id: cashflowProjects.id,
        name: cashflowProjects.name,
        description: cashflowProjects.description,
        location: cashflowProjects.location,
        createdAt: cashflowProjects.createdAt,
        clientId: cashflowClients.id,
        clientName: cashflowClients.name,
        clientAddress: cashflowClients.address,
        clientEmail: cashflowClients.email,
        clientKvk: cashflowClients.kvkNumber,
        standardRate: cashflowClients.standardRate,
        tradeNameId: cashflowTradeNames.id,
        tradeNameDisplay: cashflowTradeNames.displayName,
        tradeNameAddress: cashflowTradeNames.address,
        tradeNameIban: cashflowTradeNames.iban,
        tradeNameKvk: cashflowTradeNames.kvkNumber,
      })
      .from(cashflowProjects)
      .innerJoin(cashflowClients, eq(cashflowProjects.clientId, cashflowClients.id))
      .leftJoin(cashflowTradeNames, eq(cashflowProjects.tradeNameId, cashflowTradeNames.id))
      .where(eq(cashflowProjects.id, id))
      .get();
    if (!row) throw new NotFoundError("cashflow.projectNotFound");
    return row;
  }

  findRow(id: number) {
    const row = db.select().from(cashflowProjects).where(eq(cashflowProjects.id, id)).get();
    if (!row) throw new NotFoundError("cashflow.projectNotFound");
    return row;
  }

  create(data: ProjectInput) {
    const name = data.name?.trim();
    if (!name) throw new ValidationError("cashflow.projectNameRequired");
    if (data.clientId === undefined) throw new ValidationError("cashflow.clientRequired");
    return db
      .insert(cashflowProjects)
      .values({
        clientId: data.clientId,
        tradeNameId: data.tradeNameId ?? null,
        name,
        description: trimOrNull(data.description),
        location: trimOrNull(data.location),
      })
      .returning()
      .get();
  }

  update(id: number, data: ProjectInput) {
    const existing = this.findRow(id);
    return db
      .update(cashflowProjects)
      .set({
        clientId: data.clientId ?? existing.clientId,
        tradeNameId: data.tradeNameId !== undefined ? data.tradeNameId : existing.tradeNameId,
        name: data.name?.trim() ?? existing.name,
        description: data.description !== undefined ? trimOrNull(data.description) : existing.description,
        location: data.location !== undefined ? trimOrNull(data.location) : existing.location,
      })
      .where(eq(cashflowProjects.id, id))
      .returning()
      .get();
  }

  remove(id: number, deleteInvoices = false) {
    this.findRow(id);
    if (deleteInvoices) {
      db.delete(cashflowInvoices).where(eq(cashflowInvoices.projectId, id)).run();
    } else {
      db.update(cashflowInvoices).set({ projectId: null }).where(eq(cashflowInvoices.projectId, id)).run();
    }
    db.delete(cashflowProjects).where(eq(cashflowProjects.id, id)).run();
    return { deleted: true };
  }
}
