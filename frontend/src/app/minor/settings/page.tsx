import { serverApi } from "@/lib/server-api";
import { MinorSettingsClient } from "./client";

export default async function MinorSettingsPage() {
  const [initialVacations, initialStoryTypes, initialSettings] = await Promise.all([
    serverApi.minor.vacations.list(),
    serverApi.minor.storyTypes.list(),
    serverApi.minor.settings.get(),
  ]);

  return (
    <MinorSettingsClient
      initialVacations={initialVacations}
      initialStoryTypes={initialStoryTypes}
      initialSettings={initialSettings}
    />
  );
}
