"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";

interface ExerciseHistoryModalProps {
  exerciseName: string;
  equipment?: string;
  onClose: () => void;
}

interface ProgressSet {
  setNumber: number;
  reps: number | null;
  weight: number | null;
  distance: number | null;
  duration: number | null;
  rpe: number | null;
  heartRate: number | null;
  completed: number;
}

interface ProgressSession {
  sessionId: number;
  startedAt: string;
  sets: ProgressSet[];
}

interface ProgressData {
  exerciseName: string;
  category: string;
  equipment: string | null;
  sessions: ProgressSession[];
}

export function ExerciseHistoryModal({ exerciseName, equipment, onClose }: ExerciseHistoryModalProps) {
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState<ProgressData | null>(null);

  useEffect(() => {
    let active = true;
    async function loadHistory() {
      setLoading(true);
      try {
        const data = await api.workouts.exercises.progress(exerciseName, equipment);
        if (active) setHistoryData(data);
      } catch (err) {
        console.error("Failed to load history for exercise", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadHistory();
    return () => {
      active = false;
    };
  }, [exerciseName, equipment]);

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl max-h-[85vh] overflow-y-auto flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-bold text-foreground truncate mr-2">
            {t("History for {name}", { name: exerciseName })}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5"
          >
            <X className="size-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <div className="animate-spin size-6 border-2 border-brand border-t-transparent rounded-full" />
          </div>
        ) : historyData?.sessions && historyData.sessions.length > 0 ? (
          <div className="flex flex-col gap-4">
            {/* Stats */}
            {(() => {
              const allSets = historyData.sessions.flatMap((s: ProgressSession) => s.sets);
              const maxWeight = allSets.reduce((max: number, s: ProgressSet) => Math.max(max, s.weight ?? 0), 0);
              const totalVolume = allSets.reduce((sum: number, s: ProgressSet) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);
              const totalReps = allSets.reduce((sum: number, s: ProgressSet) => sum + (s.reps ?? 0), 0);
              const maxReps = allSets.reduce((max: number, s: ProgressSet) => Math.max(max, s.reps ?? 0), 0);
              const totalDuration = allSets.reduce((sum: number, s: ProgressSet) => sum + (s.duration ?? 0), 0);
              const maxDuration = allSets.reduce((max: number, s: ProgressSet) => Math.max(max, s.duration ?? 0), 0);

              const statMode: "weight" | "reps" | "time" =
                maxWeight > 0 ? "weight" : maxReps > 0 ? "reps" : "time";

              const formatSec = (totalSec: number) => {
                const min = Math.floor(totalSec / 60);
                const sec = totalSec % 60;
                if (min === 0) return `${sec}s`;
                return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
              };

              const topValueText =
                statMode === "weight"
                  ? `${maxWeight} kg`
                  : statMode === "reps"
                  ? `${maxReps} reps`
                  : maxDuration > 0
                  ? formatSec(maxDuration)
                  : "-";

              const topLabel =
                statMode === "weight"
                  ? t("Best set")
                  : statMode === "reps"
                  ? t("Max reps")
                  : t("Max duration");

              const totalValueText =
                statMode === "weight"
                  ? `${totalVolume} kg`
                  : statMode === "reps"
                  ? `${totalReps} reps`
                  : totalDuration > 0
                  ? formatSec(totalDuration)
                  : "-";

              const totalLabel =
                statMode === "weight"
                  ? t("Total volume")
                  : statMode === "reps"
                  ? t("Total reps")
                  : t("Total duration");

              return (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl text-center">
                    <div className="text-xl font-bold text-brand">{topValueText}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">{topLabel}</div>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl text-center">
                    <div className="text-xl font-bold text-amber-400">{totalValueText}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">{totalLabel}</div>
                  </div>
                </div>
              );
            })()}

            {/* SVG chart */}
            {historyData.sessions.length > 0 && (
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5">
                {(() => {
                  const allSets = historyData.sessions.flatMap((s: ProgressSession) => s.sets);
                  const maxWeight = allSets.reduce((max: number, s: ProgressSet) => Math.max(max, s.weight ?? 0), 0);
                  const maxReps = allSets.reduce((max: number, s: ProgressSet) => Math.max(max, s.reps ?? 0), 0);
                  const statMode: "weight" | "reps" | "time" =
                    maxWeight > 0 ? "weight" : maxReps > 0 ? "reps" : "time";

                  const chartLabel =
                    statMode === "weight"
                      ? "Volume (kg)"
                      : statMode === "reps"
                      ? "Reps"
                      : "Tijd (min/sec)";

                  return <div className="text-[10px] text-muted-foreground mb-2 uppercase">{chartLabel}</div>;
                })()}
                <svg viewBox="0 0 300 100" className="w-full h-auto" preserveAspectRatio="none">
                  <line x1="0" y1="90" x2="300" y2="90" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  {(() => {
                    const allSets = historyData.sessions.flatMap((s: ProgressSession) => s.sets);
                    const maxWeight = allSets.reduce((max: number, s: ProgressSet) => Math.max(max, s.weight ?? 0), 0);
                    const maxReps = allSets.reduce((max: number, s: ProgressSet) => Math.max(max, s.reps ?? 0), 0);
                    const statMode: "weight" | "reps" | "time" =
                      maxWeight > 0 ? "weight" : maxReps > 0 ? "reps" : "time";

                    const values = historyData.sessions.map((s: ProgressSession) =>
                      statMode === "weight"
                        ? s.sets.reduce((sum: number, set: ProgressSet) => sum + (set.weight ?? 0) * (set.reps ?? 0), 0)
                        : statMode === "reps"
                        ? s.sets.reduce((sum: number, set: ProgressSet) => sum + (set.reps ?? 0), 0)
                        : s.sets.reduce((sum: number, set: ProgressSet) => sum + (set.duration ?? 0), 0)
                    );
                    const maxVal = Math.max(...values, 1);
                    const points = values.map((v: number, i: number) => {
                      const x = historyData.sessions.length > 1 ? (i / (historyData.sessions.length - 1)) * 280 + 10 : 150;
                      const y = 90 - (v / maxVal) * 80;
                      return `${x},${y}`;
                    });

                    return (
                      <>
                        <polyline
                          fill="none"
                          stroke="#00e3a4"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={points.join(" ")}
                        />
                        {values.map((v: number, i: number) => {
                          const x = historyData.sessions.length > 1 ? (i / (historyData.sessions.length - 1)) * 280 + 10 : 150;
                          const y = 90 - (v / maxVal) * 80;
                          return (
                            <circle key={i} cx={x} cy={y} r="3" fill="#00e3a4" />
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>
            )}

            {/* List */}
            <div className="flex flex-col gap-3 max-h-[45vh] overflow-y-auto pr-1">
              {[...historyData.sessions].reverse().map((sessionItem: ProgressSession, idx: number) => {
                const date = new Date(sessionItem.startedAt);
                const allSets = historyData.sessions.flatMap((s: ProgressSession) => s.sets);
                const maxWeight = allSets.reduce((max: number, s: ProgressSet) => Math.max(max, s.weight ?? 0), 0);
                const maxReps = allSets.reduce((max: number, s: ProgressSet) => Math.max(max, s.reps ?? 0), 0);
                const statMode: "weight" | "reps" | "time" =
                  maxWeight > 0 ? "weight" : maxReps > 0 ? "reps" : "time";

                const vol = sessionItem.sets.reduce((sum: number, s: ProgressSet) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);
                const reps = sessionItem.sets.reduce((sum: number, s: ProgressSet) => sum + (s.reps ?? 0), 0);
                const dur = sessionItem.sets.reduce((sum: number, s: ProgressSet) => sum + (s.duration ?? 0), 0);

                const formatSec = (totalSec: number) => {
                  const min = Math.floor(totalSec / 60);
                  const sec = totalSec % 60;
                  if (min === 0) return `${sec}s`;
                  return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
                };

                const sessionBadgeText =
                  statMode === "weight" && vol > 0
                    ? `${vol} kg volume`
                    : statMode === "reps" && reps > 0
                    ? `${reps} reps`
                    : statMode === "time" && dur > 0
                    ? formatSec(dur)
                    : null;

                return (
                  <div
                    key={idx}
                    className="border-b border-white/5 pb-2.5 last:border-0 last:pb-0 flex flex-col gap-1.5"
                  >
                    <div className="flex justify-between items-center w-full text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-zinc-300">
                          {date.toLocaleDateString("nl-NL", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ({sessionItem.sets.length} sets)
                        </span>
                      </div>
                      {sessionBadgeText && (
                        <span className="font-medium text-brand/90 tabular-nums text-[11px]">{sessionBadgeText}</span>
                      )}
                    </div>
                    
                    {/* Sets breakdown */}
                    <div className="flex flex-wrap gap-1">
                      {sessionItem.sets.map((s: ProgressSet, sIdx: number) => {
                        let detail = "";
                        if (s.reps && s.weight) {
                          detail = `${s.reps}x${s.weight}kg`;
                          if (s.rpe) detail += `@${s.rpe}`;
                        } else if (s.reps) {
                          detail = `${s.reps} herh`;
                        } else if (s.duration) {
                          const min = Math.floor(s.duration / 60);
                          const sec = s.duration % 60;
                          const durStr = `${min}:${String(sec).padStart(2, "0")}`;
                          detail = durStr;
                          if (s.weight) detail += ` w/${s.weight}kg`;
                        } else if (s.distance) {
                          detail = `${s.distance}km`;
                          if (s.duration) {
                            const min = Math.floor(s.duration / 60);
                            const sec = s.duration % 60;
                            detail += ` (${min}:${String(sec).padStart(2, "0")})`;
                          }
                        }
                        return (
                          <span
                            key={sIdx}
                            className="bg-white/[0.04] border border-white/5 rounded px-1.5 py-0.5 text-[10px] font-mono text-zinc-300"
                          >
                            {detail || "—"}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {t("No data yet for this exercise.")}
          </div>
        )}

      </div>
    </div>
  );
}
