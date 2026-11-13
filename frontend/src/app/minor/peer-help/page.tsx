import { serverApi } from "@/lib/server-api";
import { MinorPeerHelpClient } from "./client";

export default async function MinorPeerHelpPage() {
  const initialPeerHelp = await serverApi.minor.peerHelp.list();
  const initialSprints = await serverApi.minor.sprints.list();

  return <MinorPeerHelpClient initialPeerHelp={initialPeerHelp} initialSprints={initialSprints} />;
}
