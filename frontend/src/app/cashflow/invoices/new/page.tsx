import { serverApi } from "@/lib/server-api";
import type { CashflowClient, CashflowProject, CashflowTradeName } from "@/lib/api";
import { NewInvoiceClient } from "./client";

export const metadata = { title: "Nieuwe factuur — Cashflow" };

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const editId = edit ?? null;
  const [clients, projects, tradeNames, nextNumber, invoice] = await Promise.all([
    serverApi.cashflow.clients.list().catch((): CashflowClient[] => []),
    serverApi.cashflow.projects.list().catch((): CashflowProject[] => []),
    serverApi.cashflow.tradeNames.list().catch((): CashflowTradeName[] => []),
    serverApi.cashflow.invoices.nextNumber().catch(() => ({ invoiceNumber: "" })),
    editId ? serverApi.cashflow.invoices.get(Number(editId)).catch(() => null) : Promise.resolve(null),
  ]);
  return (
    <NewInvoiceClient
      key={editId ?? "new"}
      editId={editId}
      initialInvoice={invoice}
      initialClients={clients}
      initialProjects={projects}
      tradeNames={tradeNames}
      nextInvoiceNumber={nextNumber.invoiceNumber}
    />
  );
}
