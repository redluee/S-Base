import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import db from "../../db/client";
import { cashflowTradeNames, cashflowClients, cashflowProjects, cashflowInvoices, cashflowInvoiceLines, cashflowExpenses } from "../../db/schema";
import { CashflowInvoiceService } from "./cashflow-invoices";

export class CashflowExpenseService extends CashflowInvoiceService {
  listExpenses(userId: number, options?: { year?: number; category?: string; tradeNameId?: number }) {
    const conditions: any[] = [eq(cashflowExpenses.userId, userId)];

    if (options?.category) {
      conditions.push(eq(cashflowExpenses.category, options.category));
    }

    if (options?.tradeNameId) {
      conditions.push(eq(cashflowExpenses.tradeNameId, options.tradeNameId));
    }

    if (options?.year) {
      const startOfYear = new Date(options.year, 0, 1).getTime();
      const endOfYear = new Date(options.year, 11, 31, 23, 59, 59, 999).getTime();
      const effectiveDate = sql<number>`COALESCE(${cashflowExpenses.date}, CAST(strftime('%s', ${cashflowExpenses.createdAt}) AS INTEGER) * 1000)`;
      conditions.push(and(gte(effectiveDate, startOfYear), lte(effectiveDate, endOfYear)));
    }

    return db.select({
      id: cashflowExpenses.id,
      userId: cashflowExpenses.userId,
      description: cashflowExpenses.description,
      category: cashflowExpenses.category,
      amount: cashflowExpenses.amount,
      date: cashflowExpenses.date,
      tradeNameId: cashflowExpenses.tradeNameId,
      tradeNameDisplay: cashflowTradeNames.displayName,
      receiptPdfPath: cashflowExpenses.receiptPdfPath,
      receiptPdfName: cashflowExpenses.receiptPdfName,
      notes: cashflowExpenses.notes,
      createdAt: cashflowExpenses.createdAt,
    })
      .from(cashflowExpenses)
      .leftJoin(cashflowTradeNames, eq(cashflowExpenses.tradeNameId, cashflowTradeNames.id))
      .where(and(...conditions))
      .orderBy(desc(sql`COALESCE(${cashflowExpenses.date}, CAST(strftime('%s', ${cashflowExpenses.createdAt}) AS INTEGER) * 1000)`), desc(cashflowExpenses.createdAt))
      .all();
  }

  getExpenseById(id: number) {
    return db.select({
      id: cashflowExpenses.id,
      userId: cashflowExpenses.userId,
      description: cashflowExpenses.description,
      category: cashflowExpenses.category,
      amount: cashflowExpenses.amount,
      date: cashflowExpenses.date,
      tradeNameId: cashflowExpenses.tradeNameId,
      tradeNameDisplay: cashflowTradeNames.displayName,
      receiptPdfPath: cashflowExpenses.receiptPdfPath,
      receiptPdfName: cashflowExpenses.receiptPdfName,
      notes: cashflowExpenses.notes,
      createdAt: cashflowExpenses.createdAt,
    })
      .from(cashflowExpenses)
      .leftJoin(cashflowTradeNames, eq(cashflowExpenses.tradeNameId, cashflowTradeNames.id))
      .where(eq(cashflowExpenses.id, id))
      .get();
  }

  createExpense(userId: number, data: {
    description: string;
    category?: string | null;
    amount: number;
    date?: number | null;
    tradeNameId?: number | null;
    receiptPdfPath?: string | null;
    receiptPdfName?: string | null;
    notes?: string | null;
  }) {
    if (!data.description?.trim()) throw new Error("Omschrijving van de uitgave is verplicht");
    if (data.amount === undefined || data.amount === null || isNaN(Number(data.amount))) {
      throw new Error("Bedrag is verplicht");
    }

    const inserted = db.insert(cashflowExpenses).values({
      userId,
      description: data.description.trim(),
      category: data.category?.trim() || "Overig",
      amount: Number(data.amount),
      date: data.date ? Number(data.date) : Date.now(),
      tradeNameId: data.tradeNameId ? Number(data.tradeNameId) : null,
      receiptPdfPath: data.receiptPdfPath?.trim() || null,
      receiptPdfName: data.receiptPdfName?.trim() || null,
      notes: data.notes?.trim() || null,
    }).returning().get();

    return this.getExpenseById(inserted.id);
  }

