import Link from "next/link";
import { cn } from "@/lib/utils";
import { t } from "@/lib/lang";
import type { WorkoutStatsSummary } from "@backend/types/workout";
import { formatNumberNl } from "@/app/workouts/number-input";
import { WorkoutIcon } from "@/app/workouts/templates/workout-icon";
import { sessionIcon } from "@/app/workouts/templates/template-meta";

export function daysAgoLabel(daysAgo: number | null): string {
  if (daysAgo === null) return "";
  if (daysAgo <= 0) return t("Today");
  if (daysAgo === 1) return t("Yesterday");
  return t("{count} days ago", { count: String(daysAgo) });
}

export function LastWorkoutCard({ stats, className }: { stats: WorkoutStatsSummary; className?: string }) {
  const last = stats.lastWorkout;

  return (
    <section aria-labelledby="last-workout-heading" className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="last-workout-heading" className="text-xl font-semibold text-foreground">
          {t("Last workout")}
        </h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          {t("{count} workouts", { count: String(stats.totalWorkouts) })}
        </span>
      </div>
      {last ? (
        <Link
          href={`/workouts/history/${last.sessionId}`}
          className="flex items-center gap-4 rounded-[1.75rem] bg-card px-4 py-4 min-h-[5.5rem] transition-colors hover:bg-white/[0.09] outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <WorkoutIcon icon={sessionIcon(last)} className="size-11" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-foreground">{last.name || t("Workout Session")}</span>
            <span className="block truncate text-sm text-muted-foreground">{daysAgoLabel(stats.daysAgo)}</span>
          </span>
          <span className="shrink-0 text-right">
            <span className="block text-2xl font-medium text-brand tabular-nums leading-tight">
              {formatNumberNl(last.volume)}
              <span className="ml-1 text-xs font-semibold text-muted-foreground">KG</span>
            </span>
            <span className="block text-xs text-muted-foreground whitespace-nowrap">{t("Total volume")}</span>
          </span>
        </Link>
      ) : (
        <div className="rounded-[1.75rem] bg-card px-5 py-6 text-sm text-muted-foreground">
          {t("No workouts yet. Start your first one.")}
        </div>
      )}
    </section>
  );
}
