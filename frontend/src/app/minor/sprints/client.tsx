"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Calendar,
  Layers,
  Clock,
  ChevronRight,
  Trash2,
  Edit2,
  Sparkles,
} from "lucide-react";
import { t } from "@/lib/lang";
import { api, type MinorSprint } from "@/lib/api";

interface MinorSprintsClientProps {
  initialSprints: MinorSprint[];
}

export function MinorSprintsClient({ initialSprints }: MinorSprintsClientProps) {
  const [sprints, setSprints] = useState<MinorSprint[]>(initialSprints);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<MinorSprint | null>(null);

  // Form state
  const [sprintNumber, setSprintNumber] = useState("");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [durationDays, setDurationDays] = useState(14);
  const [calculatedDates, setCalculatedDates] = useState<{
    endDate: string;
    showAndGrowDate: string;
    extendedDays: number;
    extensionReason: string | null;
  } | null>(null);
  const [status, setStatus] = useState<"planned" | "active" | "completed" | "archived">("active");
  const [saving, setSaving] = useState(false);

  // Load next sprint number suggestion when opening new sprint modal
  useEffect(() => {
    if (isModalOpen && !editingSprint) {
      api.minor.sprints.nextNumber().then((res) => {
        setSprintNumber(res.nextNumber);
        setName(res.nextName);
      }).catch(() => {});
    }
  }, [isModalOpen, editingSprint]);

  // Recalculate dates whenever startDate or durationDays changes
  useEffect(() => {
    if (!startDate) return;
    api.minor.sprints.calculateDates(startDate, durationDays).then((res) => {
      setCalculatedDates({
        endDate: res.endDate,
        showAndGrowDate: res.showAndGrowDate,
        extendedDays: res.extendedDays,
        extensionReason: res.extensionReason,
      });
    }).catch(() => {});
  }, [startDate, durationDays]);

  function openCreateModal() {
    setEditingSprint(null);
    setStartDate(new Date().toISOString().slice(0, 10));
    setDurationDays(14);
    setStatus("active");
    setIsModalOpen(true);
  }

  function openEditModal(sprint: MinorSprint) {
    setEditingSprint(sprint);
    setSprintNumber(sprint.sprintNumber);
    setName(sprint.name);
    setStartDate(sprint.startDate);
    setDurationDays(sprint.durationDays);
    setStatus(sprint.status);
    setCalculatedDates({
      endDate: sprint.endDate,
      showAndGrowDate: sprint.showAndGrowDate,
      extendedDays: sprint.extendedDays,
      extensionReason: sprint.extensionReason,
    });
    setIsModalOpen(true);
  }

  async function handleSaveSprint(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate) return;
    setSaving(true);
    try {
      if (editingSprint) {
        const updated = await api.minor.sprints.update(editingSprint.id, {
          sprintNumber,
          name,
          startDate,
          durationDays,
          status,
        });
        setSprints((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      } else {
        const created = await api.minor.sprints.create({
          sprintNumber,
          name,
          startDate,
          durationDays,
          status,
        });
        setSprints((prev) => [...prev, created]);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Failed to save sprint:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSprint(id: number) {
    if (!confirm(t("Weet je zeker dat je deze sprint en alle bijbehorende stories wilt verwijderen?"))) {
      return;
    }
    try {
      await api.minor.sprints.delete(id);
      setSprints((prev) => prev.filter((s) => s.id !== id));
      setIsModalOpen(false);
    } catch (err) {
      console.error("Failed to delete sprint:", err);
    }
  }

  const filteredSprints = sprints.filter((s) => {
    if (statusFilter === "all") return true;
    return s.status === statusFilter;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl text-white tracking-tight">
            {t("Sprintbeheer")}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            {t("Beheer je sprints, Show & Grow data en automatische vakantieverlengingen.")}
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-brand text-zinc-950 hover:bg-brand-hover hover:shadow-[0_0_1.5rem_rgba(0,227,164,0.3)] transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="size-4" />
          <span>{t("Nieuwe Sprint")}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        {[
          { id: "all", label: "Alle" },
          { id: "active", label: "Actief" },
          { id: "planned", label: "Gepland" },
          { id: "completed", label: "Voltooid" },
          { id: "archived", label: "Gearchiveerd" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === tab.id
                ? "bg-brand/15 text-brand border border-brand/30"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
            }`}
          >
            {t(tab.label)}
          </button>
        ))}
      </div>

      {/* Sprints List */}
      <div className="space-y-3">
        {filteredSprints.length === 0 ? (
          <div className="p-12 rounded-2xl bg-zinc-900/40 border border-white/10 text-center text-zinc-400 text-xs space-y-3">
            <Layers className="size-8 text-zinc-600 mx-auto" />
            <p>{t("Geen sprints gevonden voor dit filter.")}</p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all cursor-pointer"
            >
              {t("Maak een nieuwe sprint aan")}
            </button>
          </div>
        ) : (
          filteredSprints.map((s) => (
            <div
              key={s.id}
              className="p-4 sm:p-5 rounded-2xl bg-zinc-900/80 border border-white/10 hover:border-brand/40 hover:bg-zinc-900 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group relative"
            >
              <Link
                href={`/minor/sprints/${s.id}`}
                className="absolute inset-0 z-0 rounded-2xl"
                aria-label={s.name}
              />

              <div className="flex items-center gap-3.5 min-w-0 z-10 pointer-events-none">
                <div className="min-w-10 h-10 px-2.5 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center font-mono font-bold text-xs text-white shrink-0 whitespace-nowrap">
                  {s.sprintNumber}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white group-hover:text-brand transition-colors truncate">
                      {s.name}
                    </h2>
                    <span
                      className={`text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded shrink-0 ${
                        s.status === "active"
                          ? "bg-brand/10 text-brand border border-brand/20"
                          : s.status === "completed"
                          ? "bg-zinc-800 text-zinc-400 border border-white/5"
                          : "bg-zinc-800 text-zinc-300 border border-white/5"
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-400 font-mono block truncate mt-0.5">
                    {s.startDate} → {s.endDate}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-6 text-xs text-zinc-300 z-10">
                <div className="flex items-center gap-1.5 text-zinc-400 pointer-events-none">
                  <Clock className="size-3.5 text-brand shrink-0" />
                  <span>
                    {t("Show & Grow")}: <strong className="text-white">{s.showAndGrowDate}</strong>
                  </span>
                </div>

                {s.extendedDays > 0 && (
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs pointer-events-none">
                    <Calendar className="size-3.5 shrink-0" />
                    <span>
                      +{s.extendedDays}d ({s.extensionReason})
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 ml-auto sm:ml-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openEditModal(s);
                    }}
                    className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
                    title={t("Bewerken")}
                  >
                    <Edit2 className="size-4" />
                  </button>
                  <div className="text-zinc-500 group-hover:text-brand group-hover:translate-x-0.5 transition-all pointer-events-none">
                    <ChevronRight className="size-5" />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Sprint Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="size-4 text-brand" />
                <span>{editingSprint ? t("Sprint Bewerken") : t("Nieuwe Sprint Aanmaken")}</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
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
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "planned" | "active" | "completed" | "archived")}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand cursor-pointer"
                >
                  <option value="active">{t("Actief")}</option>
                  <option value="planned">{t("Gepland")}</option>
                  <option value="completed">{t("Voltooid")}</option>
                  <option value="archived">{t("Gearchiveerd")}</option>
                </select>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                {editingSprint ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteSprint(editingSprint.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors text-xs font-medium cursor-pointer"
                  >
                    <Trash2 className="size-3.5" />
                    <span>{t("Verwijderen")}</span>
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3.5 py-2 rounded-lg text-zinc-400 hover:text-white text-xs cursor-pointer"
                  >
                    {t("Annuleren")}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-brand text-zinc-950 font-semibold text-xs hover:bg-brand-hover transition-all cursor-pointer disabled:opacity-50"
                  >
                    {saving ? t("Opslaan...") : t("Opslaan")}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