  updateExpense(id: number, data: {
    description?: string;
    category?: string | null;
    amount?: number;
    date?: number | null;
    tradeNameId?: number | null;
    receiptPdfPath?: string | null;
    receiptPdfName?: string | null;
    notes?: string | null;
  }) {
    const existing = db.select().from(cashflowExpenses).where(eq(cashflowExpenses.id, id)).get();
    if (!existing) return null;

    db.update(cashflowExpenses).set({
      description: data.description !== undefined ? data.description.trim() : existing.description,
      category: data.category !== undefined ? (data.category?.trim() || "Overig") : existing.category,
      amount: data.amount !== undefined ? Number(data.amount) : existing.amount,
      date: data.date !== undefined ? (data.date ? Number(data.date) : null) : existing.date,
      tradeNameId: data.tradeNameId !== undefined ? (data.tradeNameId ? Number(data.tradeNameId) : null) : existing.tradeNameId,
      receiptPdfPath: data.receiptPdfPath !== undefined ? (data.receiptPdfPath?.trim() || null) : existing.receiptPdfPath,
      receiptPdfName: data.receiptPdfName !== undefined ? (data.receiptPdfName?.trim() || null) : existing.receiptPdfName,
      notes: data.notes !== undefined ? (data.notes?.trim() || null) : existing.notes,
    }).where(eq(cashflowExpenses.id, id)).run();

    return this.getExpenseById(id);
  }

