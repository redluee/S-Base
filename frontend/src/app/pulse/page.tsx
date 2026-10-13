import { serverApi, getCurrentUser } from "@/lib/server-api";
import { redirect } from "next/navigation";
import { PulseClient } from "./client";
import type { McServer, ShutdownSchedule, SystemUpdateState } from "@/lib/api";

export default async function PulsePage() {
  const user = await getCurrentUser();
  if (!user || !user.modules?.includes("pulse")) {
    redirect("/dashboard");
  }

  const [initialUsers, initialModules, initialStats, initialServers, initialShutdownSchedule, initialSystemUpdate] = await Promise.all([
    serverApi.pulse.users(),
    serverApi.pulse.modules(),
    serverApi.pulse.stats(),
    serverApi.minecraft.servers.list().catch(() => [] as McServer[]),
    serverApi.pulse.shutdownSchedule().catch(() => ({
      enabled: true,
      time: "01:00",
      blockedUntil: null,
      isBlocked: false,
      nextShutdownAt: null,
      minutesUntilShutdown: null,
    } as ShutdownSchedule)),
    serverApi.pulse.systemUpdate().catch(() => ({
      status: "idle",
      phase: null,
      progress: null,
      startedAt: null,
      finishedAt: null,
      exitCode: null,
      log: [],
      error: null,
    } as SystemUpdateState)),
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

