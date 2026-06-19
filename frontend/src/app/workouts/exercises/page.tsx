import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NavHeader } from "@/components/nav-header";
import { t } from "@/lib/lang";
import { serverApi } from "@/lib/server-api";
import { Dumbbell } from "lucide-react";

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  let user: { id: number; username: string } | null = null;
  try {
    user = (await serverApi.me()).user;
  } catch {}
  if (!user) redirect("/");

  const { q } = await searchParams;
  let exercises = await serverApi.workouts.exercises.list();

  if (q) {
    const qLower = q.toLowerCase();
    exercises = exercises.filter(
      (ex) =>
        ex.name.toLowerCase().includes(qLower) ||
        (ex.equipment && t(ex.equipment).toLowerCase().includes(qLower))
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <NavHeader username={user.username} />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl sm:text-3xl text-foreground flex items-center gap-2">
            <Dumbbell className="size-6 sm:size-7 text-brand" />
            <span className="hidden sm:inline">{t("Exercises")}</span>
          </h1>
          <Link href="/workouts">
            <Button variant="outline" size="sm" className="text-xs sm:text-sm cursor-pointer">
              {t("Back to overview")}
            </Button>
          </Link>
        </div>

        {exercises.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center bg-card rounded-xl ring-1 ring-foreground/10">
            <p className="text-sm text-muted-foreground">
              {q ? `${t("Clear search")} ("${q}")` : t("No data yet for this exercise.")}
            </p>
            {q && (
              <Link href="/workouts/exercises" className="mt-4">
                <Button size="sm" variant="outline" className="cursor-pointer">
                  {t("Clear")}
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {exercises.map((ex) => {
              const displayName = ex.equipment ? `${ex.name} (${t(ex.equipment)})` : ex.name;
              return (
                <Link
                  key={`${ex.name}-${ex.equipment}`}
                  href={`/workouts/exercises/${encodeURIComponent(ex.name)}${
                    ex.equipment ? `?equipment=${encodeURIComponent(ex.equipment)}` : ""
                  }`}
                  className="block rounded-xl bg-card ring-1 ring-foreground/10 hover:ring-brand/35 transition-all duration-200 active:scale-[0.99] hover:-translate-y-[1px]"
                >
                  <div className="px-4 sm:px-5 py-3 sm:py-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm sm:text-base font-medium text-foreground">{displayName}</span>
                      <svg className="size-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
