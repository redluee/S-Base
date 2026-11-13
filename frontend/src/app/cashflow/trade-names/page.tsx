import { serverApi } from "@/lib/server-api";
import { TradeNamesClient } from "./client";

export default async function TradeNamesPage() {
  const items = await serverApi.cashflow.tradeNames.list();
  return <TradeNamesClient initialItems={items} />;
}
