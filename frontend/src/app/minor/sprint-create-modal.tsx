"use client";

import { Calendar, Sparkles, X } from "lucide-react";
import { t } from "@/lib/lang";
import { ModalOverlay } from "@/components/ui/modal-overlay";

export type CalculatedDates = {
    startDate: string;
    endDate: string;
    durationDays: number;
    extendedDays: number;
    extensionReason: string | null;
    showAndGrowDate: string;
  } | null;

interface SprintCreateModalProps {
  sprintNumber: string;
  setSprintNumber: (v: string) => void;
  sprintName: string;
  setSprintName: (v: string) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  durationDays: number;
  setDurationDays: (v: number) => void;
  calculatedDates: CalculatedDates;
  savingSprint: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function SprintCreateModal({ sprintNumber, setSprintNumber, sprintName, setSprintName, startDate, setStartDate, durationDays, setDurationDays, calculatedDates, savingSprint, onClose, onSubmit }: SprintCreateModalProps) {
  return (
      <ModalOverlay
        open
        onClose={() => onClose()}
        label={t("Nieuwe Sprint Aanmaken")}
        className="p-3 sm:p-4 overflow-y-auto"
      >
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 max-w-lg w-full space-y-4 sm:space-y-5 shadow-2xl my-4 sm:my-8 max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="size-4 text-brand" />
              <span>{t("Nieuwe Sprint Aanmaken")}</span>
            </h2>
            <button
              type="button"
              onClick={() => onClose()}
              className="size-8 flex items-center justify-center rounded-lg border border-white/10 bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-white/20 transition-all cursor-pointer shrink-0"
              title={t("Sluiten")}
              aria-label={t("Sluiten")}
            >
              <X className="size-4" />
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            {calculatedDates && (() => {
              const todayStr = new Date().toISOString().slice(0, 10);
              const computedStatus =
                startDate > todayStr
                  ? "planned"
                  : calculatedDates.endDate < todayStr
                  ? "completed"
                  : "active";

              return (
                <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-white/10 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-zinc-300">
                    <span className="text-zinc-500">{t("Berekende Einddatum")}:</span>
                    <strong className="text-white font-mono">{calculatedDates.endDate}</strong>
                  </div>
                  <div className="flex justify-between items-center text-zinc-300">
                    <span className="text-zinc-500">{t("Show & Grow Datum (woensdag)")}:</span>
                    <strong className="text-brand font-mono">{calculatedDates.showAndGrowDate}</strong>
                  </div>
                  <div className="flex justify-between items-center text-zinc-300 pt-1 border-t border-white/5">
                    <span className="text-zinc-500">{t("Automatische Status")}:</span>
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                        computedStatus === "active"
                          ? "bg-brand/10 text-brand border border-brand/20"
                          : computedStatus === "completed"
                          ? "bg-zinc-800 text-zinc-400 border border-white/5"
                          : "bg-zinc-800 text-zinc-300 border border-white/5"
                      }`}
                    >
                      {computedStatus === "active" ? t("Actief") : computedStatus === "completed" ? t("Voltooid") : t("Gepland")}
                    </span>
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
              );
            })()}

            <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => onClose()}
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
      </ModalOverlay>
  );
}
