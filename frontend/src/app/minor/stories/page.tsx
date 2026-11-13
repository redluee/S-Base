import { serverApi } from "@/lib/server-api";
import { MinorStoriesClient } from "./client";

export default async function MinorStoriesPage() {
  const [initialStories, sprints, storyTypes] = await Promise.all([
    serverApi.minor.stories.list(),
    serverApi.minor.sprints.list(),
    serverApi.minor.storyTypes.list(),
  ]);

  return <MinorStoriesClient initialStories={initialStories} sprints={sprints} storyTypes={storyTypes} />;
}
