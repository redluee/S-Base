import { notFoundOn404, serverApi } from "@/lib/server-api";

import { WorkoutHistoryDetail } from "@/app/workouts/(main)/history/workout-history-detail";
import { Suspense } from "react";

export default async function HistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await notFoundOn404(serverApi.workouts.sessions.get(Number(id)));

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <Suspense fallback={<div className="animate-pulse h-48 bg-card rounded-xl" />}>
          <WorkoutHistoryDetail session={session} />
        </Suspense>
      </div>
  );
}
