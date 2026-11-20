import Link from "next/link";
import { Plus, Play, Zap } from "lucide-react";
import { serverApi } from "@/lib/server-api";
import { t } from "@/lib/lang";
import { WorkoutSubnav } from "@/app/workouts/workout-subnav";
import { RunningWorkoutCard } from "@/app/workouts/running-workout-card";
import { WorkoutImportModal } from "@/app/workouts/templates/workout-import-modal";
import { WorkoutTemplateList } from "@/app/workouts/templates/workout-template-list";
import { TemplateShortcuts } from "@/app/workouts/templates/template-shortcuts";
import { LastWorkoutCard } from "@/app/workouts/last-workout-card";

export default async function WorkoutsPage() {
  const [templates, stats, activeSessions] = await Promise.all([
    serverApi.workouts.templates.list(),
    serverApi.workouts.stats(),
    serverApi.workouts.sessions.list("active"),
  ]);

  const runningSessions = activeSessions ?? [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
        <h1 className="font-display text-3xl text-foreground">{t("Workouts")}</h1>
        <WorkoutSubnav current="workouts" />
      </div>

      {runningSessions.length > 0 && (
        <div className="flex flex-col gap-3">
          {runningSessions.length > 1 && (
            <p className="text-sm text-muted-foreground">
              {t("You have {count} running workouts. Finish or cancel the ones you no longer need.", {
                count: String(runningSessions.length),
              })}
            </p>
          )}
          {runningSessions.map((session) => (
            <RunningWorkoutCard key={session.sessionId} session={session} />
          ))}
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2 md:gap-x-6 md:items-end">
        <Link
          href="/workouts/session/quick"
          className="order-1 group flex items-center justify-between gap-4 rounded-full bg-card pl-7 pr-3 py-3 min-h-[6.5rem] ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.09] outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="flex items-center gap-3">
            <Zap className="size-6 shrink-0 text-brand fill-brand/20" aria-hidden="true" />
            <span className="text-xl font-medium text-foreground">{t("Quick start")}</span>
          </span>
          <span className="size-20 shrink-0 rounded-full bg-brand text-zinc-950 inline-flex items-center justify-center shadow-[0_0_2.5rem_color-mix(in_oklab,var(--color-brand)_40%,transparent)] transition-transform duration-200 ease-out group-hover:scale-105 group-active:scale-95">
            <Play className="size-7 fill-current translate-x-0.5" aria-hidden="true" />
          </span>
        </Link>

        <LastWorkoutCard stats={stats} className="order-3 md:order-2" />
        <TemplateShortcuts templates={templates} className="order-2 md:order-3 md:col-span-2" />
      </div>

      <WorkoutTemplateList
        templates={templates}
        actions={
          <>
            <WorkoutImportModal />
            <Link
              href="/workouts/new"
              aria-label={t("New Template")}
              title={t("New Template")}
              className="size-12 inline-flex items-center justify-center rounded-full bg-white/[0.06] text-brand hover:bg-white/10 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Plus className="size-5" />
            </Link>
          </>
        }
      />
    </div>
  );
}
