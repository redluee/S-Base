import { serverApi } from "@/lib/server-api";
import { MinorExportClient } from "./client";

export default async function MinorExportPage() {
  const initialSprints = await serverApi.minor.sprints.list().catch(() => []);

  return <MinorExportClient initialSprints={initialSprints} />;
}
