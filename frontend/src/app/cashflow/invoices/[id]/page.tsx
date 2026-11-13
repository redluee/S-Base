import { notFoundOn404, serverApi } from "@/lib/server-api";
import { InvoiceDetailClient } from "./client";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InvoiceDetailClient initialInvoice={await notFoundOn404(serverApi.cashflow.invoices.get(Number(id)))} />;
}
