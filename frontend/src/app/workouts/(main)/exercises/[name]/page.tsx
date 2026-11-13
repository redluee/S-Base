import { serverApi } from "@/lib/server-api";

import { ExerciseProgress } from "@/app/workouts/(main)/exercises/exercise-progress";
import { safeDecodeURIComponent } from "@/lib/uri";

export default async function ExerciseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ equipment?: string }>;
}) {
  const { name } = await params;
  const { equipment } = await searchParams;
  const decoded = safeDecodeURIComponent(name);
  const data = await serverApi.workouts.exercises.progress(decoded, equipment);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <ExerciseProgress data={data} />
      </div>
  );
}
