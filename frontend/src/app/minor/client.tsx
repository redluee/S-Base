"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Layers,
  Upload,
} from "lucide-react";
import { t } from "@/lib/lang";
import { api, type MinorDashboardStats, type MinorSprint } from "@/lib/api";
import { DashboardHero } from "./dashboard-hero";
import { DashboardLuProgress } from "./dashboard-lu-progress";
import { DashboardOverview } from "./dashboard-overview";
import { PeerHelpModal } from "./peer-help-modal";
import { SprintFormModal } from "./sprints/sprint-form-modal";
import { useSprintDates } from "./sprints/use-sprint-dates";
import { useActionError } from "@/lib/use-action-error";
import { InlineAlert } from "@/components/ui/inline-alert";
import { TOTAL_REQUIRED_PASSES } from "@/app/minor/learning-outcomes";
import { today } from "@backend/shared/dates";
import { DEFAULT_SPRINT_DAYS, passProgress } from "@backend/shared/minor";

interface MinorDashboardClientProps {
  initialStats: MinorDashboardStats;
  initialSprints: MinorSprint[];
}

export function MinorDashboardClient({ initialStats, initialSprints }: MinorDashboardClientProps) {
  const { error: actionError, report } = useActionError();
  const [stats, setStats] = useState<MinorDashboardStats>(initialStats);
  const [sprints, setSprints] = useState<MinorSprint[]>(initialSprints);
  const [isPeerModalOpen, setIsPeerModalOpen] = useState(false);

  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [sprintNumber, setSprintNumber] = useState("");
  const [startDate, setStartDate] = useState(today());
  const [durationDays, setDurationDays] = useState(DEFAULT_SPRINT_DAYS);
  const [savingSprint, setSavingSprint] = useState(false);

  const calculatedDates = useSprintDates(startDate, durationDays, isSprintModalOpen, report);

  async function openCreateSprintModal() {
    setSprintNumber("");
    setDurationDays(DEFAULT_SPRINT_DAYS);
    const startOn = today();
    setStartDate(startOn);

    try {
      const nextNum = await api.minor.sprints.nextNumber();
      setSprintNumber(nextNum.nextNumber);

    } catch (err) {
      report(err, "minor.actionFailed");
    }

    setIsSprintModalOpen(true);
  }

  async function handleSaveSprint(e: React.FormEvent) {
    e.preventDefault();
    if (!sprintNumber.trim() || !startDate) return;
    setSavingSprint(true);
    try {
      const created = await api.minor.sprints.create({
        sprintNumber: sprintNumber.trim(),
        startDate,
        durationDays,
      });
      setSprints((prev) => [...prev, created]);
      const updatedStats = await api.minor.dashboard();
      setStats(updatedStats);
      setIsSprintModalOpen(false);
    } catch (err) {
      report(err, "minor.actionFailed");
    } finally {
      setSavingSprint(false);
    }
  }

  const activeSprint = stats.activeSprint;
  const warnings = stats.activeSprintWarnings;

  const { total: totalOfficial, allMinimumsMet, totalTargetMet } = passProgress(stats.officialPasses);
  const totalProjected = Object.values(stats.projectedPasses).reduce((a, b) => a + b, 0);
  const officialPercentage = Math.min(100, Math.round((totalOfficial / TOTAL_REQUIRED_PASSES) * 100));
  const projectedPercentage = Math.min(100, Math.round((totalProjected / TOTAL_REQUIRED_PASSES) * 100));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <InlineAlert>{actionError}</InlineAlert>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl text-white tracking-tight">
            {t("Future-proof met AI overview")}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            {t("Centraal overzicht van je sprintplanning, Show & Grow sessies en leeruitkomsten.")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/minor/sprints"
            title={t("Alle sprints bekijken")}
            aria-label={t("Alle sprints bekijken")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 transition-all cursor-pointer"
          >
            <Layers className="size-3.5" />
            <span className="hidden sm:inline">{t("Alle sprints")}</span>
          </Link>
          <Link
            href="/minor/export"
            title={t("Exporteer Portfolio")}
            aria-label={t("Exporteer Portfolio")}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold bg-brand text-zinc-950 hover:bg-brand-hover hover:shadow-[0_0_1.5rem_rgba(0,227,164,0.3)] transition-all cursor-pointer"
          >
            <Upload className="size-3.5" />
            <span className="hidden sm:inline">{t("Exporteer Portfolio")}</span>
          </Link>
        </div>
      </div>

      {warnings && (warnings.fewLearningOutcomes || warnings.missingLU5) && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-1.5 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="size-4 shrink-0 text-amber-400" />
            <span>{t("Waarschuwingssysteem Minorvereisten")}</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-zinc-300 pl-1">
            {warnings.fewLearningOutcomes && (
              <li>
                {t("Minder dan 3 leeruitkomsten geselecteerd in deze sprint.")} ({warnings.uniqueLUsCount} {t("geselecteerd")})
              </li>
            )}
            {warnings.missingLU5 && (
              <li>
                {t("Leeruitkomst 5 (LU 5) ontbreekt in deze sprint.")} {t("Vergeet niet om professionele vaardigheden of peer-hulp in te plannen.")}
              </li>
            )}
          </ul>
        </div>
      )}


      <DashboardHero
        stats={stats}
        activeSprint={activeSprint}
        totalOfficial={totalOfficial}
        totalProjected={totalProjected}
        officialPercentage={officialPercentage}
        projectedPercentage={projectedPercentage}
      />

      <DashboardLuProgress
        stats={stats}
        totalOfficial={totalOfficial}
        totalProjected={totalProjected}
        officialPercentage={officialPercentage}
        projectedPercentage={projectedPercentage}
        allMinimumsMet={allMinimumsMet}
        totalTargetMet={totalTargetMet}
      />

      <DashboardOverview stats={stats} sprints={sprints} openCreateSprintModal={openCreateSprintModal} setIsPeerModalOpen={setIsPeerModalOpen} />

      {isPeerModalOpen && (
        <PeerHelpModal
          entry={null}
          defaultSprintId={stats.activeSprint?.id ?? null}
          sprints={sprints}
          onClose={() => setIsPeerModalOpen(false)}
          onSaved={() => api.minor.dashboard().then(setStats).catch((err) => report(err, "minor.actionFailed"))}
        />
      )}

      {isSprintModalOpen && (
        <SprintFormModal
          editingSprint={null}
          sprintNumber={sprintNumber}
          setSprintNumber={setSprintNumber}
          startDate={startDate}
          setStartDate={setStartDate}
          durationDays={durationDays}
          setDurationDays={setDurationDays}
          calculatedDates={calculatedDates}
          saving={savingSprint}
          onClose={() => setIsSprintModalOpen(false)}
          onSubmit={handleSaveSprint}
        />
      )}
    </div>
  );
}
