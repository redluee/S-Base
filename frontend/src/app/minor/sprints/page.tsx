import { serverApi } from "@/lib/server-api";
import { MinorSprintsClient } from "./client";

export default async function MinorSprintsPage() {
  const initialSprints = await serverApi.minor.sprints.list();

  return <MinorSprintsClient initialSprints={initialSprints} />;
}
