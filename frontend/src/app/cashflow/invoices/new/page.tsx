import { notFoundOn404, serverApi } from "@/lib/server-api";
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
    serverApi.cashflow.clients.list(),
    serverApi.cashflow.projects.list(),
    serverApi.cashflow.tradeNames.list(),
    serverApi.cashflow.invoices.nextNumber(),
    editId ? notFoundOn404(serverApi.cashflow.invoices.get(Number(editId))) : Promise.resolve(null),
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
