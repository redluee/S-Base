import type { cashflowClients, cashflowTradeNames } from "../db/schema";
import type { CashflowDashboardStats } from "../modules/cashflow/cashflow-dashboard";
import type { CashflowExpenses } from "../modules/cashflow/cashflow-expenses";
import type { CashflowInvoices } from "../modules/cashflow/cashflow-invoices";
import type { CashflowProjects } from "../modules/cashflow/cashflow-projects";

export type { CashflowDashboardStats };
export type {
  ClientInput,
  ExpenseInput,
  InvoiceInput,
  InvoiceLineInput,
  ProjectInput,
  TradeNameInput,
} from "../modules/cashflow/cashflow-types";
export type CashflowTradeName = typeof cashflowTradeNames.$inferSelect;
export type CashflowClient = typeof cashflowClients.$inferSelect;
export type CashflowProject = ReturnType<CashflowProjects["list"]>[number];
export type CashflowProjectDetail = ReturnType<CashflowProjects["getById"]>;
export type CashflowInvoiceSummary = ReturnType<CashflowInvoices["list"]>[number];
export type CashflowInvoiceFull = ReturnType<CashflowInvoices["getById"]>;
export type CashflowInvoiceLine = CashflowInvoiceFull["lines"][number];
export type CashflowExpense = ReturnType<CashflowExpenses["getById"]>;
