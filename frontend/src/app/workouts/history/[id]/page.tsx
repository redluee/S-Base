import { serverApi } from "@/lib/server-api";
import { redirect, notFound } from "next/navigation";
import { NavHeader } from "@/components/nav-header";
import { WorkoutHistoryDetail } from "@/components/workout-history-detail";
import { Suspense } from "react";

export default async function HistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let user: { id: number; username: string } | null = null;
  try {
    user = (await serverApi.me()).user;
  } catch {}
  if (!user) redirect("/");

  const { id } = await params;
  const session = await serverApi.workouts.sessions.get(Number(id));
  if (!session) notFound();

  return (
    <div className="min-h-screen flex flex-col">
      <NavHeader username={user.username} />
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <Suspense fallback={<div className="animate-pulse h-48 bg-card rounded-xl" />}>
          <WorkoutHistoryDetail session={session} />
        </Suspense>
      </main>
    </div>
  );
}
