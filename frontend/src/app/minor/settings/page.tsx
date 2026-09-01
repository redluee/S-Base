import { serverApi } from "@/lib/server-api";
import { MinorSettingsClient } from "./client";

export default async function MinorSettingsPage() {
  const initialVacations = await serverApi.minor.vacations.list().catch(() => []);
  const initialStoryTypes = await serverApi.me().then(() => []).catch(() => []);

  return <MinorSettingsClient initialVacations={initialVacations} initialStoryTypes={initialStoryTypes} />;
}
