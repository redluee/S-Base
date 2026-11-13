import { serverApi } from "@/lib/server-api";
import { CashflowDashboardClient } from "./client";

export const metadata = { title: "Cashflow — S-Base" };

export default async function CashflowPage() {
  const year = new Date().getFullYear();
  return <CashflowDashboardClient initialYear={year} initialStats={await serverApi.cashflow.dashboard(year)} />;
}
