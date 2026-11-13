import { serverApi } from "@/lib/server-api";
import { CashflowDashboardClient } from "./client";

export const metadata = { title: "Cashflow — S-Base" };

export default async function CashflowPage() {
  let stats = null;
  try {
    stats = await serverApi.cashflow.dashboard();
  } catch {
    stats = null;
  }
  return <CashflowDashboardClient stats={stats} />;
}
