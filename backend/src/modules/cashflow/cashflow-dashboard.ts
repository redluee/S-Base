import { and, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import db from "../../db/client";
import { cashflowClients, cashflowExpenses, cashflowInvoiceLines, cashflowInvoices } from "../../db/schema";
import { computeInvoiceStatus, type InvoiceStatus } from "../../shared/cashflow";
import { expenseDate } from "./cashflow-expenses";
import { invoiceDate } from "./cashflow-invoices";
import { periodStart } from "./cashflow-helpers";

const monthOf = (timestamp: SQL<number>) =>
  sql<string>`strftime('%Y-%m', datetime(${timestamp} / 1000, 'unixepoch', 'localtime'))`;
const lineSum = (condition: SQL) =>
  sql<number>`COALESCE(SUM(CASE WHEN ${condition} THEN ${cashflowInvoiceLines.totalCost} ELSE 0 END), 0)`;
const isPaid = sql`${cashflowInvoices.status} = 'paid'`;
const isOpen = sql`${cashflowInvoices.status} IN ('sent', 'overdue')`;
const isDatedDraft = sql`${cashflowInvoices.status} = 'draft' AND ${cashflowInvoices.dateCreated} IS NOT NULL`;

function within(timestamp: SQL<number>, targetYear?: number): SQL | undefined {
  const { start, end } = periodStart(targetYear);
  return end === undefined ? gte(timestamp, start) : and(gte(timestamp, start), lte(timestamp, end));
}

export type CashflowDashboardStats = ReturnType<CashflowDashboard["getStats"]>;

export class CashflowDashboard {
  getStats(userId: number, targetYear?: number) {
    const ownInvoice = and(eq(cashflowClients.userId, userId), within(invoiceDate, targetYear));
    const incomeMonth = monthOf(invoiceDate);
    const monthlyIncome = db
      .select({
        month: incomeMonth,
        paid: lineSum(isPaid),
        open: lineSum(isOpen),
        draft: lineSum(isDatedDraft),
        expected: lineSum(sql`(${isOpen}) OR (${isDatedDraft})`),
      })
      .from(cashflowInvoiceLines)
      .innerJoin(cashflowInvoices, eq(cashflowInvoiceLines.invoiceId, cashflowInvoices.id))
      .innerJoin(cashflowClients, eq(cashflowInvoices.clientId, cashflowClients.id))
      .where(
        and(
          ownInvoice,
          sql`(${cashflowInvoices.status} != 'draft' OR ${cashflowInvoices.dateCreated} IS NOT NULL OR ${cashflowInvoices.dateService} IS NOT NULL)`,
        ),
      )
      .groupBy(incomeMonth)
      .orderBy(incomeMonth)
      .all();

    const invoices = db
      .select({
        status: cashflowInvoices.status,
        paymentDueDate: cashflowInvoices.paymentDueDate,
        dateCreated: cashflowInvoices.dateCreated,
        total: sql<number>`COALESCE(SUM(${cashflowInvoiceLines.totalCost}), 0)`,
      })
      .from(cashflowInvoices)
      .innerJoin(cashflowClients, eq(cashflowInvoices.clientId, cashflowClients.id))
      .leftJoin(cashflowInvoiceLines, eq(cashflowInvoiceLines.invoiceId, cashflowInvoices.id))
      .where(ownInvoice)
      .groupBy(cashflowInvoices.id)
      .all();
    const now = Date.now();
    const totalsByStatus = new Map<InvoiceStatus, { status: InvoiceStatus; count: number; total: number }>();
    for (const inv of invoices) {
      const status = computeInvoiceStatus(inv.status, inv.paymentDueDate, inv.dateCreated, now);
      const entry = totalsByStatus.get(status) ?? { status, count: 0, total: 0 };
      entry.count += 1;
      entry.total += inv.total;
      totalsByStatus.set(status, entry);
    }

    const expenseMonth = monthOf(expenseDate);
    const monthlyExpenses = db
      .select({
        month: expenseMonth,
        total: sql<number>`COALESCE(SUM(${cashflowExpenses.amount}), 0)`,
        count: sql<number>`COUNT(${cashflowExpenses.id})`,
      })
      .from(cashflowExpenses)
      .where(and(eq(cashflowExpenses.userId, userId), within(expenseDate, targetYear)))
      .groupBy(expenseMonth)
      .orderBy(expenseMonth)
      .all();

    const totalPaid12m = monthlyIncome.reduce((s, m) => s + m.paid, 0);
    const totalExpenses12m = monthlyExpenses.reduce((s, m) => s + m.total, 0);

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
    const firstRecordYear = earliestRow[0]?.earliest_year
      ? Number(earliestRow[0].earliest_year)
      : new Date().getFullYear();

    return {
      monthlyIncome,
      statusTotals: [...totalsByStatus.values()],
      totalPaid12m,
      monthlyExpenses,
      totalExpenses12m,
      netProfit12m: totalPaid12m - totalExpenses12m,
      firstRecordYear,
    };
  }
}
