"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, BadgeCheck, Dumbbell, GitMerge, History, Hourglass, Repeat2, Timer } from "lucide-react";
import { t } from "@/lib/lang";
import { cn } from "@/lib/utils";
import { parseDateString } from "@backend/shared/dates";
import { formatNumberNl } from "@/app/workouts/number-input";
import { ExerciseMergeModal } from "@/app/workouts/(main)/exercises/exercise-merge-modal";
import { ProgressChart } from "@/app/workouts/(main)/exercises/progress-chart";
import {
  filterByRange,
  progressSummary,
  statModeFor,
  topValue,
  type ProgressRange,
  type StatMode,
} from "@/app/workouts/(main)/exercises/progress-stats";
import type { ExerciseProgressData } from "@backend/types/workout";

const RECENT_LIMIT = 5;
const pill =
  "shrink-0 min-h-11 px-4 rounded-full text-sm font-medium transition-colors cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
const pillActive = "bg-brand text-zinc-950";
const pillIdle = "bg-white/[0.06] text-muted-foreground hover:text-foreground";

function formatSeconds(totalSec: number) {
  const min = Math.floor(totalSec / 60);
  const sec = Math.round(totalSec % 60);
  if (min === 0) return `${sec}s`;
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
}

function formatValue(value: number, mode: StatMode): { value: string; unit: string } {
  if (mode === "weight") return { value: formatNumberNl(value), unit: "kg" };
  if (mode === "reps") return { value: String(value), unit: t("reps") };
  return { value: formatSeconds(value), unit: "" };
}

