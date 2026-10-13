"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Layers,
  Upload,
} from "lucide-react";
import { t } from "@/lib/lang";
import { api, type MinorDashboardStats, type MinorSprint } from "@/lib/api";
import { TOTAL_REQUIRED_LUS, LU_MIN_TARGETS } from "./dashboard-constants";
import { DashboardHero } from "./dashboard-hero";
import { DashboardLuProgress } from "./dashboard-lu-progress";
import { DashboardOverview } from "./dashboard-overview";
import { PeerHelpModal } from "./peer-help-modal";
import { SprintCreateModal, type CalculatedDates } from "./sprint-create-modal";

interface MinorDashboardClientProps {
  initialStats: MinorDashboardStats;
  initialSprints: MinorSprint[];
}

export function MinorDashboardClient({ initialStats, initialSprints }: MinorDashboardClientProps) {
  const [stats, setStats] = useState<MinorDashboardStats>(initialStats);
  const [sprints, setSprints] = useState<MinorSprint[]>(initialSprints);
  const [isPeerModalOpen, setIsPeerModalOpen] = useState(false);
  const [peerDate, setPeerDate] = useState(new Date().toISOString().slice(0, 10));
  const [peerName, setPeerName] = useState("");
  const [peerDesc, setPeerDesc] = useState("");
  const [peerLinks, setPeerLinks] = useState("");
  const [savingPeer, setSavingPeer] = useState(false);

  // Sprint Create Modal State
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [sprintNumber, setSprintNumber] = useState("");
  const [sprintName, setSprintName] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [durationDays, setDurationDays] = useState(14);
  const [calculatedDates, setCalculatedDates] = useState<CalculatedDates>(null);
  const [savingSprint, setSavingSprint] = useState(false);

  useEffect(() => {
    if (!startDate || durationDays <= 0 || !isSprintModalOpen) return;
    let isCurrent = true;
    api.minor.sprints
      .calculateDates(startDate, durationDays)
      .then((res) => {
        if (isCurrent) setCalculatedDates(res);
      })
      .catch((err) => console.error("Date calculation error:", err));
    return () => {
      isCurrent = false;
    };
  }, [startDate, durationDays, isSprintModalOpen]);

  async function openCreateSprintModal() {
    setSprintNumber("");
    setSprintName("");
    setDurationDays(14);
    const today = new Date().toISOString().slice(0, 10);
    setStartDate(today);

    try {
      const nextNum = await api.minor.sprints.nextNumber();
      setSprintNumber(nextNum.nextNumber);
      setSprintName(nextNum.nextName);

      const calc = await api.minor.sprints.calculateDates(today, 14);
      setCalculatedDates(calc);
    } catch (err) {
      console.error("Failed to precalculate sprint:", err);
    }

    setIsSprintModalOpen(true);
  }

  async function handleSaveSprint(e: React.FormEvent) {
    e.preventDefault();
    if (!sprintNumber.trim() || !sprintName.trim() || !startDate) return;
    setSavingSprint(true);
    try {
      const created = await api.minor.sprints.create({
        sprintNumber: sprintNumber.trim(),
        name: sprintName.trim(),
        startDate,
        durationDays,
      });
      setSprints((prev) => [...prev, created]);
      const updatedStats = await api.minor.dashboard();
      setStats(updatedStats);
      setIsSprintModalOpen(false);
    } catch (err) {
      console.error("Failed to create sprint:", err);
    } finally {
      setSavingSprint(false);
    }
  }

  async function handleAddPeerHelp(e: React.FormEvent) {
    e.preventDefault();
    if (!peerName.trim() || !peerDesc.trim()) return;
    setSavingPeer(true);
    try {
      await api.minor.peerHelp.create({
        date: peerDate,
        peerName: peerName.trim(),
        description: peerDesc.trim(),
        links: peerLinks.trim() || undefined,
        sprintId: stats.activeSprint?.id ?? null,
      });
      const updated = await api.minor.dashboard();
      setStats(updated);
      setIsPeerModalOpen(false);
      setPeerName("");
      setPeerDesc("");
      setPeerLinks("");
    } catch (err) {
      console.error("Failed to add peer help:", err);
    } finally {
      setSavingPeer(false);
    }
  }

  const activeSprint = stats.activeSprint;
  const warnings = stats.activeSprintWarnings;

  const totalOfficial = Object.values(stats.officialPasses).reduce((a, b) => a + b, 0);
  const totalProjected = Object.values(stats.projectedPasses).reduce((a, b) => a + b, 0);
  const officialPercentage = Math.min(100, Math.round((totalOfficial / TOTAL_REQUIRED_LUS) * 100));
  const projectedPercentage = Math.min(100, Math.round((totalProjected / TOTAL_REQUIRED_LUS) * 100));
  const allMinimumsMet = [1, 2, 3, 4, 5].every(
    (lu) => (stats.officialPasses[lu] || 0) >= LU_MIN_TARGETS[lu]
  );
  const totalTargetMet = totalOfficial >= TOTAL_REQUIRED_LUS;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Page Title & Actions */}
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

      {/* Non-Blocking Warnings Banner */}
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
          peerDate={peerDate}
          setPeerDate={setPeerDate}
          peerName={peerName}
          setPeerName={setPeerName}
          peerDesc={peerDesc}
          setPeerDesc={setPeerDesc}
          peerLinks={peerLinks}
          setPeerLinks={setPeerLinks}
          savingPeer={savingPeer}
          onClose={() => setIsPeerModalOpen(false)}
          onSubmit={handleAddPeerHelp}
        />
      )}

      {isSprintModalOpen && (
        <SprintCreateModal
          sprintNumber={sprintNumber}
          setSprintNumber={setSprintNumber}
          sprintName={sprintName}
          setSprintName={setSprintName}
          startDate={startDate}
          setStartDate={setStartDate}
          durationDays={durationDays}
          setDurationDays={setDurationDays}
          calculatedDates={calculatedDates}
          savingSprint={savingSprint}
          onClose={() => setIsSprintModalOpen(false)}
          onSubmit={handleSaveSprint}
        />
      )}
    </div>
  );
}
