"use client";

import { t } from "@/lib/lang";

interface StoryMetricsProps {
  totalCount: number;
  conceptCount: number;
  doneCount: number;
  inProgressCount: number;
  todoCount: number;
  usCount: number;
  rsCount: number;
  lsCount: number;
  completionPct: number;
}

export function StoryMetrics({ totalCount, conceptCount, doneCount, inProgressCount, todoCount, usCount, rsCount, lsCount, completionPct }: StoryMetricsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          {t("Totaal Stories")}
        </div>
        <div className="text-2xl font-bold font-mono text-white">
          {totalCount}{" "}
          {conceptCount > 0 && (
            <span className="text-xs font-normal text-amber-400">({conceptCount} {t("concept")})</span>
          )}
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
          {t("User Stories (US)")}
        </div>
        <div className="text-2xl font-bold font-mono text-emerald-300">{usCount}</div>
      </div>

      <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-orange-400">
          {t("Research (RS)")}
        </div>
        <div className="text-2xl font-bold font-mono text-orange-300">{rsCount}</div>
      </div>

      <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-purple-400">
          {t("Learning (LS)")}
        </div>
        <div className="text-2xl font-bold font-mono text-purple-300">{lsCount}</div>
      </div>

      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          {t("Voltooid")}
        </div>
        <div className="text-2xl font-bold font-mono text-white">
          {doneCount} <span className="text-xs font-normal text-zinc-400">({completionPct}%)</span>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          {t("In Uitvoering")}
        </div>
        <div className="text-2xl font-bold font-mono text-amber-400">
          {inProgressCount} <span className="text-xs font-normal text-zinc-400">/ {todoCount} todo</span>
        </div>
      </div>
    </div>
  );
}
