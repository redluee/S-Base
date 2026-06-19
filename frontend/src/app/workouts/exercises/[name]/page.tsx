import { serverApi } from "@/lib/server-api";
import { redirect } from "next/navigation";
import { NavHeader } from "@/components/nav-header";
import { ExerciseProgress } from "@/components/exercise-progress";

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  let user: { id: number; username: string } | null = null;
  try {
    user = (await serverApi.me()).user;
  } catch {}
  if (!user) redirect("/");

  const { name } = await params;
  const decoded = decodeURIComponent(name);
  const data = await serverApi.workouts.exercises.progress(decoded);

  return (
    <div className="min-h-screen flex flex-col">
      <NavHeader username={user.username} />
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <ExerciseProgress data={data} />
      </main>
    </div>
  );
}
