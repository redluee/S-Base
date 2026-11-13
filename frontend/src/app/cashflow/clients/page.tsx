import { serverApi } from "@/lib/server-api";
import { ClientsClient } from "./client";

export default async function ClientsPage() {
  const items = await serverApi.cashflow.clients.list();
  return <ClientsClient initialItems={items} />;
}
