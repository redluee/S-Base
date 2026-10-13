"use client";

import { Calendar, Clock, ArrowRight, CheckCircle2, TrendingUp } from "lucide-react";
import Link from "next/link";
import { t } from "@/lib/lang";
import { TOTAL_REQUIRED_LUS } from "./dashboard-constants";
import type { MinorDashboardStats } from "@/lib/api";

interface DashboardHeroProps {
  stats: MinorDashboardStats;
  activeSprint: MinorDashboardStats["activeSprint"];
  totalOfficial: number;
  totalProjected: number;
  officialPercentage: number;
  projectedPercentage: number;
}

export function DashboardHero({ stats, activeSprint, totalOfficial, totalProjected, officialPercentage, projectedPercentage }: DashboardHeroProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {activeSprint ? (
        <Link
          href={`/minor/sprints/${activeSprint.id}`}
          className="group lg:col-span-2 p-6 rounded-2xl bg-gradient-to-br from-emerald-950/30 via-zinc-900/90 to-zinc-900/60 border border-emerald-500/20 hover:border-emerald-500/50 shadow-xl relative overflow-hidden flex flex-col justify-between transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_2rem_-0.5rem_rgba(16,185,129,0.2)] block cursor-pointer"
        >
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-brand bg-brand/10 border border-brand/20 px-2.5 py-1 rounded-full">
                {t("Actieve Sprint")}
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                {activeSprint.startDate} → {activeSprint.endDate}
              </span>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight group-hover:text-emerald-300 transition-colors">
                {activeSprint.name}
              </h2>
              {activeSprint.extendedDays > 0 && (
                <p className="text-xs text-emerald-400/90 mt-1 flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  <span>
                    {t("Verlengd met {days} vakantiedagen", { days: String(activeSprint.extendedDays) })} ({activeSprint.extensionReason})
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="pt-6 mt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <Clock className="size-4 text-brand shrink-0" />
              <span>
                {t("Show & Grow op woensdag")}:{" "}
                <strong className="text-white">
                  {stats.nextShowAndGrowDate || "-"}
                </strong>
              </span>
              {stats.daysUntilShowAndGrow !== null && (
                <span className="ml-1 text-[11px] font-mono text-zinc-400">
                  ({stats.daysUntilShowAndGrow > 0 ? `${stats.daysUntilShowAndGrow} ${t("dagen te gaan")}` : stats.daysUntilShowAndGrow === 0 ? t("Vandaag!") : t("Verstreken")})
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold text-brand group-hover:text-brand-hover">
              <span>{t("Sprintplanning openen")}</span>
              <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      ) : (
        <div className="lg:col-span-2 p-6 rounded-2xl bg-gradient-to-br from-emerald-950/30 via-zinc-900/90 to-zinc-900/60 border border-emerald-500/20 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-brand bg-brand/10 border border-brand/20 px-2.5 py-1 rounded-full">
                {t("Actieve Sprint")}
              </span>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-zinc-300">
                {t("Geen actieve sprint gevonden")}
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                {t("Maak je eerste sprint aan om je planning en Show & Grow cyclus te starten.")}
              </p>
            </div>
          </div>

          <div className="pt-6 mt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <Clock className="size-4 text-brand shrink-0" />
              <span>
                {t("Show & Grow op woensdag")}:{" "}
                <strong className="text-white">
                  {stats.nextShowAndGrowDate || "-"}
                </strong>
              </span>
              {stats.daysUntilShowAndGrow !== null && (
                <span className="ml-1 text-[11px] font-mono text-zinc-400">
                  ({stats.daysUntilShowAndGrow > 0 ? `${stats.daysUntilShowAndGrow} ${t("dagen te gaan")}` : stats.daysUntilShowAndGrow === 0 ? t("Vandaag!") : t("Verstreken")})
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats Column */}
      <div className="p-6 rounded-2xl bg-zinc-900/80 border border-white/10 backdrop-blur-md flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              {t("Minor Status")}
            </h3>
            <CheckCircle2 className="size-4 text-brand" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/5">
              <span className="text-[11px] text-zinc-500 block">{t("Totaal Sprints")}</span>
              <span className="text-xl font-bold text-white font-mono">{stats.totalSprints}</span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/5 flex flex-col justify-between">
              <div>
                <span className="text-[11px] text-zinc-500 block">{t("Behaalde V's")}</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-brand font-mono">
                    {totalOfficial}
                  </span>
                  <span className="text-xs font-mono text-zinc-500">/ {TOTAL_REQUIRED_LUS}</span>
                </div>
              </div>
              <div className="w-full bg-zinc-900 rounded-full h-1 mt-2 overflow-hidden">
                <div
                  className="bg-brand h-full rounded-full transition-all duration-500"
                  style={{ width: `${officialPercentage}%` }}
                />
              </div>
            </div>
          </div>

          <div className="text-xs text-zinc-400">
            <span className="flex items-center gap-1 text-zinc-300 font-medium mb-1">
              <TrendingUp className="size-3.5 text-emerald-400" />
              {t("Prognose inclusief actieve sprints")}:
            </span>
            <span className="font-mono text-emerald-400 font-semibold">
              {totalProjected} / {TOTAL_REQUIRED_LUS} {t("voldoendes verwacht")} ({projectedPercentage}%)
            </span>
            <span className="text-[11px] text-zinc-500 block mt-0.5">
              {t("Max. 1 voldoende per leeruitkomst per sprint")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
