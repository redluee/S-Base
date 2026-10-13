import { eq, and, desc, sql } from "drizzle-orm";
import db from "../../db/client";
import { cashflowTradeNames, cashflowClients, cashflowProjects, cashflowInvoices } from "../../db/schema";

export class CashflowRecordService {
  listTradeNames(userId: number) {
    return db.select().from(cashflowTradeNames).where(eq(cashflowTradeNames.userId, userId)).all();
  }

  getTradeNameById(id: number) {
    return db.select().from(cashflowTradeNames).where(eq(cashflowTradeNames.id, id)).get();
  }

  createTradeName(userId: number, data: {
    displayName: string;
    address?: string;
    iban?: string;
    kvkNumber?: string;
    vatNumber?: string;
  }) {
    if (!data.displayName?.trim()) throw new Error("Display name is required");
    return db.insert(cashflowTradeNames).values({
      userId,
      displayName: data.displayName.trim(),
      address: data.address?.trim() || null,
      iban: data.iban?.trim() || null,
      kvkNumber: data.kvkNumber?.trim() || null,
      vatNumber: data.vatNumber?.trim() || null,
    }).returning().get();
  }

  updateTradeName(id: number, data: {
    displayName?: string;
    address?: string | null;
    iban?: string | null;
    kvkNumber?: string | null;
    vatNumber?: string | null;
  }) {
    const existing = this.getTradeNameById(id);
    if (!existing) return null;
    return db.update(cashflowTradeNames).set({
      displayName: data.displayName?.trim() ?? existing.displayName,
      address: data.address !== undefined ? (data.address?.trim() || null) : existing.address,
      iban: data.iban !== undefined ? (data.iban?.trim() || null) : existing.iban,
      kvkNumber: data.kvkNumber !== undefined ? (data.kvkNumber?.trim() || null) : existing.kvkNumber,
      vatNumber: data.vatNumber !== undefined ? (data.vatNumber?.trim() || null) : existing.vatNumber,
    }).where(eq(cashflowTradeNames.id, id)).returning().get();
  }

  removeTradeName(id: number) {
    const existing = this.getTradeNameById(id);
    if (!existing) return null;
    db.delete(cashflowTradeNames).where(eq(cashflowTradeNames.id, id)).run();
    return { deleted: true };
  }

  listClients(userId: number) {
    return db.select().from(cashflowClients).where(eq(cashflowClients.userId, userId)).all();
  }

  getClientById(id: number) {
    return db.select().from(cashflowClients).where(eq(cashflowClients.id, id)).get();
  }

  createClient(userId: number, data: {
    name: string;
    address?: string;
    email?: string;
    kvkNumber?: string;
    standardRate?: number;
    contractPdfPath?: string | null;
    contractPdfName?: string | null;
  }) {
    if (!data.name?.trim()) throw new Error("Client name is required");
    return db.insert(cashflowClients).values({
      userId,
      name: data.name.trim(),
      address: data.address?.trim() || null,
      email: data.email?.trim() || null,
      kvkNumber: data.kvkNumber?.trim() || null,
      standardRate: data.standardRate !== undefined ? Number(data.standardRate) : null,
      contractPdfPath: data.contractPdfPath?.trim() || null,
      contractPdfName: data.contractPdfName?.trim() || null,
    }).returning().get();
  }

  updateClient(id: number, data: {
    name?: string;
    address?: string | null;
    email?: string | null;
    kvkNumber?: string | null;
    standardRate?: number | null;
    contractPdfPath?: string | null;
    contractPdfName?: string | null;
  }) {
    const existing = this.getClientById(id);
    if (!existing) return null;
    return db.update(cashflowClients).set({
      name: data.name?.trim() ?? existing.name,
      address: data.address !== undefined ? (data.address?.trim() || null) : existing.address,
      email: data.email !== undefined ? (data.email?.trim() || null) : existing.email,
      kvkNumber: data.kvkNumber !== undefined ? (data.kvkNumber?.trim() || null) : existing.kvkNumber,
      standardRate: data.standardRate !== undefined ? (data.standardRate !== null ? Number(data.standardRate) : null) : existing.standardRate,
      contractPdfPath: data.contractPdfPath !== undefined ? (data.contractPdfPath?.trim() || null) : existing.contractPdfPath,
      contractPdfName: data.contractPdfName !== undefined ? (data.contractPdfName?.trim() || null) : existing.contractPdfName,
    }).where(eq(cashflowClients.id, id)).returning().get();
  }

  removeClient(id: number) {
    const existing = this.getClientById(id);
    if (!existing) return null;
    db.delete(cashflowClients).where(eq(cashflowClients.id, id)).run();
    return { deleted: true };
  }

  listProjects(userId: number, clientId?: number) {
    const conditions: any[] = [eq(cashflowClients.userId, userId)];
    if (clientId) conditions.push(eq(cashflowProjects.clientId, clientId));

    return db.select({
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

  getProjectById(id: number) {
    return db.select({
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
  }

  createProject(userId: number, data: {
    clientId: number;
    tradeNameId?: number | null;
    name: string;
    description?: string;
    location?: string;
  }) {
    if (!data.name?.trim()) throw new Error("Project name is required");
    return db.insert(cashflowProjects).values({
      clientId: data.clientId,
      tradeNameId: data.tradeNameId ?? null,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      location: data.location?.trim() || null,
    }).returning().get();
  }

  updateProject(id: number, data: {
    clientId?: number;
    tradeNameId?: number | null;
    name?: string;
    description?: string | null;
    location?: string | null;
  }) {
    const existing = db.select().from(cashflowProjects).where(eq(cashflowProjects.id, id)).get();
    if (!existing) return null;
    return db.update(cashflowProjects).set({
      clientId: data.clientId ?? existing.clientId,
      tradeNameId: data.tradeNameId !== undefined ? data.tradeNameId : existing.tradeNameId,
      name: data.name?.trim() ?? existing.name,
      description: data.description !== undefined ? (data.description?.trim() || null) : existing.description,
      location: data.location !== undefined ? (data.location?.trim() || null) : existing.location,
    }).where(eq(cashflowProjects.id, id)).returning().get();
  }

  removeProject(id: number, deleteInvoices: boolean = false) {
    const existing = db.select().from(cashflowProjects).where(eq(cashflowProjects.id, id)).get();
    if (!existing) return null;

    if (deleteInvoices) {
      db.delete(cashflowInvoices).where(eq(cashflowInvoices.projectId, id)).run();
    } else {
      db.update(cashflowInvoices).set({ projectId: null }).where(eq(cashflowInvoices.projectId, id)).run();
    }

    db.delete(cashflowProjects).where(eq(cashflowProjects.id, id)).run();
    return { deleted: true };
  }
}
