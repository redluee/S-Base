import { serverApi, getCurrentUser } from "@/lib/server-api";
import { redirect } from "next/navigation";
import { PulseClient } from "./client";

export default async function PulsePage() {
  const user = await getCurrentUser();
  if (!user || !user.modules?.includes("pulse")) {
    redirect("/dashboard");
  }

  const [initialUsers, initialModules, initialStats] = await Promise.all([
    serverApi.pulse.users(),
    serverApi.pulse.modules(),
    serverApi.pulse.stats(),
  ]);

  return (
    <PulseClient
      username={user.username}
      initialUsers={initialUsers}
      initialModules={initialModules}
      initialStats={initialStats}
    />
  );
}
