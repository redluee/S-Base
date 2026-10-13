"use client";

import { GraduationCap, Check } from "lucide-react";
import { t } from "@/lib/lang";
import { getLUShortDesc } from "@/lib/minor-constants";
import { LU_MIN_TARGETS } from "./dashboard-constants";
import type { MinorDashboardStats } from "@/lib/api";

interface DashboardLuProgressProps {
  stats: MinorDashboardStats;
  totalOfficial: number;
  totalProjected: number;
  officialPercentage: number;
  projectedPercentage: number;
  allMinimumsMet: boolean;
  totalTargetMet: boolean;
}

export function DashboardLuProgress({ stats, totalOfficial, totalProjected, officialPercentage, projectedPercentage, allMinimumsMet, totalTargetMet }: DashboardLuProgressProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight">
          {t("Leeruitkomsten & Voortgang")}
        </h2>
      </div>

      {/* Master Progress Bar Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900/80 border border-white/10 backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0">
              <GraduationCap className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">
                  {t("Totale Voortgang Portfolio")}
                </span>
                {totalTargetMet && allMinimumsMet ? (
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-brand/10 border border-brand/20 text-brand">
                    {t("Doel Bereikt!")}
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                    {officialPercentage}% {t("compleet")}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="text-left sm:text-right">
              <span className="text-zinc-500 block text-[11px]">{t("Officieel behaald")}</span>
              <span className="text-base font-bold text-brand">{totalOfficial} <span className="text-xs text-zinc-500">/ 24</span></span>
            </div>
            <div className="h-8 w-px bg-white/10 hidden sm:block" />
            <div className="text-left sm:text-right">
              <span className="text-zinc-500 block text-[11px]">{t("Prognose")}</span>
              <span className="text-base font-bold text-emerald-400">{totalProjected} <span className="text-xs text-zinc-500">/ 24</span></span>
            </div>
          </div>
        </div>

        {/* Master Progress Bar */}
        <div className="space-y-1.5">
          <div className="h-3.5 bg-zinc-950 rounded-full border border-white/10 p-0.5 relative overflow-hidden flex items-center">
            {/* Projected Fill */}
            <div
              className="absolute left-0.5 top-0.5 bottom-0.5 bg-brand/20 rounded-full transition-all duration-500"
              style={{ width: `calc(${projectedPercentage}% - 4px)` }}
            />
            {/* Official Fill */}
            <div
              className="relative h-full bg-brand rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(0,227,164,0.4)]"
              style={{ width: `${officialPercentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-brand inline-block" />
              <span>{t("Officieel toegekend")}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-brand/30 inline-block" />
              <span>{t("Verwacht (inclusief actief)")}</span>
            </span>
          </div>
        </div>

        {/* Minimum Target Requirements Status Pills */}
        <div className="pt-3 border-t border-white/5">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((luNum) => {
              const count = stats.officialPasses[luNum] || 0;
              const minTarget = LU_MIN_TARGETS[luNum];
              const isMet = count >= minTarget;
              const projectedCount = stats.projectedPasses[luNum] || 0;
              const isProjectedMet = projectedCount >= minTarget;
              const pendingCount = Math.max(0, projectedCount - count);

              return (
                <div
                  key={luNum}
                  title={getLUShortDesc(luNum) || undefined}
                  className={`px-3 py-2 rounded-xl border text-xs flex items-center justify-between ${
                    isMet
                      ? "bg-brand/10 border-brand/30 text-brand"
                      : isProjectedMet
                      ? "bg-emerald-950/20 border-emerald-500/30 text-zinc-200"
                      : pendingCount > 0
                      ? "bg-zinc-950/60 border-emerald-500/20 text-zinc-300"
                      : "bg-zinc-950/40 border-white/5 text-zinc-400"
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isMet ? (
                      <Check className="size-3.5 text-brand shrink-0" />
                    ) : pendingCount > 0 ? (
                      <span className="size-1.5 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                    ) : (
                      <span className="size-1.5 rounded-full bg-zinc-600 shrink-0" />
                    )}
                    <span className="font-semibold font-mono truncate">
                      LU {luNum}
                      {getLUShortDesc(luNum) && (
                        <span className="hidden sm:inline text-[10px] font-sans font-normal opacity-70 ml-1">
                          · {getLUShortDesc(luNum)}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] shrink-0 ml-1">
                    <span className={isMet ? "font-bold text-brand" : "text-white"}>{count}</span>
                    <span className="text-zinc-500">/{minTarget}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
