import { serverApi } from "@/lib/server-api";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NavHeader } from "@/components/nav-header";
import { t } from "@/lib/lang";
import { Calendar } from "lucide-react";

export default async function WorkoutHistoryPage() {
  let user: { id: number; username: string } | null = null;
  try {
    user = (await serverApi.me()).user;
  } catch {}
  if (!user) redirect("/");

  const sessions = await serverApi.workouts.sessions.list("completed");

  return (
    <div className="min-h-screen flex flex-col">
      <NavHeader username={user.username} />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl sm:text-3xl text-foreground flex items-center gap-2">
            <Calendar className="size-6 sm:size-7 text-brand" />
            <span className="hidden sm:inline">{t("History")}</span>
          </h1>
          <Link href="/workouts">
            <Button variant="outline" size="sm" className="text-xs sm:text-sm">
              {t("Back to overview")}
            </Button>
          </Link>
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

        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center">
            <p className="text-sm text-muted-foreground">{t("No completed sessions yet.")}</p>
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
                    <div>
                      <span className="text-sm text-foreground">
                        {new Date(session.startedAt.includes("T") ? session.startedAt : session.startedAt.replace(" ", "T") + "Z").toLocaleDateString("nl-NL", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      {session.completedAt && (
                        <span className="text-xs text-muted-foreground ml-2">
                          {Math.round(
                            (new Date(session.completedAt.includes("T") ? session.completedAt : session.completedAt.replace(" ", "T") + "Z").getTime() - new Date(session.startedAt.includes("T") ? session.startedAt : session.startedAt.replace(" ", "T") + "Z").getTime()) / 60000
                          )}{" "}
                          min
                        </span>
                      )}
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
