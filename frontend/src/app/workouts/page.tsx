/* eslint-disable @typescript-eslint/no-explicit-any */
import { serverApi, getCurrentUser } from "@/lib/server-api";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NavHeader } from "@/components/nav-header";
import { MotivationalQuote } from "@/components/motivational-quote";
import { WorkoutSubnav } from "@/components/workout-subnav";
import { RunningWorkoutCard } from "@/components/running-workout-card";
import { WorkoutImportModal } from "@/components/workout-import-modal";
import { t } from "@/lib/lang";

function getMilestoneStats(totalWorkouts: number) {
  const milestones = [0, 5, 10, 20, 50];
  let prevMilestone = 0;
  let nextMilestone = 5;

  if (totalWorkouts < 50) {
    for (let i = 0; i < milestones.length - 1; i++) {
      if (totalWorkouts >= milestones[i] && totalWorkouts < milestones[i + 1]) {
        prevMilestone = milestones[i];
        nextMilestone = milestones[i + 1];
        break;
      }
    }
  } else {
    prevMilestone = Math.floor(totalWorkouts / 50) * 50;
    nextMilestone = prevMilestone + 50;
  }

  const remaining = nextMilestone - totalWorkouts;
  const percentage = Math.min(100, Math.max(0, (totalWorkouts / nextMilestone) * 100));

  return { nextMilestone, prevMilestone, remaining, percentage };
}

export default async function WorkoutsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (!user.modules?.includes("workout")) redirect("/dashboard");

  const [templates, stats, activeSessions] = await Promise.all([
    serverApi.workouts.templates.list(),
    serverApi.workouts.stats(),
    serverApi.workouts.sessions.list("active")
  ]);

  const runningSession = activeSessions?.[0] ?? null;

  return (
    <div className="min-h-screen flex flex-col">
      <NavHeader username={user.username} />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="font-display text-2xl sm:text-3xl text-foreground">
            {t("Workout Studio")}
          </h1>
          <WorkoutSubnav current="workouts" />
        </div>

        {/* Running Workout Banner */}
        {runningSession && (
          <div className="mb-6">
            <RunningWorkoutCard session={runningSession} />
          </div>
        )}

        {/* Stats Dashboard */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8">
          <div className="rounded-xl bg-card p-2.5 sm:p-6 ring-1 ring-foreground/10 flex flex-col items-center justify-center text-center min-h-[90px] sm:min-h-[130px]">
            {stats.daysAgo === null ? (
              <>
                <span className="text-xl sm:text-4xl md:text-5xl font-black text-foreground font-display">Geen</span>
                <span className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-1 sm:mt-1.5 font-medium leading-tight">{t("trainingen voltooid")}</span>
              </>
            ) : stats.daysAgo === 0 ? (
              <>
                <span className="text-xl sm:text-4xl md:text-5xl font-black text-foreground font-display">Vandaag</span>
                <span className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-1 sm:mt-1.5 font-medium leading-tight">{t("was je laatste training")}</span>
              </>
            ) : stats.daysAgo === 1 ? (
              <>
                <span className="text-xl sm:text-4xl md:text-5xl font-black text-foreground font-display">1 dag</span>
                <span className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-1 sm:mt-1.5 font-medium leading-tight">{t("geleden was je laatste training")}</span>
              </>
            ) : (
              <>
                <span className="text-xl sm:text-4xl md:text-5xl font-black text-foreground font-display">{stats.daysAgo} d</span>
                <span className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-1 sm:mt-1.5 font-medium leading-tight">{t("geleden was je laatste training")}</span>
              </>
            )}
          </div>
          <div className="rounded-xl bg-card p-2.5 sm:p-5 ring-1 ring-foreground/10 flex flex-col justify-center min-h-[90px] sm:min-h-[130px]">
            {(() => {
              const { nextMilestone, remaining, percentage } = getMilestoneStats(stats.totalWorkouts);

              return (
                <div className="flex flex-col w-full text-center items-center justify-center">
                  <div className="flex items-baseline justify-center gap-0.5 sm:gap-1">
                    <span className="text-xl sm:text-4xl font-black text-brand font-display">{stats.totalWorkouts}</span>
                    <span className="text-zinc-500 text-xs sm:text-sm font-semibold font-display">/ {nextMilestone}</span>
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 font-medium leading-tight">
                    {remaining} {t("tot volgende mijlpaal")}
                  </span>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-zinc-800/80 h-1.5 sm:h-2 rounded-full mt-1.5 sm:mt-3 overflow-hidden border border-white/5">
                    <div 
                      className="bg-brand h-full rounded-full transition-all duration-500" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })()}
          </div>
          <div className="rounded-xl bg-card p-2.5 sm:p-6 ring-1 ring-foreground/10 flex flex-col items-center justify-center text-center min-h-[90px] sm:min-h-[130px]">
            <span className="text-lg sm:text-4xl md:text-5xl font-black text-amber-400 font-display truncate max-w-full">{stats.totalVolume.toLocaleString()} kg</span>
            <span className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-1 sm:mt-1.5 font-medium leading-tight">{t("volume verplaatst")}</span>
          </div>
        </div>

        <div className="flex justify-center mb-8">
          <MotivationalQuote />
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/workouts/session/quick"
            className="block rounded-xl bg-brand/10 ring-1 ring-brand/30 hover:ring-brand/50 transition-all duration-200 active:scale-[0.99]"
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

          <div className="flex items-center justify-between mt-3 mb-1">
            <h2 className="text-sm font-medium text-muted-foreground">{t("Templates")}</h2>
            <div className="flex items-center gap-2">
              <WorkoutImportModal />
              <Link href="/workouts/new">
                <Button size="sm" className="bg-brand text-zinc-900 hover:bg-brand-hover active:scale-[0.97] transition-all font-medium">
                  <svg className="size-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  {t("New Template")}
                </Button>
              </Link>
            </div>
          </div>

          {templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl bg-card border border-white/5 p-6">
              <p className="text-sm text-muted-foreground mb-4">{t("No templates yet.")}</p>
              <Link href="/workouts/new">
                <Button className="bg-brand text-zinc-900 hover:bg-brand-hover text-sm">
                  {t("Create your first template")}
                </Button>
              </Link>
            </div>
          ) : (
            templates.map((template: any) => (
              <Link
                key={template.templateId}
                href={`/workouts/t/${template.templateId}`}
                className="block rounded-xl bg-card ring-1 ring-foreground/10 hover:ring-brand/30 transition-all duration-200 active:scale-[0.99]"
              >
                <div className="px-4 sm:px-5 py-3 sm:py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="font-medium text-foreground text-sm sm:text-base truncate">
                        {template.name}
                      </h2>
                      {template.description && (
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-1">
                          {template.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2 text-[10px] sm:text-xs">
                        {template.exerciseCount !== undefined && (
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground font-medium">
                            🏋️‍♂️ {template.exerciseCount} {template.exerciseCount === 1 ? t("exercise") : t("exercises")}
                          </span>
                        )}
                        {template.targetMuscleGroups && (
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground font-medium">
                            💪 {template.targetMuscleGroups}
                          </span>
                        )}
                        {template.estimatedTime && (
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground font-medium">
                            ⏱️ {template.estimatedTime} {t("min")}
                          </span>
                        )}
                      </div>
                    </div>
                    <svg className="size-4 sm:size-5 text-muted-foreground shrink-0 self-end" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
