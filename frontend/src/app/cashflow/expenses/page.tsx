import { serverApi } from "@/lib/server-api";
import { ExpensesClient } from "./client";

export default async function ExpensesPage() {
  const year = new Date().getFullYear();
  const [items, tradeNames] = await Promise.all([
    serverApi.cashflow.expenses.list({ year }),
    serverApi.cashflow.tradeNames.list(),
  ]);
  return <ExpensesClient initialItems={items} initialYear={year} tradeNames={tradeNames} />;
}
