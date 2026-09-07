import { serverApi } from "@/lib/server-api";
import { notFound } from "next/navigation";
import { SprintPresentClient } from "./client";

export default async function MinorSprintPresentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sprintId = Number(id);
  if (isNaN(sprintId)) notFound();

  const [sprint, storyTypes] = await Promise.all([
    serverApi.minor.sprints.get(sprintId).catch(() => null),
    serverApi.minor.storyTypes.list().catch(() => []),
  ]);
  if (!sprint) notFound();

  return <SprintPresentClient initialSprint={sprint} initialStoryTypes={storyTypes} />;
}
