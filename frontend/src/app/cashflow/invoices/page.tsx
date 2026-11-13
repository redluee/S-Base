import { serverApi } from "@/lib/server-api";
import { InvoicesClient } from "./client";

export default async function InvoicesPage() {
  const [invoices, clients, projects] = await Promise.all([
    serverApi.cashflow.invoices.list(),
    serverApi.cashflow.clients.list(),
    serverApi.cashflow.projects.list(),
  ]);
  return <InvoicesClient initialInvoices={invoices} clients={clients} projects={projects} />;
}
