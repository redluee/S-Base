import { redirect } from "next/navigation";
import { NavHeader } from "@/components/nav-header";
import { WorkoutSubnav } from "@/components/workout-subnav";
import { ExerciseList } from "@/components/exercise-list";
import { t } from "@/lib/lang";
import { serverApi } from "@/lib/server-api";
import { Dumbbell } from "lucide-react";

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; equipment?: string }>;
}) {
  let user: { id: number; username: string } | null = null;
  try {
    user = (await serverApi.me()).user;
  } catch {}
  if (!user) redirect("/");

  const { q, category, equipment } = await searchParams;
  const exercises = await serverApi.workouts.exercises.list();

  return (
    <div className="min-h-screen flex flex-col">
      <NavHeader username={user.username} />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="font-display text-2xl sm:text-3xl text-foreground flex items-center gap-2">
            <Dumbbell className="size-6 sm:size-7 text-brand" />
            <span>{t("Exercises")}</span>
          </h1>
          <WorkoutSubnav current="exercises" />
        </div>

        <ExerciseList
          exercises={exercises}
          initialQuery={q}
          initialCategory={category}
          initialEquipment={equipment}
        />
      </main>
    </div>
  );
}
