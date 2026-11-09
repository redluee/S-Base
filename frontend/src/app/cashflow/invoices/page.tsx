import { serverApi } from "@/lib/server-api";
import type { CashflowClient, CashflowInvoiceSummary, CashflowProject } from "@/lib/api";
import { InvoicesClient } from "./client";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; projectId?: string }>;
}) {
  const { clientId, projectId } = await searchParams;
  const [invoices, clients, projects] = await Promise.all([
    serverApi.cashflow.invoices
      .list(undefined, projectId ? Number(projectId) : undefined, clientId ? Number(clientId) : undefined)
      .catch((): CashflowInvoiceSummary[] => []),
    serverApi.cashflow.clients.list().catch((): CashflowClient[] => []),
    serverApi.cashflow.projects.list().catch((): CashflowProject[] => []),
  ]);
  return <InvoicesClient initialInvoices={invoices} clients={clients} projects={projects} />;
}
