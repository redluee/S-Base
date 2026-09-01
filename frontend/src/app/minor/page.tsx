import { serverApi } from "@/lib/server-api";
import { MinorDashboardClient } from "./client";

export default async function MinorPage() {
  const initialStats = await serverApi.minor.dashboard().catch(() => ({
    activeSprint: null,
    nextShowAndGrowDate: null,
    daysUntilShowAndGrow: null,
    officialPasses: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    projectedPasses: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    totalSprints: 0,
    activeSprintWarnings: null,
    recentPeerHelp: [],
  }));

  const initialSprints = await serverApi.minor.sprints.list().catch(() => []);

  return <MinorDashboardClient initialStats={initialStats} initialSprints={initialSprints} />;
}
