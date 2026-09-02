import { serverApi } from "@/lib/server-api";
import { MinorSettingsClient } from "./client";

export default async function MinorSettingsPage() {
  const [initialVacations, initialStoryTypes] = await Promise.all([
    serverApi.minor.vacations.list().catch(() => []),
    serverApi.minor.storyTypes.list().catch(() => []),
  ]);

  return <MinorSettingsClient initialVacations={initialVacations} initialStoryTypes={initialStoryTypes} />;
}
