import { serverApi } from "@/lib/server-api";
import { MinorSettingsClient } from "./client";

export default async function MinorSettingsPage() {
  const [initialVacations, initialStoryTypes, initialSettings] = await Promise.all([
    serverApi.minor.vacations.list().catch(() => []),
    serverApi.minor.storyTypes.list().catch(() => []),
    serverApi.minor.settings.get().catch(() => null),
  ]);

  return (
    <MinorSettingsClient
      initialVacations={initialVacations}
      initialStoryTypes={initialStoryTypes}
      initialSettings={initialSettings}
    />
  );
}
