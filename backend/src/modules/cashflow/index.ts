import { CashflowClients } from "./cashflow-clients";
import { CashflowDashboard } from "./cashflow-dashboard";
import { CashflowExpenses } from "./cashflow-expenses";
import { CashflowInvoiceEmail } from "./cashflow-invoice-email";
import { CashflowInvoiceWrites } from "./cashflow-invoice-writes";
import { CashflowInvoices } from "./cashflow-invoices";
import { CashflowProjects } from "./cashflow-projects";
import { CashflowTradeNames } from "./cashflow-trade-names";

export { INVOICE_STATUSES } from "./cashflow-helpers";

export class CashflowService {
  readonly tradeNames = new CashflowTradeNames();
  readonly clients = new CashflowClients();
  readonly projects = new CashflowProjects();
  readonly invoices = new CashflowInvoices();
  readonly invoiceWrites = new CashflowInvoiceWrites(this.invoices, this.projects);
  readonly invoiceEmail = new CashflowInvoiceEmail(this.invoices);
  readonly expenses = new CashflowExpenses();
  readonly dashboard = new CashflowDashboard();
}
