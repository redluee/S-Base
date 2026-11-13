import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import db from "../../db/client";
import { cashflowClients, cashflowInvoices, cashflowProjects, cashflowTradeNames } from "../../db/schema";
import { orNotFound, ValidationError } from "../../utils/errors";
import type { CashflowClients } from "./cashflow-clients";
import { patch, patchText, trimOrNull } from "./cashflow-helpers";
import type { CashflowTradeNames } from "./cashflow-trade-names";
import type { ProjectInput } from "./cashflow-types";

export class CashflowProjects {
  constructor(
    private readonly clients: CashflowClients,
    private readonly tradeNames: CashflowTradeNames,
  ) {}

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

  getById(userId: number, id: number) {
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
      .where(and(eq(cashflowProjects.id, id), eq(cashflowClients.userId, userId)))
      .get();
    return orNotFound(row, "cashflow.projectNotFound");
  }

  private findRow(userId: number, id: number) {
    const row = db
      .select({ project: cashflowProjects })
      .from(cashflowProjects)
      .innerJoin(cashflowClients, eq(cashflowProjects.clientId, cashflowClients.id))
      .where(and(eq(cashflowProjects.id, id), eq(cashflowClients.userId, userId)))
      .get();
    return orNotFound(row, "cashflow.projectNotFound").project;
  }

  create(userId: number, data: ProjectInput) {
    const name = data.name?.trim();
    if (!name) throw new ValidationError("cashflow.projectNameRequired");
    if (data.clientId === undefined) throw new ValidationError("cashflow.clientRequired");
    return db
      .insert(cashflowProjects)
      .values({
        clientId: this.clients.getById(userId, data.clientId).id,
        tradeNameId: this.tradeNames.ownedIdOrNull(userId, data.tradeNameId),
        name,
        description: trimOrNull(data.description),
        location: trimOrNull(data.location),
      })
      .returning()
      .get();
  }

  update(userId: number, id: number, data: ProjectInput) {
    const existing = this.findRow(userId, id);
    return db
      .update(cashflowProjects)
      .set({
        clientId: data.clientId === undefined ? existing.clientId : this.clients.getById(userId, data.clientId).id,
        tradeNameId: patch(
          data.tradeNameId === undefined ? undefined : this.tradeNames.ownedIdOrNull(userId, data.tradeNameId),
          existing.tradeNameId,
        ),
        name: data.name?.trim() || existing.name,
        description: patchText(data.description, existing.description),
        location: patchText(data.location, existing.location),
      })
      .where(eq(cashflowProjects.id, id))
      .returning()
      .get();
  }

  remove(userId: number, id: number, deleteInvoices: boolean) {
    this.findRow(userId, id);
    if (deleteInvoices) {
      db.delete(cashflowInvoices).where(eq(cashflowInvoices.projectId, id)).run();
    } else {
      db.update(cashflowInvoices).set({ projectId: null }).where(eq(cashflowInvoices.projectId, id)).run();
    }
    db.delete(cashflowProjects).where(eq(cashflowProjects.id, id)).run();
    return { deleted: true };
  }
}
