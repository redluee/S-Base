import { serverApi } from "@/lib/server-api";
import type { CashflowClient } from "@/lib/api";
import { ClientsClient } from "./client";

export default async function ClientsPage() {
  const items = await serverApi.cashflow.clients.list().catch((): CashflowClient[] => []);
  return <ClientsClient initialItems={items} />;
}
