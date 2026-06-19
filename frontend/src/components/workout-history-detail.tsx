"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";

export function WorkoutHistoryDetail({ session }: { session: any }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(t("Delete this workout?"))) return;
    await api.workouts.sessions.delete(session.sessionId);
    router.push("/workouts/history");
    router.refresh();
  }

  const started = new Date(session.startedAt.includes("T") ? session.startedAt : session.startedAt.replace(" ", "T") + "Z");
  const completed = session.completedAt ? new Date(session.completedAt.includes("T") ? session.completedAt : session.completedAt.replace(" ", "T") + "Z") : null;
  const duration = completed ? Math.round((completed.getTime() - started.getTime()) / 60000) : null;

  return (
    <div>
      <Link
        href="/workouts/history"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group"
      >
        <ArrowLeft className="size-4 transition-transform duration-150 ease-out group-hover:-translate-x-0.5" />
        {t("History")}
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-foreground mb-2">
            {started.toLocaleDateString("nl-NL", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {session.completedAt ? (
              <Badge className="bg-brand/20 text-brand">{t("Completed")}</Badge>
            ) : (
              <Badge className="bg-amber-900/30 text-amber-400">{t("in progress")}</Badge>
            )}
            {duration && <span>{duration} min</span>}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          className="border-destructive text-destructive hover:bg-destructive/10 shrink-0"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      {session.notes && (
        <p className="text-foreground mb-6 leading-relaxed text-sm">{session.notes}</p>
      )}

      <div className="flex flex-col gap-4">
        {session.exercises?.map((ex: any, i: number) => (
          <div
            key={ex.sessionExerciseId ?? i}
            className="rounded-xl bg-card ring-1 ring-foreground/10 p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-brand/20 text-brand text-xs font-bold shrink-0">
                {i + 1}
              </div>
              <h3 className="font-medium text-foreground text-sm sm:text-base">
                {ex.exerciseName}
              </h3>
            </div>
            {ex.sets?.length > 0 && (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                {(() => {
                  const cat = ex.category ?? "resistance";
                  const formatSecs = (secVal: number | null | undefined) => {
                    if (secVal === null || secVal === undefined || isNaN(secVal)) return "—";
                    const min = Math.floor(secVal / 60);
                    const sec = secVal % 60;
                    return `${min}:${String(sec).padStart(2, "0")}`;
                  };

                  return (
                    <table className="w-full text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left p-2 text-muted-foreground font-normal w-12">{t("Set")}</th>
                          {(cat === "resistance") && (
                            <>
                              <th className="text-right p-2 text-muted-foreground font-normal">{t("Reps")}</th>
                              <th className="text-right p-2 text-muted-foreground font-normal">kg</th>
                              <th className="text-right p-2 text-muted-foreground font-normal">{t("RPE (0-10)")}</th>
                            </>
                          )}
                          {cat === "bodyweight" && (
                            <>
                              <th className="text-right p-2 text-muted-foreground font-normal">{t("Reps")}</th>
                              <th className="text-right p-2 text-muted-foreground font-normal">{t("Added/Assisted (kg)")}</th>
                            </>
                          )}
                          {cat === "cardio" && (
                            <>
                              <th className="text-right p-2 text-muted-foreground font-normal">{t("Distance (km)")}</th>
                              <th className="text-right p-2 text-muted-foreground font-normal">{t("Time")}</th>
                              <th className="text-right p-2 text-muted-foreground font-normal">{t("Avg HR (bpm)")}</th>
                            </>
                          )}
                          {cat === "isometric" && (
                            <>
                              <th className="text-right p-2 text-muted-foreground font-normal">{t("Time")}</th>
                              <th className="text-right p-2 text-muted-foreground font-normal">{t("Added weight (kg)")}</th>
                            </>
                          )}
                          <th className="text-right p-2 text-muted-foreground font-normal w-20">{t("Complete")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ex.sets.map((set: any, si: number) => (
                          <tr key={si} className="border-b border-border/30 last:border-0">
                            <td className="p-2 text-foreground font-medium">{set.setNumber}</td>
                            {cat === "resistance" && (
                              <>
                                <td className="p-2 text-right text-foreground">{set.reps}</td>
                                <td className="p-2 text-right text-foreground">{set.weight ?? "—"}</td>
                                <td className="p-2 text-right text-foreground">{set.rpe ?? "—"}</td>
                              </>
                            )}
                            {cat === "bodyweight" && (
                              <>
                                <td className="p-2 text-right text-foreground">{set.reps}</td>
                                <td className="p-2 text-right text-foreground">
                                  {set.weight != null ? (set.weight > 0 ? `+${set.weight}` : set.weight === 0 ? "BW" : set.weight) : "—"}
                                </td>
                              </>
                            )}
                            {cat === "cardio" && (
                              <>
                                <td className="p-2 text-right text-foreground">{set.distance ?? "—"}</td>
                                <td className="p-2 text-right text-foreground">{formatSecs(set.duration)}</td>
                                <td className="p-2 text-right text-foreground">{set.heartRate ?? "—"}</td>
                              </>
                            )}
                            {cat === "isometric" && (
                              <>
                                <td className="p-2 text-right text-foreground">{formatSecs(set.duration)}</td>
                                <td className="p-2 text-right text-foreground">{set.weight ?? "—"}</td>
                              </>
                            )}
                            <td className="p-2 text-right">
                              {set.completed ? (
                                <span className="text-brand">✓</span>
                              ) : (
                                <span className="text-muted-foreground">–</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
