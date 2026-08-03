/* eslint-disable @typescript-eslint/no-explicit-any */
import { serverApi } from "@/lib/server-api";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NavHeader } from "@/components/nav-header";
import { WorkoutSubnav } from "@/components/workout-subnav";
import { t } from "@/lib/lang";
import { Calendar } from "lucide-react";
import { parseDateString } from "@/lib/utils";

export default async function WorkoutHistoryPage({
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
  const sessions = await serverApi.workouts.sessions.list("completed", q);

  return (
    <div className="min-h-screen flex flex-col">
      <NavHeader username={user.username} />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="font-display text-2xl sm:text-3xl text-foreground flex items-center gap-2">
            <Calendar className="size-6 sm:size-7 text-brand" />
            <span>{t("History")}</span>
          </h1>
          <WorkoutSubnav current="history" />
        </div>

        <Link
          href="/workouts/session/quick"
          className="block rounded-xl bg-brand/10 ring-1 ring-brand/30 hover:ring-brand/50 transition-all duration-200 active:scale-[0.99] mb-6"
        >
          <div className="px-4 sm:px-5 py-3 sm:py-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-brand/20 flex items-center justify-center">
                <svg className="size-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <div>
                <h2 className="font-medium text-brand text-sm sm:text-base">{t("Quick start")}</h2>
                <p className="text-xs text-muted-foreground">{t("Start blank workout")}</p>
              </div>
            </div>
          </div>
        </Link>

        {q && (
          <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
            <span>
              {t('Search results for "{q}"', { q })}
            </span>
            <Link
              href="/workouts/history"
              className="text-xs text-brand hover:text-brand-hover underline"
            >
              {t("Clear")}
            </Link>
          </div>
        )}

        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center bg-card rounded-xl ring-1 ring-foreground/10 p-6">
            <p className="text-sm text-muted-foreground mb-4">
              {q ? t('No sessions found for "{q}".', { q }) : t("No completed sessions yet.")}
            </p>
            {q && (
              <Link href="/workouts/history">
                <Button size="sm" variant="outline" className="cursor-pointer">
                  {t("Clear search")}
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sessions.map((session: any) => (
              <Link
                key={session.sessionId}
                href={`/workouts/history/${session.sessionId}`}
                className="block rounded-xl bg-card ring-1 ring-foreground/10 hover:ring-brand/30 transition-all duration-200 active:scale-[0.99]"
              >
                <div className="px-4 sm:px-5 py-3 sm:py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {session.name}
                        </span>
                        {session.exerciseCount !== undefined && (
                          <span className="text-xs text-muted-foreground font-medium">
                            • {session.exerciseCount} {session.exerciseCount === 1 ? t("exercise") : t("exercises")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>
                          {parseDateString(session.startedAt).toLocaleDateString("nl-NL", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        {session.completedAt && (
                          <>
                            <span>•</span>
                            <span>
                              {Math.round(
                                (parseDateString(session.completedAt).getTime() - parseDateString(session.startedAt).getTime()) / 60000
                              )}{" "}
                              min
                            </span>
                          </>
                        )}
                      </div>
                    </div>
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
