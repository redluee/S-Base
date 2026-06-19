"use client";

import { t } from "@/lib/lang";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface SetItem {
  setNumber: number;
  reps: number;
  weight: number | null;
  completed: number;
}

interface WorkoutSession {
  sessionId: number;
  startedAt: string;
  sets: SetItem[];
}

interface ExerciseProgressData {
  exerciseName: string;
  sessions: WorkoutSession[];
}

export function ExerciseProgress({ data }: { data: ExerciseProgressData }) {
  const { exerciseName, sessions } = data;

  const allSets = sessions.flatMap((s: WorkoutSession) => s.sets);

  const totalVolume = allSets.reduce((sum: number, set: SetItem) => sum + (set.weight ?? 0) * set.reps, 0);
  const maxWeight = allSets.reduce((max: number, set: SetItem) => Math.max(max, set.weight ?? 0), 0);

  return (
    <div>
      <Link
        href="/workouts/exercises"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group"
      >
        <ArrowLeft className="size-4 transition-transform duration-150 ease-out group-hover:-translate-x-0.5" />
        {t("Exercises")}
      </Link>

      <h1 className="font-display text-2xl sm:text-3xl text-foreground mb-6">
        {exerciseName}
      </h1>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-3 sm:p-4 text-center">
          <div className="text-lg sm:text-2xl font-bold text-brand">
            {maxWeight > 0 ? `${maxWeight} kg` : "-"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">{t("Best set")}</div>
        </div>
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-3 sm:p-4 text-center">
          <div className="text-lg sm:text-2xl font-bold text-amber-400">
            {totalVolume > 0 ? `${totalVolume}` : "-"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">{t("Total volume")}</div>
        </div>
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-3 sm:p-4 text-center">
          <div className="text-lg sm:text-2xl font-bold text-blue-400">
            {sessions.length}
          </div>
          <div className="text-xs text-muted-foreground mt-1">{t("Sessions")}</div>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted-foreground">{t("No data yet for this exercise.")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">{t("History")}</h2>

          {/* Simple SVG line chart for volume over time */}
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
            <div className="text-xs text-muted-foreground mb-3">Volume (kg) per sessie</div>
            <svg
              viewBox="0 0 300 120"
              className="w-full h-auto"
              preserveAspectRatio="none"
            >
              <line x1="0" y1="110" x2="300" y2="110" stroke="currentColor" className="text-border" strokeWidth="1" />
              {(() => {
                const volumes = sessions.map((s: WorkoutSession) =>
                  s.sets.reduce((sum: number, set: SetItem) => sum + (set.weight ?? 0) * set.reps, 0),
                );
                const maxVol = Math.max(...volumes, 1);
                const points = volumes.map((v: number, i: number) => {
                  const x = sessions.length > 1 ? (i / (sessions.length - 1)) * 290 + 5 : 150;
                  const y = 110 - (v / maxVol) * 95;
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
                    {volumes.map((v: number, i: number) => {
                      const x = sessions.length > 1 ? (i / (sessions.length - 1)) * 290 + 5 : 150;
                      const y = 110 - (v / maxVol) * 95;
                      return (
                        <circle key={i} cx={x} cy={y} r="3" fill="#00e3a4" className="hover:r-4 transition-all">
                          <title>{v} kg</title>
                        </circle>
                      );
                    })}
                  </>
                );
              })()}
            </svg>
          </div>

          {/* Session list */}
          {[...sessions].reverse().map((session: WorkoutSession) => {
            const vol = session.sets.reduce((sum: number, set: SetItem) => sum + (set.weight ?? 0) * set.reps, 0);
            const date = new Date(session.startedAt.includes("T") ? session.startedAt : session.startedAt.replace(" ", "T") + "Z");
            return (
              <Link
                key={session.sessionId}
                href={`/workouts/history/${session.sessionId}`}
                className="block rounded-xl bg-card ring-1 ring-foreground/10 hover:ring-brand/30 transition-all p-4 duration-200 hover:-translate-y-[2px]"
              >
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-border/20">
                  <span className="text-sm font-medium text-foreground">
                    {date.toLocaleDateString("nl-NL", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-brand tabular-nums bg-brand/5 px-2 py-0.5 rounded border border-brand/20">
                    {vol} kg
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {session.sets.map((set: SetItem) => (
                    <div
                      key={set.setNumber}
                      className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border font-mono ${
                        set.completed
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-zinc-800/50 text-muted-foreground border-zinc-700/30"
                      }`}
                    >
                      <span className="text-[10px] text-muted-foreground mr-0.5">S{set.setNumber}</span>
                      <span className="font-bold">{set.reps}</span>
                      <span className="text-muted-foreground">×</span>
                      <span>{set.weight ?? 0} kg</span>
                    </div>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
