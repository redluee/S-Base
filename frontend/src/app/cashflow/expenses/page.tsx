import { serverApi } from "@/lib/server-api";
import type { CashflowExpense, CashflowTradeName } from "@/lib/api";
import { ExpensesClient } from "./client";

export default async function ExpensesPage() {
  const year = new Date().getFullYear();
  const [items, tradeNames] = await Promise.all([
    serverApi.cashflow.expenses.list({ year }).catch((): CashflowExpense[] => []),
    serverApi.cashflow.tradeNames.list().catch((): CashflowTradeName[] => []),
  ]);
  return <ExpensesClient initialItems={items} initialYear={year} tradeNames={tradeNames} />;
}
