import { serverApi, getCurrentUser } from "@/lib/server-api";
import { redirect } from "next/navigation";
import { PulseClient } from "./client";
import type { McServer } from "@/lib/api";

export default async function PulsePage() {
  const user = await getCurrentUser();
  if (!user || !user.modules?.includes("pulse")) {
    redirect("/dashboard");
  }

  const [initialUsers, initialModules, initialStats, initialServers] = await Promise.all([
    serverApi.pulse.users(),
    serverApi.pulse.modules(),
    serverApi.pulse.stats(),
    serverApi.minecraft.servers.list().catch(() => [] as McServer[]),
  ]);

  return (
    <PulseClient
      username={user.username}
      initialUsers={initialUsers}
      initialModules={initialModules}
      initialStats={initialStats}
      initialServers={initialServers}
    />
  );
}

