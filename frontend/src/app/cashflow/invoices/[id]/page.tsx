import { redirect } from "next/navigation";
import { serverApi } from "@/lib/server-api";
import type { CashflowInvoiceFull } from "@/lib/api";
import { InvoiceDetailClient } from "./client";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice: CashflowInvoiceFull | null = await serverApi.cashflow.invoices.get(Number(id)).catch(() => null);
  if (!invoice) redirect("/cashflow/invoices");
  return <InvoiceDetailClient initialInvoice={invoice} />;
}
