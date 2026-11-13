import { serverApi } from "@/lib/server-api";
import { MinorDashboardClient } from "./client";

export default async function MinorPage() {
  const [initialStats, initialSprints] = await Promise.all([serverApi.minor.dashboard(), serverApi.minor.sprints.list()]);
  return <MinorDashboardClient initialStats={initialStats} initialSprints={initialSprints} />;
}
