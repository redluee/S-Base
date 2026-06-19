/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Play } from "lucide-react";

export function WorkoutTemplateDetail({ template }: { template: any }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(t("Delete this template?"))) return;
    await api.workouts.templates.delete(template.templateId);
    router.push("/workouts");
    router.refresh();
  }

  async function handleStart() {
    const session = await api.workouts.sessions.create(template.templateId);
    router.push(`/workouts/session/${session.sessionId}`);
    router.refresh();
  }

  return (
    <div>
      <Link
        href="/workouts"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group"
      >
        <ArrowLeft className="size-4 transition-transform duration-150 ease-out group-hover:-translate-x-0.5" />
        {t("Workouts")}
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl text-foreground mb-2">
            {template.name}
          </h1>
          {template.description && (
            <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
          )}
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {template.targetMuscleGroups && (
              <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10">
                💪 {template.targetMuscleGroups}
              </span>
            )}
            {template.estimatedTime && (
              <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10">
                ⏱️ {template.estimatedTime} {t("min")}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href={`/workouts/t/${template.templateId}/edit`}>
            <Button variant="outline" size="sm">
              {t("Edit")}
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            className="border-destructive text-destructive hover:bg-destructive/10"
          >
            {t("Delete")}
          </Button>
        </div>
      </div>

      <Button
        onClick={handleStart}
        className="w-full mb-8 bg-brand text-zinc-900 hover:bg-brand-hover text-base sm:text-lg py-6 sm:py-7 font-semibold transition-all active:scale-[0.97]"
      >
        <Play className="size-5 mr-2" />
        {t("Start workout")}
      </Button>

      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">{t("Exercises")}</h2>
        {template.exercises?.length > 0 ? (
          <div className="flex flex-col gap-2">
            {template.exercises.map((ex: any, i: number) => (
              <div
                key={ex.templateExerciseId ?? i}
                className="rounded-xl bg-card ring-1 ring-foreground/10 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground text-sm sm:text-base">
                    {ex.exerciseName}
                  </span>
                </div>
                <div className="flex gap-4 mt-2 text-xs sm:text-sm text-muted-foreground">
                  {(() => {
                    const cat = ex.category ?? "resistance";
                    const setsStr = `${ex.defaultSets} ${t("Sets")}`;
                    const formatSecs = (secVal: number | null | undefined) => {
                      if (secVal === null || secVal === undefined) return "";
                      const min = Math.floor(secVal / 60);
                      const sec = secVal % 60;
                      return `${min}:${String(sec).padStart(2, "0")}`;
                    };
                    switch (cat) {
                      case "resistance": {
                        const parts = [setsStr, `${ex.defaultReps} ${t("Reps")}`];
                        if (ex.defaultWeight != null) parts.push(`${ex.defaultWeight} kg`);
                        if (ex.defaultRpe != null) parts.push(`RPE ${ex.defaultRpe}`);
                        return parts.join(" • ");
                      }
                      case "bodyweight": {
                        const parts = [setsStr, `${ex.defaultReps} ${t("Reps")}`];
                        if (ex.defaultWeight != null && ex.defaultWeight !== 0) {
                          parts.push(ex.defaultWeight > 0 ? `+${ex.defaultWeight} kg` : `${ex.defaultWeight} kg`);
                        }
                        return parts.join(" • ");
                      }
                      case "cardio": {
                        const parts = [setsStr];
                        if (ex.defaultDistance != null) parts.push(`${ex.defaultDistance} km`);
                        if (ex.defaultDuration != null) parts.push(formatSecs(ex.defaultDuration));
                        if (ex.defaultHeartRate != null) parts.push(`${ex.defaultHeartRate} bpm`);
                        return parts.join(" • ");
                      }
                      case "isometric": {
                        const parts = [setsStr];
                        if (ex.defaultDuration != null) parts.push(formatSecs(ex.defaultDuration));
                        if (ex.defaultWeight != null && ex.defaultWeight !== 0) parts.push(`+${ex.defaultWeight} kg`);
                        return parts.join(" • ");
                      }
                      default:
                        return setsStr;
                    }
                  })()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("No exercises yet.")}</p>
        )}
      </section>
    </div>
  );
}