function shortDate(iso: string) {
  return parseDateString(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

function longDate(iso: string) {
  const label = parseDateString(iso).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "short" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function StatCard({
  label,
  icon: Icon,
  value,
  unit,
  hint,
  hintBrand,
}: {
  label: string;
  icon: typeof Dumbbell;
  value: string;
  unit?: string;
  hint?: string;
  hintBrand?: boolean;
}) {
  return (
    <div className="rounded-[1.75rem] bg-card p-4 sm:p-5 flex flex-col gap-3 min-h-[8.5rem]">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground leading-snug">
          {label}
        </span>
        <Icon className="size-5 shrink-0 text-brand" aria-hidden="true" />
      </div>
      <div className="mt-auto">
        <p className="text-2xl font-medium text-foreground tabular-nums">
          {value}
          {unit && <span className="ml-1 text-sm text-muted-foreground">{unit}</span>}
        </p>
        {hint && <p className={cn("text-xs mt-1", hintBrand ? "text-brand" : "text-muted-foreground")}>{hint}</p>}
      </div>
    </div>
  );
}

export function ExerciseProgress({ data }: { data: ExerciseProgressData }) {
  const { exerciseName, sessions } = data;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedEquipment, setSelectedEquipment] = useState<string>(searchParams.get("equipment") || "all");
  const [range, setRange] = useState<ProgressRange>("all");
  const [showAll, setShowAll] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [now] = useState(() => new Date());

  const availableEquipments = Array.from(
    new Set([
      ...(data.availableEquipments || []),
      ...sessions.map((s) => s.equipment).filter((eq): eq is string => Boolean(eq && eq !== "none")),
    ])
  ).sort();
  const hasNoneEquipment = sessions.some((s) => !s.equipment || s.equipment === "none");
  const equipmentTabs = [
    "all",
    ...availableEquipments,
    ...(hasNoneEquipment && availableEquipments.length > 0 ? ["none"] : []),
  ];

  function handleSelectEquipment(eqKey: string) {
    setSelectedEquipment(eqKey);
    const params = new URLSearchParams(searchParams.toString());
    if (eqKey === "all") params.delete("equipment");
    else params.set("equipment", eqKey);
    const query = params.toString();
    router.replace(`/workouts/exercises/${encodeURIComponent(exerciseName)}${query ? `?${query}` : ""}`, {
      scroll: false,
    });
  }

  const equipmentSessions = sessions.filter((session) => {
    if (selectedEquipment === "all") return true;
    if (selectedEquipment === "none") return !session.equipment || session.equipment === "none";
    return session.equipment === selectedEquipment;
  });
  const rangedSessions = filterByRange(equipmentSessions, range, now);
  const mode = statModeFor(equipmentSessions.flatMap((s) => s.sets));
  const summary = progressSummary(rangedSessions, mode);
  const headline = formatValue(summary.latest, mode);
  const delta = formatValue(Math.abs(summary.delta), mode);
  const recent = [...rangedSessions].reverse();
  const visibleRecent = showAll ? recent : recent.slice(0, RECENT_LIMIT);

  const topLabel = mode === "weight" ? t("Top set") : mode === "reps" ? t("Max reps") : t("Max duration");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/workouts/exercises"
          className="inline-flex items-center gap-1.5 min-h-11 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="size-4 transition-transform duration-150 ease-out group-hover:-translate-x-0.5" />
          {t("Exercises")}
        </Link>
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-display text-3xl text-foreground break-words min-w-0">{exerciseName}</h1>
          <button
            type="button"
            onClick={() => setIsMergeModalOpen(true)}
            aria-label={t("Merge")}
            title={t("Merge")}
            className="size-11 shrink-0 inline-flex items-center justify-center rounded-full bg-white/[0.06] text-brand hover:bg-white/10 transition-colors cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <GitMerge className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2" role="group" aria-label={t("Period")}>
          {(["1M", "1Y", "all"] as const).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => setRange(r)}
              className={cn(pill, range === r ? pillActive : pillIdle)}
            >
              {r === "all" ? t("All time") : t(`range.${r}`)}
            </button>
          ))}
        </div>
        {equipmentTabs.length > 2 && (
          <div
            className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto [scrollbar-width:none]"
            role="group"
            aria-label={t("Equipment")}
          >
            {equipmentTabs.map((eq) => (
              <button
                key={eq}
                type="button"
                aria-pressed={selectedEquipment === eq}
                onClick={() => handleSelectEquipment(eq)}
                className={cn(pill, "text-xs", selectedEquipment === eq ? "bg-white/15 text-foreground" : pillIdle)}
              >
                {eq === "all" ? t("All") : t(eq)}
              </button>
            ))}
          </div>
        )}
      </div>

      {rangedSessions.length === 0 ? (
        <div className="rounded-[2rem] bg-card py-16 text-center text-sm text-muted-foreground">
          {t("No data yet for this exercise.")}
        </div>
      ) : (
        <>
          <div className="rounded-[2rem] bg-card ring-1 ring-white/[0.06] p-5 pb-6">
            <div className="flex items-center gap-4 mb-4">
              <p className="text-4xl font-medium text-foreground tabular-nums">
                {headline.value}
                {headline.unit && <span className="ml-1.5 text-base text-muted-foreground">{headline.unit}</span>}
              </p>
              {summary.delta !== 0 && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-sm font-medium tabular-nums",
                    summary.delta > 0 ? "text-brand" : "text-muted-foreground"
                  )}
                >
                  {summary.delta > 0 ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}
                  {summary.delta > 0 ? "+" : "−"}
                  {delta.value}
                  {delta.unit && ` ${delta.unit}`}
                </span>
              )}
            </div>
            <ProgressChart
              values={summary.values}
              labels={rangedSessions.map((s, i) => {
                const v = formatValue(summary.values[i], mode);
                return `${shortDate(s.startedAt)}: ${v.value} ${v.unit}`;
              })}
            />
            <div className="mt-2 flex justify-between text-[11px] text-muted-foreground tabular-nums">
              <span>{shortDate(rangedSessions[0].startedAt)}</span>
              {rangedSessions.length > 1 && <span>{shortDate(rangedSessions.at(-1)!.startedAt)}</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {mode === "weight" ? (
              <>
                <StatCard
                  label={t("Max session vol.")}
                  icon={Dumbbell}
                  value={summary.peak ? formatNumberNl(summary.peak.value) : "-"}
                  unit="kg"
                  hint={summary.peak ? t("{date} peak", { date: shortDate(summary.peak.startedAt) }) : undefined}
                  hintBrand
                />
                <StatCard label={t("Completed reps")} icon={Repeat2} value={String(summary.completedReps)} unit={t("reps")} />
                <StatCard
                  label={t("Working weight")}
                  icon={Hourglass}
                  value={summary.workingWeight != null ? formatNumberNl(Math.round(summary.workingWeight * 10) / 10) : "-"}
                  unit="kg"
                  hint={
                    summary.avgReps != null
                      ? t("Avg {reps} reps/set", { reps: formatNumberNl(Math.round(summary.avgReps * 10) / 10) })
                      : undefined
                  }
                />
                <StatCard label={t("Sessions")} icon={History} value={String(rangedSessions.length)} />
              </>
            ) : (
              <>
                <StatCard
                  label={mode === "reps" ? t("Total reps") : t("Total duration")}
                  icon={mode === "reps" ? Repeat2 : Timer}
                  value={mode === "reps" ? String(summary.completedReps) : formatSeconds(summary.totalDuration)}
                />
                <StatCard label={t("Sessions")} icon={History} value={String(rangedSessions.length)} />
              </>
            )}
          </div>

          <section aria-labelledby="recent-sessions-heading" className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 id="recent-sessions-heading" className="text-xl font-semibold text-foreground">
                {t("Recent sessions")}
              </h2>
              {recent.length > RECENT_LIMIT && (
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="min-h-11 px-2 text-sm text-brand hover:text-brand-hover transition-colors cursor-pointer"
                >
                  {showAll ? t("Show less") : t("All sessions ({count})", { count: String(recent.length) })}
                </button>
              )}
            </div>
            <ul className="flex flex-col gap-3">
              {visibleRecent.map((session, i) => {
                const top = formatValue(topValue(session, mode), mode);
                const meta = [
                  session.sessionName,
                  selectedEquipment === "all" && session.equipment && session.equipment !== "none"
                    ? t(session.equipment)
                    : null,
                  `${session.sets.length} ${t("sets")}`,
                ]
                  .filter(Boolean)
                  .join(" • ");
                const Icon = i === 0 ? BadgeCheck : History;
                return (
                  <li key={session.sessionId}>
                    <Link
                      href={`/workouts/history/${session.sessionId}`}
                      className="flex items-center gap-3 rounded-[1.75rem] bg-card px-4 py-3.5 min-h-[4.5rem] transition-colors hover:bg-white/[0.09] outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <span className="size-11 shrink-0 inline-flex items-center justify-center rounded-full bg-white/[0.06]">
                        <Icon className={cn("size-5", i === 0 ? "text-brand" : "text-muted-foreground")} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-foreground">{longDate(session.startedAt)}</span>
                        <span className="block truncate text-xs text-muted-foreground">{meta}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span
                          className={cn(
                            "block font-semibold tabular-nums",
                            i === 0 ? "text-brand" : "text-foreground"
                          )}
                        >
                          {top.value}
                          {top.unit && ` ${top.unit}`}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">{topLabel}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      <ExerciseMergeModal
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        sourceName={exerciseName}
        onSuccess={(targetName) => {
          router.push(`/workouts/exercises/${encodeURIComponent(targetName)}`);
          router.refresh();
        }}
      />
    </div>
  );
}
