import { eq, and, desc, sql, like, gte, lte } from "drizzle-orm";
import db from "../../db/client";
import {
  cashflowTradeNames,
  cashflowClients,
  cashflowProjects,
  cashflowInvoices,
  cashflowInvoiceLines,
} from "../../db/schema";

const INVOICE_STATUSES = ["draft", "sent", "paid", "overdue"] as const;

export class CashflowService {
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
    standardRate?: number;
  }) {
    if (!data.name?.trim()) throw new Error("Client name is required");
    return db.insert(cashflowClients).values({
      userId,
      name: data.name.trim(),
      address: data.address?.trim() || null,
      email: data.email?.trim() || null,
      standardRate: data.standardRate !== undefined ? Number(data.standardRate) : null,
    }).returning().get();
  }

  updateClient(id: number, data: {
    name?: string;
    address?: string | null;
    email?: string | null;
    standardRate?: number | null;
  }) {
    const existing = this.getClientById(id);
    if (!existing) return null;
    return db.update(cashflowClients).set({
      name: data.name?.trim() ?? existing.name,
      address: data.address !== undefined ? (data.address?.trim() || null) : existing.address,
      email: data.email !== undefined ? (data.email?.trim() || null) : existing.email,
      standardRate: data.standardRate !== undefined ? (data.standardRate !== null ? Number(data.standardRate) : null) : existing.standardRate,
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

  generateInvoiceNumber(userId: number, year: number): string {
    const yearStr = String(year);
    const latest = db.select({ invoiceNumber: cashflowInvoices.invoiceNumber })
      .from(cashflowInvoices)
      .innerJoin(cashflowClients, eq(cashflowInvoices.clientId, cashflowClients.id))
      .where(and(
        eq(cashflowClients.userId, userId),
        like(cashflowInvoices.invoiceNumber, `${yearStr}-%`),
      ))
      .orderBy(desc(cashflowInvoices.invoiceNumber))
      .limit(1)
      .get();

    if (!latest) return `${yearStr}-001`;
    const parts = latest.invoiceNumber.split("-");
    const num = parseInt(parts[1], 10) + 1;
    return `${yearStr}-${String(num).padStart(3, "0")}`;
  }

  listInvoices(userId: number, status?: string, projectId?: number, clientId?: number) {
    const conditions: any[] = [eq(cashflowClients.userId, userId)];
    if (status && INVOICE_STATUSES.includes(status as any)) conditions.push(eq(cashflowInvoices.status, status as any));
    if (projectId) conditions.push(eq(cashflowInvoices.projectId, projectId));
    if (clientId) conditions.push(eq(cashflowInvoices.clientId, clientId));

    const rows = db.select({
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
      total: sql<number>`(SELECT COALESCE(SUM(total_cost), 0) FROM cashflow_invoice_lines WHERE invoice_id = ${cashflowInvoices.id})`,
    })
      .from(cashflowInvoices)
      .innerJoin(cashflowClients, eq(cashflowInvoices.clientId, cashflowClients.id))
      .leftJoin(cashflowProjects, eq(cashflowInvoices.projectId, cashflowProjects.id))
      .leftJoin(cashflowTradeNames, eq(sql`COALESCE(${cashflowInvoices.tradeNameId}, ${cashflowProjects.tradeNameId})`, cashflowTradeNames.id))
      .where(and(...conditions))
      .orderBy(desc(cashflowInvoices.dateCreated))
      .all();

    const now = Date.now();
    return rows.map((inv) => {
      let computedStatus = inv.status;
      if (inv.status !== "paid" && inv.status !== "draft") {
        if (inv.paymentDueDate && inv.paymentDueDate < now) {
          computedStatus = "overdue";
        } else if (inv.dateCreated) {
          computedStatus = "sent";
        }
      } else if (inv.status === "draft" && inv.dateCreated) {
        if (inv.paymentDueDate && inv.paymentDueDate < now) {
          computedStatus = "overdue";
        } else {
          computedStatus = "sent";
        }
      }
      return { ...inv, status: computedStatus };
    });
  }

  getInvoiceById(id: number) {
    const row = db.select({
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
      .leftJoin(cashflowTradeNames, eq(sql`COALESCE(${cashflowInvoices.tradeNameId}, ${cashflowProjects.tradeNameId})`, cashflowTradeNames.id))
      .where(eq(cashflowInvoices.id, id))
      .get();

    if (!row) return null;

    let computedStatus = row.status;
    const now = Date.now();
    if (row.status !== "paid" && row.status !== "draft") {
      if (row.paymentDueDate && row.paymentDueDate < now) {
        computedStatus = "overdue";
      } else if (row.dateCreated) {
        computedStatus = "sent";
      }
    } else if (row.status === "draft" && row.dateCreated) {
      if (row.paymentDueDate && row.paymentDueDate < now) {
        computedStatus = "overdue";
      } else {
        computedStatus = "sent";
      }
    }

    const lines = db.select().from(cashflowInvoiceLines).where(eq(cashflowInvoiceLines.invoiceId, id)).all();
    const total = lines.reduce((sum, l) => sum + l.totalCost, 0);
    return { ...row, status: computedStatus, lines, total };
  }

  createInvoice(userId: number, data: {
    clientId?: number;
    projectId?: number | null;
    tradeNameId?: number | null;
    invoiceNumber: string;
    name?: string | null;
    dateCreated?: number | null;
    dateService?: number | null;
    paymentDueDate?: number | null;
    datePaid?: number | null;
    status?: string;
    isKor: boolean;
    lines: {
      taskDescription: string;
      quantity?: number;
      unitPrice?: number;
      totalCost: number;
      type?: string;
      discountType?: string | null;
      discountValue?: number | null;
    }[];
  }) {
    if (!data.invoiceNumber?.trim()) throw new Error("Invoice number is required");

    let finalClientId = data.clientId;
    let finalTradeNameId = data.tradeNameId;

    if (data.projectId) {
      const proj = this.getProjectById(data.projectId);
      if (proj) {
        if (!finalClientId) finalClientId = proj.clientId;
        if (!finalTradeNameId) finalTradeNameId = proj.tradeNameId ?? null;
      }
    }

    if (!finalClientId) throw new Error("Client is required");

    const status = (data.status as any) ?? "draft";
    const datePaid = data.datePaid !== undefined ? data.datePaid : (status === "paid" ? Date.now() : null);

    const invoice = db.insert(cashflowInvoices).values({
      clientId: finalClientId,
      projectId: data.projectId ?? null,
      tradeNameId: finalTradeNameId ?? null,
      invoiceNumber: data.invoiceNumber.trim(),
      name: data.name?.trim() || null,
      dateCreated: data.dateCreated ?? null,
      dateService: data.dateService ?? null,
      paymentDueDate: data.paymentDueDate ?? null,
      datePaid,
      status,
      isKor: data.isKor,
    }).returning().get();

    for (const line of data.lines ?? []) {
      db.insert(cashflowInvoiceLines).values({
        invoiceId: invoice.id,
        taskDescription: line.taskDescription,
        quantity: Number(line.quantity ?? 1),
        unitPrice: Number(line.unitPrice ?? 0),
        totalCost: Number(line.totalCost),
        type: line.type ?? "hours",
        discountType: line.discountType ?? null,
        discountValue: line.discountValue !== undefined && line.discountValue !== null ? Number(line.discountValue) : null,
      }).run();
    }

    return this.getInvoiceById(invoice.id);
  }

  updateInvoice(id: number, data: {
    clientId?: number;
    projectId?: number | null;
    tradeNameId?: number | null;
    invoiceNumber?: string;
    name?: string | null;
    dateCreated?: number | null;
    dateService?: number | null;
    paymentDueDate?: number | null;
    datePaid?: number | null;
    status?: string;
    isKor?: boolean;
    lines?: {
      taskDescription: string;
      quantity?: number;
      unitPrice?: number;
      totalCost: number;
      type?: string;
      discountType?: string | null;
      discountValue?: number | null;
    }[];
  }) {
    const existing = db.select().from(cashflowInvoices).where(eq(cashflowInvoices.id, id)).get();
    if (!existing) return null;
    if (data.status && !INVOICE_STATUSES.includes(data.status as any)) throw new Error("Invalid status");

    const nextStatus = (data.status as any) ?? existing.status;
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

    let finalClientId = data.clientId ?? existing.clientId;
    let finalProjectId = data.projectId !== undefined ? data.projectId : existing.projectId;
    let finalTradeNameId = data.tradeNameId !== undefined ? data.tradeNameId : existing.tradeNameId;

    if (finalProjectId && !finalClientId) {
      const proj = this.getProjectById(finalProjectId);
      if (proj) finalClientId = proj.clientId;
    }

    db.update(cashflowInvoices).set({
      clientId: finalClientId,
      projectId: finalProjectId,
      tradeNameId: finalTradeNameId,
      invoiceNumber: data.invoiceNumber?.trim() ?? existing.invoiceNumber,
      name: data.name !== undefined ? (data.name?.trim() || null) : existing.name,
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
        db.insert(cashflowInvoiceLines).values({
          invoiceId: id,
          taskDescription: line.taskDescription,
          quantity: Number(line.quantity ?? 1),
          unitPrice: Number(line.unitPrice ?? 0),
          totalCost: Number(line.totalCost),
          type: line.type ?? "hours",
          discountType: line.discountType ?? null,
          discountValue: line.discountValue !== undefined && line.discountValue !== null ? Number(line.discountValue) : null,
        }).run();
      }
    }

    return this.getInvoiceById(id);
  }

  markAsPaid(id: number, datePaid?: number | null) {
    const existing = db.select().from(cashflowInvoices).where(eq(cashflowInvoices.id, id)).get();
    if (!existing) return null;
    const finalDatePaid = datePaid !== undefined ? datePaid : (existing.datePaid ?? Date.now());
    db.update(cashflowInvoices).set({ status: "paid", datePaid: finalDatePaid }).where(eq(cashflowInvoices.id, id)).run();
    return this.getInvoiceById(id);
  }

  removeInvoice(id: number) {
    const existing = db.select().from(cashflowInvoices).where(eq(cashflowInvoices.id, id)).get();
    if (!existing) return null;
    db.delete(cashflowInvoices).where(eq(cashflowInvoices.id, id)).run();
    return { deleted: true };
  }

  getDashboardStats(userId: number, targetYear?: number) {
    const effectivePaidDate = sql<number>`COALESCE(${cashflowInvoices.datePaid}, ${cashflowInvoices.dateCreated}, ${cashflowInvoices.dateService}, CAST(strftime('%s', ${cashflowInvoices.createdAt}) AS INTEGER) * 1000)`;
    const monthCol = sql<string>`strftime('%Y-%m', datetime(${effectivePaidDate} / 1000, 'unixepoch', 'localtime'))`;

    let dateFilter;
    if (targetYear) {
      const startOfYear = new Date(targetYear, 0, 1).getTime();
      const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59, 999).getTime();
      dateFilter = and(
        gte(effectivePaidDate, startOfYear),
        lte(effectivePaidDate, endOfYear)
      );
    } else {
      const d = new Date();
      const startOf12MonthsAgo = new Date(d.getFullYear(), d.getMonth() - 11, 1).getTime();
      dateFilter = gte(effectivePaidDate, startOf12MonthsAgo);
    }

    const monthlyIncome = db.select({
      month: monthCol,
      total: sql<number>`COALESCE(SUM(${cashflowInvoiceLines.totalCost}), 0)`,
    })
      .from(cashflowInvoiceLines)
      .innerJoin(cashflowInvoices, eq(cashflowInvoiceLines.invoiceId, cashflowInvoices.id))
      .innerJoin(cashflowClients, eq(cashflowInvoices.clientId, cashflowClients.id))
      .leftJoin(cashflowProjects, eq(cashflowInvoices.projectId, cashflowProjects.id))
      .where(and(
        eq(cashflowInvoices.status, "paid"),
        eq(cashflowClients.userId, userId),
        dateFilter
      ))
      .groupBy(monthCol)
      .orderBy(monthCol)
      .all();

    const statusTotals = db.select({
      status: cashflowInvoices.status,
      count: sql<number>`COUNT(DISTINCT ${cashflowInvoices.id})`,
      total: sql<number>`COALESCE(SUM(${cashflowInvoiceLines.totalCost}), 0)`,
    })
      .from(cashflowInvoices)
      .innerJoin(cashflowClients, eq(cashflowInvoices.clientId, cashflowClients.id))
      .leftJoin(cashflowProjects, eq(cashflowInvoices.projectId, cashflowProjects.id))
      .leftJoin(cashflowInvoiceLines, eq(cashflowInvoiceLines.invoiceId, cashflowInvoices.id))
      .where(eq(cashflowClients.userId, userId))
      .groupBy(cashflowInvoices.status)
      .all();

    const totalPaid12m = monthlyIncome.reduce((s, m) => s + m.total, 0);

    return { monthlyIncome, statusTotals, totalPaid12m };
  }
}
