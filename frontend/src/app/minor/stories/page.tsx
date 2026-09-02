import { serverApi } from "@/lib/server-api";
import { MinorStoriesClient } from "./client";

export default async function MinorStoriesPage() {
  const [initialStories, sprints] = await Promise.all([
    serverApi.minor.stories.list().catch(() => []),
    serverApi.minor.sprints.list().catch(() => []),
  ]);

  return <MinorStoriesClient initialStories={initialStories} sprints={sprints} />;
}
