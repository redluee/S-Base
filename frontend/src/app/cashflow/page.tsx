import { serverApi, getCurrentUser } from "@/lib/server-api";
import { redirect } from "next/navigation";
import { CashflowDashboardClient } from "./client";

export const metadata = { title: "Cashflow — S-Base" };

export default async function CashflowPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (!user.modules?.includes("cashflow")) redirect("/dashboard");

  let stats = null;
  try {
    stats = await serverApi.cashflow.dashboard();
  } catch {
    stats = null;
  }
  return <CashflowDashboardClient stats={stats} />;
}
