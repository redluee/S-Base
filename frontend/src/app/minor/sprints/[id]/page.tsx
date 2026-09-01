import { serverApi } from "@/lib/server-api";
import { notFound } from "next/navigation";
import { MinorSprintDetailClient } from "./client";

export default async function MinorSprintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sprintId = Number(id);
  if (isNaN(sprintId)) notFound();

  const sprint = await serverApi.minor.sprints.get(sprintId).catch(() => null);
  if (!sprint) notFound();

  const storyTypes = await serverApi.me().then(() => []).catch(() => []);

  return <MinorSprintDetailClient initialSprint={sprint} initialStoryTypes={storyTypes} />;
}
