import { requireUser } from "@/lib/server-api";
import { DashboardClient } from "./client";

export default async function DashboardPage() {
  return <DashboardClient user={await requireUser()} />;
}
