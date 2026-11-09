import { serverApi } from "@/lib/server-api";
import type { CashflowTradeName } from "@/lib/api";
import { TradeNamesClient } from "./client";

export default async function TradeNamesPage() {
  const items = await serverApi.cashflow.tradeNames.list().catch((): CashflowTradeName[] => []);
  return <TradeNamesClient initialItems={items} />;
}