  removeExpense(id: number) {
    const existing = db.select().from(cashflowExpenses).where(eq(cashflowExpenses.id, id)).get();
    if (!existing) return null;
    db.delete(cashflowExpenses).where(eq(cashflowExpenses.id, id)).run();
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
      paid: sql<number>`COALESCE(SUM(CASE WHEN ${cashflowInvoices.status} = 'paid' THEN ${cashflowInvoiceLines.totalCost} ELSE 0 END), 0)`,
      open: sql<number>`COALESCE(SUM(CASE WHEN ${cashflowInvoices.status} IN ('sent', 'overdue') THEN ${cashflowInvoiceLines.totalCost} ELSE 0 END), 0)`,
      draft: sql<number>`COALESCE(SUM(CASE WHEN ${cashflowInvoices.status} = 'draft' AND ${cashflowInvoices.dateCreated} IS NOT NULL THEN ${cashflowInvoiceLines.totalCost} ELSE 0 END), 0)`,
      expected: sql<number>`COALESCE(SUM(CASE WHEN ${cashflowInvoices.status} IN ('sent', 'overdue') OR (${cashflowInvoices.status} = 'draft' AND ${cashflowInvoices.dateCreated} IS NOT NULL) THEN ${cashflowInvoiceLines.totalCost} ELSE 0 END), 0)`,
      total: sql<number>`COALESCE(SUM(CASE WHEN ${cashflowInvoices.status} = 'paid' THEN ${cashflowInvoiceLines.totalCost} ELSE 0 END), 0)`,
    })
      .from(cashflowInvoiceLines)
      .innerJoin(cashflowInvoices, eq(cashflowInvoiceLines.invoiceId, cashflowInvoices.id))
      .innerJoin(cashflowClients, eq(cashflowInvoices.clientId, cashflowClients.id))
      .leftJoin(cashflowProjects, eq(cashflowInvoices.projectId, cashflowProjects.id))
      .where(and(
        eq(cashflowClients.userId, userId),
        sql`(${cashflowInvoices.status} != 'draft' OR ${cashflowInvoices.dateCreated} IS NOT NULL OR ${cashflowInvoices.dateService} IS NOT NULL)`,
        dateFilter
      ))
      .groupBy(monthCol)
      .orderBy(monthCol)
      .all();

    const now = Date.now();
    const computedStatusSql = sql<string>`
      CASE
        WHEN ${cashflowInvoices.status} != 'paid' AND ${cashflowInvoices.status} != 'draft' AND ${cashflowInvoices.paymentDueDate} IS NOT NULL AND ${cashflowInvoices.paymentDueDate} < ${now} THEN 'overdue'
        ELSE ${cashflowInvoices.status}
      END
    `;

    const statusTotals = db.select({
      status: computedStatusSql,
      count: sql<number>`COUNT(DISTINCT ${cashflowInvoices.id})`,
      total: sql<number>`COALESCE(SUM(${cashflowInvoiceLines.totalCost}), 0)`,
    })
      .from(cashflowInvoices)
      .innerJoin(cashflowClients, eq(cashflowInvoices.clientId, cashflowClients.id))
      .leftJoin(cashflowProjects, eq(cashflowInvoices.projectId, cashflowProjects.id))
      .leftJoin(cashflowInvoiceLines, eq(cashflowInvoiceLines.invoiceId, cashflowInvoices.id))
      .where(and(
        eq(cashflowClients.userId, userId),
        dateFilter
      ))
      .groupBy(computedStatusSql)
      .all();

    const effectiveExpenseDate = sql<number>`COALESCE(${cashflowExpenses.date}, CAST(strftime('%s', ${cashflowExpenses.createdAt}) AS INTEGER) * 1000)`;
    const expenseMonthCol = sql<string>`strftime('%Y-%m', datetime(${effectiveExpenseDate} / 1000, 'unixepoch', 'localtime'))`;

    let expenseDateFilter;
    if (targetYear) {
      const startOfYear = new Date(targetYear, 0, 1).getTime();
      const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59, 999).getTime();
      expenseDateFilter = and(
        gte(effectiveExpenseDate, startOfYear),
        lte(effectiveExpenseDate, endOfYear)
      );
    } else {
      const d = new Date();
      const startOf12MonthsAgo = new Date(d.getFullYear(), d.getMonth() - 11, 1).getTime();
      expenseDateFilter = gte(effectiveExpenseDate, startOf12MonthsAgo);
    }

    const monthlyExpenses = db.select({
      month: expenseMonthCol,
      total: sql<number>`COALESCE(SUM(${cashflowExpenses.amount}), 0)`,
      count: sql<number>`COUNT(${cashflowExpenses.id})`,
    })
      .from(cashflowExpenses)
      .where(and(
        eq(cashflowExpenses.userId, userId),
        expenseDateFilter
      ))
      .groupBy(expenseMonthCol)
      .orderBy(expenseMonthCol)
      .all();

    const expensesByCategory = db.select({
      category: sql<string>`COALESCE(${cashflowExpenses.category}, 'Overig')`,
      total: sql<number>`COALESCE(SUM(${cashflowExpenses.amount}), 0)`,
      count: sql<number>`COUNT(${cashflowExpenses.id})`,
    })
      .from(cashflowExpenses)
      .where(and(
        eq(cashflowExpenses.userId, userId),
        expenseDateFilter
      ))
      .groupBy(sql`COALESCE(${cashflowExpenses.category}, 'Overig')`)
      .orderBy(desc(sql`SUM(${cashflowExpenses.amount})`))
      .all();

    const totalPaid12m = monthlyIncome.reduce((s, m) => s + m.paid, 0);
    const totalExpected12m = monthlyIncome.reduce((s, m) => s + m.expected, 0);
    const totalExpenses12m = monthlyExpenses.reduce((s, m) => s + m.total, 0);
    const netProfit12m = totalPaid12m - totalExpenses12m;

    const earliestRow = db.all<{ earliest_year: string | null }>(sql`
      SELECT MIN(strftime('%Y', datetime(val / 1000, 'unixepoch', 'localtime'))) as earliest_year FROM (
        SELECT date_created as val FROM cashflow_invoices i JOIN cashflow_clients c ON i.client_id = c.id WHERE c.user_id = ${userId} AND date_created IS NOT NULL
        UNION ALL
        SELECT date_service as val FROM cashflow_invoices i JOIN cashflow_clients c ON i.client_id = c.id WHERE c.user_id = ${userId} AND date_service IS NOT NULL
        UNION ALL
        SELECT date_paid as val FROM cashflow_invoices i JOIN cashflow_clients c ON i.client_id = c.id WHERE c.user_id = ${userId} AND date_paid IS NOT NULL
        UNION ALL
        SELECT CAST(strftime('%s', i.created_at) AS INTEGER) * 1000 as val FROM cashflow_invoices i JOIN cashflow_clients c ON i.client_id = c.id WHERE c.user_id = ${userId}
        UNION ALL
        SELECT il.date as val FROM cashflow_invoice_lines il JOIN cashflow_invoices i ON il.invoice_id = i.id JOIN cashflow_clients c ON i.client_id = c.id WHERE c.user_id = ${userId} AND il.date IS NOT NULL
        UNION ALL
        SELECT date as val FROM cashflow_expenses e WHERE e.user_id = ${userId} AND date IS NOT NULL
        UNION ALL
        SELECT CAST(strftime('%s', e.created_at) AS INTEGER) * 1000 as val FROM cashflow_expenses e WHERE e.user_id = ${userId}
        UNION ALL
        SELECT CAST(strftime('%s', c.created_at) AS INTEGER) * 1000 as val FROM cashflow_clients c WHERE c.user_id = ${userId}
      )
    `);
    const firstRecordYear = earliestRow[0]?.earliest_year ? Number(earliestRow[0].earliest_year) : new Date().getFullYear();

    return {
      monthlyIncome,
      statusTotals,
      totalPaid12m,
      totalExpected12m,
      monthlyExpenses,
      expensesByCategory,
      totalExpenses12m,
      netProfit12m,
      firstRecordYear,
    };
  }
}
