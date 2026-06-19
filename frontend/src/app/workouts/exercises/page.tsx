import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NavHeader } from "@/components/nav-header";
import { t } from "@/lib/lang";
import { serverApi } from "@/lib/server-api";

export default async function ExercisesPage() {
  let user: { id: number; username: string } | null = null;
  try {
    user = (await serverApi.me()).user;
  } catch {}
  if (!user) redirect("/");

  const exercises = await serverApi.workouts.exercises.list();

  return (
    <div className="min-h-screen flex flex-col">
      <NavHeader username={user.username} />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl sm:text-3xl text-foreground">
            {t("Exercises")}
          </h1>
          <Link href="/workouts">
            <Button variant="outline" size="sm" className="text-xs sm:text-sm">
              {t("Back to overview")}
            </Button>
          </Link>
        </div>

        {exercises.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center">
            <p className="text-sm text-muted-foreground">{t("No data yet for this exercise.")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {exercises.map((name) => (
              <Link
                key={name}
                href={`/workouts/exercises/${encodeURIComponent(name)}`}
                className="block rounded-xl bg-card ring-1 ring-foreground/10 hover:ring-brand/30 transition-all duration-200 active:scale-[0.99]"
              >
                <div className="px-4 sm:px-5 py-3 sm:py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm sm:text-base font-medium text-foreground">{name}</span>
                    <svg className="size-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
