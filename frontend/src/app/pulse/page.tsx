import { requireUser, serverApi } from "@/lib/server-api";
import { PulseClient } from "./client";

export default async function PulsePage() {
  const user = await requireUser();

  const [initialUsers, initialModules, initialStats, initialServers, initialShutdownSchedule, initialSystemUpdate] = await Promise.all([
    serverApi.pulse.users(),
    serverApi.pulse.modules(),
    serverApi.pulse.stats(),
    user.modules.includes("minecraft") ? serverApi.minecraft.servers.list() : Promise.resolve([]),
    serverApi.pulse.getShutdownSchedule(),
    serverApi.pulse.getSystemUpdate(),
  ]);

  return (
    <PulseClient
      username={user.username}
      initialUsers={initialUsers}
      initialModules={initialModules}
      initialStats={initialStats}
      initialServers={initialServers}
      initialShutdownSchedule={initialShutdownSchedule}
      initialSystemUpdate={initialSystemUpdate}
    />
  );
}

