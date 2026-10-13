"use client";

import { Calendar, X } from "lucide-react";
import { t } from "@/lib/lang";
import type { MinorVacation } from "@/lib/api";
import { ModalOverlay } from "@/components/ui/modal-overlay";

interface VacationModalProps {
  editingVac: MinorVacation | null;
  vacName: string;
  setVacName: (v: string) => void;
  vacStart: string;
  setVacStart: (v: string) => void;
  vacEnd: string;
  setVacEnd: (v: string) => void;
  savingVac: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onDelete: (id: number) => void;
}

export function VacationModal({
  editingVac,
  vacName,
  setVacName,
  vacStart,
  setVacStart,
  vacEnd,
  setVacEnd,
  savingVac,
  onClose,
  onSubmit,
  onDelete,
}: VacationModalProps) {
  return (
  <ModalOverlay
    open
    onClose={() => onClose()}
    label={editingVac ? t("Vakantie bewerken") : t("Vakantie toevoegen")}
    className="p-3 sm:p-4 overflow-y-auto"
  >
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 max-w-md w-full space-y-4 shadow-2xl my-4 sm:my-8 max-h-[calc(100dvh-2rem)] overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Calendar className="size-4 text-brand" />
          <span>{editingVac ? t("Vakantie bewerken") : t("Vakantie toevoegen")}</span>
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

      <form onSubmit={onSubmit} className="space-y-3.5 text-xs">
        <div>
          <label className="block text-zinc-400 mb-1">{t("Vakantienaam")}</label>
          <input
            type="text"
            placeholder="bijv. Herfstvakantie / Kerstvakantie"
            value={vacName}
            onChange={(e) => setVacName(e.target.value)}
            className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-zinc-400 mb-1">{t("Startdatum")}</label>
            <input
              type="date"
              value={vacStart}
              onChange={(e) => setVacStart(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
              required
            />
          </div>
          <div>
            <label className="block text-zinc-400 mb-1">{t("Einddatum")}</label>
            <input
              type="date"
              value={vacEnd}
              onChange={(e) => setVacEnd(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
              required
            />
          </div>
        </div>

        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
          {editingVac ? (
            <button
              type="button"
              onClick={() => onDelete(editingVac.id)}
              className="text-red-400 hover:underline cursor-pointer"
            >
              {t("Verwijderen")}
            </button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onClose()}
              className="px-3.5 py-2 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
            >
              {t("Annuleren")}
            </button>
            <button
              type="submit"
              disabled={savingVac}
              className="px-4 py-2 rounded-lg bg-brand text-zinc-950 font-semibold hover:bg-brand-hover transition-all cursor-pointer disabled:opacity-50"
            >
              {savingVac ? t("Opslaan...") : t("Opslaan")}
            </button>
          </div>
        </div>
      </form>
    </div>
  </ModalOverlay>
  );
}
