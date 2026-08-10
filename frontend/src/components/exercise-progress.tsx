"use client";

import { useState } from "react";
import { t } from "@/lib/lang";
import Link from "next/link";
import { ArrowLeft, GitMerge } from "lucide-react";
import { parseDateString } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ExerciseMergeModal } from "@/components/exercise-merge-modal";

interface SetItem {
  setNumber: number;
  reps: number | null;
  weight: number | null;
  duration?: number | null;
  distance?: number | null;
  completed: number;
}

interface WorkoutSession {
  sessionId: number;
  startedAt: string;
  equipment?: string | null;
  sets: SetItem[];
}

interface ExerciseProgressData {
  exerciseName: string;
  category?: string;
  equipment?: string | null;
  availableEquipments?: string[];
  sessions: WorkoutSession[];
}

export function ExerciseProgress({ data }: { data: ExerciseProgressData }) {
  const { exerciseName, sessions } = data;
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialEquipment = searchParams.get("equipment") || "all";
  const [selectedEquipment, setSelectedEquipment] = useState<string>(initialEquipment);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);

  // Extract all unique equipment options present in availableEquipments or sessions
  const availableEquipments = Array.from(
    new Set([
      ...(data.availableEquipments || []),
      ...sessions.map((s) => s.equipment).filter((eq): eq is string => Boolean(eq && eq !== "none")),
    ])
  ).sort();

  const hasNoneEquipment = sessions.some((s) => !s.equipment || s.equipment === "none");
  const totalVariations = availableEquipments.length + (hasNoneEquipment ? 1 : 0);
  const showMaterialTabs = totalVariations > 1;

  function handleSelectEquipment(eqKey: string) {
    setSelectedEquipment(eqKey);
    const params = new URLSearchParams(searchParams.toString());
    if (eqKey === "all") {
      params.delete("equipment");
    } else {
      params.set("equipment", eqKey);
    }
    const queryString = params.toString();
    router.replace(`/workouts/exercises/${encodeURIComponent(exerciseName)}${queryString ? `?${queryString}` : ""}`, {
      scroll: false,
    });
  }

  // Filter sessions according to selected equipment tab
  const filteredSessions = sessions.filter((session) => {
    if (selectedEquipment === "all") return true;
    if (selectedEquipment === "none") return !session.equipment || session.equipment === "none";
    return session.equipment === selectedEquipment;
  });

  const allSets = filteredSessions.flatMap((s: WorkoutSession) => s.sets);
  const maxWeight = allSets.reduce((max: number, set: SetItem) => Math.max(max, set.weight ?? 0), 0);
  const totalVolume = allSets.reduce((sum: number, set: SetItem) => sum + (set.weight ?? 0) * (set.reps ?? 0), 0);
  const totalReps = allSets.reduce((sum: number, set: SetItem) => sum + (set.reps ?? 0), 0);
  const maxReps = allSets.reduce((max: number, set: SetItem) => Math.max(max, set.reps ?? 0), 0);
  const totalDuration = allSets.reduce((sum: number, set: SetItem) => sum + (set.duration ?? 0), 0);
  const maxDuration = allSets.reduce((max: number, set: SetItem) => Math.max(max, set.duration ?? 0), 0);

  // Determine stat mode: "weight", "reps", or "time"
  const statMode: "weight" | "reps" | "time" =
    maxWeight > 0 ? "weight" : maxReps > 0 ? "reps" : "time";

  const formatSeconds = (totalSec: number) => {
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    if (min === 0) return `${sec}s`;
    return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
  };

  return (
    <div>
      <Link
        href="/workouts/exercises"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group"
      >
        <ArrowLeft className="size-4 transition-transform duration-150 ease-out group-hover:-translate-x-0.5" />
        {t("Exercises")}
      </Link>

      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-display text-2xl sm:text-3xl text-foreground">
            {exerciseName}
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMergeModalOpen(true)}
            className="gap-1.5 cursor-pointer shrink-0"
          >
            <GitMerge className="size-4 text-brand" />
            <span>{t("Merge")}</span>
          </Button>
        </div>

        {/* Material / Equipment Filter Tabs */}
        {showMaterialTabs && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleSelectEquipment("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                selectedEquipment === "all"
                  ? "bg-brand text-brand-foreground shadow-xs font-semibold"
                  : "bg-card text-muted-foreground hover:text-foreground hover:bg-accent ring-1 ring-foreground/10"
              }`}
            >
              {t("All")}
            </button>
            {availableEquipments.map((eq) => (
              <button
                key={eq}
                type="button"
                onClick={() => handleSelectEquipment(eq)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  selectedEquipment === eq
                    ? "bg-brand text-brand-foreground shadow-xs font-semibold"
                    : "bg-card text-muted-foreground hover:text-foreground hover:bg-accent ring-1 ring-foreground/10"
                }`}
              >
                {t(eq)}
              </button>
            ))}
            {hasNoneEquipment && availableEquipments.length > 0 && (
              <button
                type="button"
                onClick={() => handleSelectEquipment("none")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  selectedEquipment === "none"
                    ? "bg-brand text-brand-foreground shadow-xs font-semibold"
                    : "bg-card text-muted-foreground hover:text-foreground hover:bg-accent ring-1 ring-foreground/10"
                }`}
              >
                {t("none")}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-3 sm:p-4 text-center">
          <div className="text-lg sm:text-2xl font-bold text-brand">
            {statMode === "weight"
              ? `${maxWeight} kg`
              : statMode === "reps"
              ? `${maxReps} reps`
              : maxDuration > 0
              ? formatSeconds(maxDuration)
              : "-"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {statMode === "weight"
              ? t("Best set")
              : statMode === "reps"
              ? t("Max reps")
              : t("Max duration")}
          </div>
        </div>
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-3 sm:p-4 text-center">
          <div className="text-lg sm:text-2xl font-bold text-amber-400">
            {statMode === "weight"
              ? totalVolume > 0
                ? `${totalVolume}`
                : "-"
              : statMode === "reps"
              ? totalReps > 0
                ? `${totalReps}`
                : "-"
              : totalDuration > 0
              ? formatSeconds(totalDuration)
              : "-"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {statMode === "weight"
              ? t("Total volume")
              : statMode === "reps"
              ? t("Total reps")
              : t("Total duration")}
          </div>
        </div>
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-3 sm:p-4 text-center">
          <div className="text-lg sm:text-2xl font-bold text-blue-400">
            {filteredSessions.length}
          </div>
          <div className="text-xs text-muted-foreground mt-1">{t("Sessions")}</div>
        </div>
      </div>

      {filteredSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted-foreground">{t("No data yet for this exercise.")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">{t("History")}</h2>

          {/* Simple SVG line chart */}
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
            <div className="text-xs text-muted-foreground mb-3">
              {statMode === "weight"
                ? "Volume (kg) per sessie"
                : statMode === "reps"
                ? "Reps per sessie"
                : "Tijd (min/sec) per sessie"}
            </div>
            <svg
              viewBox="0 0 320 130"
              className="w-full h-auto"
            >
              {/* Axes lines */}
              <line x1="40" y1="5" x2="40" y2="105" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              <line x1="40" y1="105" x2="310" y2="105" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              
              {(() => {
                const values = filteredSessions.map((s: WorkoutSession) =>
                  statMode === "weight"
                    ? s.sets.reduce((sum: number, set: SetItem) => sum + (set.weight ?? 0) * (set.reps ?? 0), 0)
                    : statMode === "reps"
                    ? s.sets.reduce((sum: number, set: SetItem) => sum + (set.reps ?? 0), 0)
                    : s.sets.reduce((sum: number, set: SetItem) => sum + (set.duration ?? 0), 0)
                );
                const maxVal = Math.max(...values, 1);
                
                const points = values.map((v: number, i: number) => {
                  const x = filteredSessions.length > 1 ? 40 + (i / (filteredSessions.length - 1)) * 260 : 175;
                  const y = 105 - (v / maxVal) * 95;
                  return `${x},${y}`;
                });

                const firstSession = filteredSessions[0];
                const lastSession = filteredSessions[filteredSessions.length - 1];
                const formatDate = (dateStr: string) => {
                  const d = parseDateString(dateStr);
                  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
                };

                const formatYLabel = (val: number) => {
                  if (statMode === "weight") return `${val} kg`;
                  if (statMode === "reps") return `${val}`;
                  return formatSeconds(val);
                };

                return (
                  <>
                    {/* Y Axis Labels */}
                    <text x="32" y="12" fill="rgba(255,255,255,0.35)" fontSize="8" textAnchor="end" className="font-mono tabular-nums">{formatYLabel(maxVal)}</text>
                    <text x="32" y="58" fill="rgba(255,255,255,0.35)" fontSize="8" textAnchor="end" className="font-mono tabular-nums">{formatYLabel(Math.round(maxVal / 2))}</text>
                    <text x="32" y="108" fill="rgba(255,255,255,0.35)" fontSize="8" textAnchor="end" className="font-mono tabular-nums">{statMode === "time" ? "0s" : "0"}</text>

                    {/* X Axis Labels */}
                    {filteredSessions.length === 1 && (
                      <text x="175" y="120" fill="rgba(255,255,255,0.35)" fontSize="8" textAnchor="middle" className="font-mono">{formatDate(firstSession.startedAt)}</text>
                    )}
                    {filteredSessions.length > 1 && (
                      <>
                        <text x="40" y="120" fill="rgba(255,255,255,0.35)" fontSize="8" textAnchor="start" className="font-mono">{formatDate(firstSession.startedAt)}</text>
                        <text x="310" y="120" fill="rgba(255,255,255,0.35)" fontSize="8" textAnchor="end" className="font-mono">{formatDate(lastSession.startedAt)}</text>
                      </>
                    )}

                    {/* Plot Line */}
                    <polyline
                      fill="none"
                      stroke="#00e3a4"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={points.join(" ")}
                    />
                    {/* Plot Dots */}
                    {values.map((v: number, i: number) => {
                      const x = filteredSessions.length > 1 ? 40 + (i / (filteredSessions.length - 1)) * 260 : 175;
                      const y = 105 - (v / maxVal) * 95;
                      return (
                        <circle key={i} cx={x} cy={y} r="3" fill="#00e3a4" className="hover:r-4 transition-all">
                          <title>{formatYLabel(v)}</title>
                        </circle>
                      );
                    })}
                  </>
                );
              })()}
            </svg>
          </div>

          {/* Session list */}
          {[...filteredSessions].reverse().map((session: WorkoutSession) => {
            const vol = session.sets.reduce((sum: number, set: SetItem) => sum + (set.weight ?? 0) * (set.reps ?? 0), 0);
            const reps = session.sets.reduce((sum: number, set: SetItem) => sum + (set.reps ?? 0), 0);
            const dur = session.sets.reduce((sum: number, set: SetItem) => sum + (set.duration ?? 0), 0);
            const date = parseDateString(session.startedAt);

            const sessionBadgeText =
              statMode === "weight"
                ? `${vol} kg`
                : statMode === "reps"
                ? `${reps} reps`
                : formatSeconds(dur);

            return (
              <Link
                key={session.sessionId}
                href={`/workouts/history/${session.sessionId}`}
                className="block rounded-xl bg-card ring-1 ring-foreground/10 hover:ring-brand/30 transition-all p-4 duration-200 hover:-translate-y-[2px]"
              >
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-border/20">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {date.toLocaleDateString("nl-NL", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                    {selectedEquipment === "all" && session.equipment && session.equipment !== "none" && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-foreground/5 text-muted-foreground font-medium border border-foreground/10">
                        {t(session.equipment)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-brand tabular-nums bg-brand/5 px-2 py-0.5 rounded border border-brand/20">
                    {sessionBadgeText}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {session.sets.map((set: SetItem) => {
                    const hasReps = set.reps != null && set.reps > 0;
                    const hasWeight = set.weight != null && set.weight > 0;
                    const hasDuration = set.duration != null && set.duration > 0;
                    const hasDistance = set.distance != null && set.distance > 0;

                    let label = `${set.reps ?? 0} × ${set.weight ?? 0} kg`;
                    if (hasDuration && !hasReps) {
                      const dur = set.duration!;
                      const min = Math.floor(dur / 60);
                      const sec = dur % 60;
                      label = `${min}:${String(sec).padStart(2, "0")}${hasWeight ? ` (${set.weight} kg)` : ""}`;
                    } else if (hasDistance && !hasReps) {
                      label = `${set.distance} km`;
                    } else if (hasReps && !hasWeight) {
                      label = `${set.reps} reps`;
                    } else if (hasReps && hasWeight) {
                      label = `${set.reps} × ${set.weight} kg`;
                    }

                    return (
                      <div
                        key={set.setNumber}
                        className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border font-mono ${
                          set.completed
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-zinc-800/50 text-muted-foreground border-zinc-700/30"
                        }`}
                      >
                        <span className="text-[10px] text-muted-foreground mr-0.5">S{set.setNumber}</span>
                        <span className="font-bold">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </Link>
            );
          })}
        </div>
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
