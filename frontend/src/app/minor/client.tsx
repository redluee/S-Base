"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  AlertTriangle,
  Layers,
  ArrowRight,
  Plus,
  Users,
  CheckCircle2,
  TrendingUp,
  Upload,
  ExternalLink,
  GraduationCap,
  Check,
  Sparkles,
} from "lucide-react";
import { t } from "@/lib/lang";
import { api, type MinorDashboardStats, type MinorSprint } from "@/lib/api";

const TOTAL_REQUIRED_LUS = 24;

const LU_MIN_TARGETS: Record<number, number> = {
  1: 2,
  2: 4,
  3: 2,
  4: 4,
  5: 6,
};

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
  const [sprintStatus, setSprintStatus] = useState<"planned" | "active" | "completed" | "archived">("active");
  const [calculatedDates, setCalculatedDates] = useState<{
    startDate: string;
    endDate: string;
    durationDays: number;
    extendedDays: number;
    extensionReason: string | null;
    showAndGrowDate: string;
  } | null>(null);
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
    setSprintStatus("active");
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
        status: sprintStatus,
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
        <div className="flex items-center gap-2.5">
          <Link
            href="/minor/sprints"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 transition-all cursor-pointer"
          >
            <Layers className="size-3.5" />
            <span>{t("Alle sprints bekijken")}</span>
          </Link>
          <Link
            href="/minor/export"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-brand text-zinc-950 hover:bg-brand-hover hover:shadow-[0_0_1.5rem_rgba(0,227,164,0.3)] transition-all cursor-pointer"
          >
            <Upload className="size-3.5" />
            <span>{t("Exporteer Portfolio")}</span>
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

      {/* Hero: Active Sprint & Show & Grow Countdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-gradient-to-br from-emerald-950/30 via-zinc-900/90 to-zinc-900/60 border border-emerald-500/20 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-brand bg-brand/10 border border-brand/20 px-2.5 py-1 rounded-full">
                {t("Actieve Sprint")}
              </span>
              {activeSprint && (
                <span className="text-xs text-zinc-400 font-mono">
                  {activeSprint.startDate} → {activeSprint.endDate}
                </span>
              )}
            </div>

            {activeSprint ? (
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
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
            ) : (
              <div>
                <h2 className="text-xl font-semibold text-zinc-300">
                  {t("Geen actieve sprint gevonden")}
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  {t("Maak je eerste sprint aan om je planning en Show & Grow cyclus te starten.")}
                </p>
              </div>
            )}
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

            {activeSprint && (
              <Link
                href={`/minor/sprints/${activeSprint.id}`}
                className="flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand-hover hover:underline cursor-pointer"
              >
                <span>{t("Sprintplanning openen")}</span>
                <ArrowRight className="size-3.5" />
              </Link>
            )}
          </div>
        </div>

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
            </div>
          </div>
        </div>
      </div>

      {/* Learning Outcomes Progress & Targets */}
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
                <span>{t("Officieel toegekend")}: {totalOfficial}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-brand/30 inline-block" />
                <span>{t("Verwacht inclusief actief")}: {totalProjected}</span>
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

                return (
                  <div
                    key={luNum}
                    className={`px-3 py-2 rounded-xl border text-xs flex items-center justify-between ${
                      isMet
                        ? "bg-brand/10 border-brand/30 text-brand"
                        : isProjectedMet
                        ? "bg-zinc-950/60 border-emerald-500/20 text-zinc-300"
                        : "bg-zinc-950/40 border-white/5 text-zinc-400"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {isMet ? (
                        <Check className="size-3.5 text-brand shrink-0" />
                      ) : (
                        <span className="size-1.5 rounded-full bg-zinc-600 shrink-0" />
                      )}
                      <span className="font-semibold font-mono">LU {luNum}</span>
                    </div>
                    <div className="font-mono text-[11px]">
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

      {/* Sprints Overview & Recent Peer Help */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sprints List (2 cols) */}
        <section className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight">
              {t("Sprintoverzicht")}
            </h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={openCreateSprintModal}
                className="text-xs text-zinc-300 hover:text-brand flex items-center gap-1 font-semibold transition-colors cursor-pointer"
              >
                <Plus className="size-3.5" />
                <span>{t("Sprint toevoegen")}</span>
              </button>
              <span className="text-zinc-600 text-xs">·</span>
              <Link
                href="/minor/sprints"
                className="text-xs text-brand hover:underline flex items-center gap-1 font-semibold"
              >
                <span>{t("Beheer sprints")}</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>

          <div className="space-y-2">
            {sprints.length === 0 ? (
              <div className="p-8 rounded-xl bg-zinc-900/50 border border-white/10 text-center text-zinc-400 text-xs">
                {t("Nog geen sprints aangemaakt. Maak je eerste sprint aan.")}
              </div>
            ) : (
              sprints.slice(-3).map((s) => (
                <Link
                  key={s.id}
                  href={`/minor/sprints/${s.id}`}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-900/70 hover:bg-zinc-900 border border-white/10 hover:border-brand/40 transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-8 h-8 px-2 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center text-xs font-mono font-bold text-zinc-300 group-hover:text-brand transition-colors shrink-0 whitespace-nowrap">
                      {s.sprintNumber}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-semibold text-white group-hover:text-brand transition-colors truncate">
                        {s.name}
                      </h3>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {s.startDate} t/m {s.endDate} · Show & Grow: {s.showAndGrowDate}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.extendedDays > 0 && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hidden sm:inline">
                        +{s.extendedDays}d
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                        s.status === "active"
                          ? "bg-brand/10 text-brand border border-brand/20"
                          : s.status === "completed"
                          ? "bg-zinc-800 text-zinc-400"
                          : "bg-zinc-800 text-zinc-300"
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Peer Help Highlights (1 col) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Users className="size-4 text-purple-400" />
              <span>{t("Kennisdeling")}</span>
            </h2>
            <Link
              href="/minor/peer-help"
              className="text-xs text-purple-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <span>{t("Alles bekijken")}</span>
              <ArrowRight className="size-3" />
            </Link>
          </div>

          <button
            onClick={() => setIsPeerModalOpen(true)}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-white/10 transition-all cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>{t("Kennisdeling loggen")}</span>
          </button>

          <div className="space-y-2">
            {stats.recentPeerHelp.length === 0 ? (
              <div className="p-6 rounded-xl bg-zinc-900/50 border border-white/10 text-center text-zinc-400 text-xs">
                {t("Geen kennisdeling geregistreerd.")}
              </div>
            ) : (
              stats.recentPeerHelp.map((peer) => (
                <div key={peer.id} className="p-3 rounded-xl bg-zinc-900/70 border border-white/10 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{peer.peerName}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">{peer.date}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-2">{peer.description}</p>
                  {peer.links && (
                    <a
                      href={peer.links}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-sky-400 hover:underline pt-0.5"
                    >
                      <ExternalLink className="size-2.5" />
                      <span>{t("Link naar bewijs")}</span>
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Modal: Quick Add Peer Help */}
      {isPeerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="size-4 text-purple-400" />
                <span>{t("Kennisdeling Registreren")}</span>
              </h3>
              <button
                onClick={() => setIsPeerModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPeerHelp} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">{t("Datum")}</label>
                <input
                  type="date"
                  value={peerDate}
                  onChange={(e) => setPeerDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">{t("Naam medestudent")}</label>
                <input
                  type="text"
                  placeholder="bijv. Lisa van Dijk"
                  value={peerName}
                  onChange={(e) => setPeerName(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">{t("Toelichting geboden hulp")}</label>
                <textarea
                  rows={3}
                  placeholder="Wat heb je uitgelegd, gereviewed of opgelost?"
                  value={peerDesc}
                  onChange={(e) => setPeerDesc(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">{t("Links naar documentatie/code (optioneel)")}</label>
                <input
                  type="url"
                  placeholder="https://github.com/..."
                  value={peerLinks}
                  onChange={(e) => setPeerLinks(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPeerModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-zinc-400 hover:text-white text-xs cursor-pointer"
                >
                  {t("Annuleren")}
                </button>
                <button
                  type="submit"
                  disabled={savingPeer}
                  className="px-4 py-2 rounded-lg bg-brand text-zinc-950 font-semibold text-xs hover:bg-brand-hover transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingPeer ? t("Opslaan...") : t("Opslaan")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Sprint Modal */}
      {isSprintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="size-4 text-brand" />
                <span>{t("Nieuwe Sprint Aanmaken")}</span>
              </h2>
              <button
                onClick={() => setIsSprintModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSprint} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">{t("Sprintnummer")}</label>
                  <input
                    type="text"
                    placeholder="bijv. 1 of 2b"
                    value={sprintNumber}
                    onChange={(e) => setSprintNumber(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-brand"
                    required
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">{t("Sprintnaam")}</label>
                  <input
                    type="text"
                    placeholder="bijv. Sprint 1"
                    value={sprintName}
                    onChange={(e) => setSprintName(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">{t("Startdatum")}</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
                    required
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">{t("Sprintlengte (dagen)")}</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-brand"
                    required
                  />
                </div>
              </div>

              {/* Real-time Calculation Summary Box */}
              {calculatedDates && (
                <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-white/10 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-zinc-300">
                    <span className="text-zinc-500">{t("Berekende Einddatum")}:</span>
                    <strong className="text-white font-mono">{calculatedDates.endDate}</strong>
                  </div>
                  <div className="flex justify-between items-center text-zinc-300">
                    <span className="text-zinc-500">{t("Show & Grow Datum (woensdag)")}:</span>
                    <strong className="text-brand font-mono">{calculatedDates.showAndGrowDate}</strong>
                  </div>
                  {calculatedDates.extendedDays > 0 && (
                    <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] pt-1 border-t border-white/5">
                      <Calendar className="size-3 shrink-0" />
                      <span>
                        {t("Verlengd met {days} vakantiedagen", { days: String(calculatedDates.extendedDays) })} ({calculatedDates.extensionReason})
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-zinc-400 mb-1">{t("Status")}</label>
                <select
                  value={sprintStatus}
                  onChange={(e) => setSprintStatus(e.target.value as "planned" | "active" | "completed" | "archived")}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand cursor-pointer"
                >
                  <option value="active">{t("Actief")}</option>
                  <option value="planned">{t("Gepland")}</option>
                  <option value="completed">{t("Voltooid")}</option>
                  <option value="archived">{t("Gearchiveerd")}</option>
                </select>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSprintModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-zinc-400 hover:text-white text-xs cursor-pointer"
                >
                  {t("Annuleren")}
                </button>
                <button
                  type="submit"
                  disabled={savingSprint}
                  className="px-4 py-2 rounded-lg bg-brand text-zinc-950 font-semibold text-xs hover:bg-brand-hover transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingSprint ? t("Opslaan...") : t("Opslaan")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
