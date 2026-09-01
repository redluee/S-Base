import { serverApi } from "@/lib/server-api";
import { MinorPeerHelpClient } from "./client";

export default async function MinorPeerHelpPage() {
  const initialPeerHelp = await serverApi.minor.peerHelp.list().catch(() => []);
  const initialSprints = await serverApi.minor.sprints.list().catch(() => []);

  return <MinorPeerHelpClient initialPeerHelp={initialPeerHelp} initialSprints={initialSprints} />;
}
