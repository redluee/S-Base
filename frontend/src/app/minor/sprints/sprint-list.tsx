"use client";

import { Calendar, Layers, Clock, ChevronRight, Edit2, Presentation, Check, Copy } from "lucide-react";
import Link from "next/link";
import { t } from "@/lib/lang";
import type { MinorSprint } from "@/lib/api";

interface SprintListProps {
  filteredSprints: MinorSprint[];
  copiedSprintId: number | null;
  openCreateModal: () => void;
  openEditModal: (sprint: MinorSprint) => void;
  handleExportSprint: (sprint: MinorSprint) => void;
}

export function SprintList({ filteredSprints, copiedSprintId, openCreateModal, openEditModal, handleExportSprint }: SprintListProps) {
  return (
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
            className="p-4 sm:p-5 rounded-2xl bg-zinc-900/80 border border-white/10 hover:border-brand/40 hover:bg-zinc-900 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 group relative"
          >
            <Link
              href={`/minor/sprints/${s.id}`}
              className="absolute inset-0 z-0 rounded-2xl"
              aria-label={s.name}
            />

            <div className="flex items-center gap-3.5 min-w-0 flex-1 z-10 pointer-events-none">
              <div className="min-w-10 h-10 px-2.5 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center font-mono font-bold text-xs text-white shrink-0 whitespace-nowrap">
                {s.sprintNumber}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
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

            <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 text-xs text-zinc-300 z-10 pt-2.5 sm:pt-0 border-t border-white/5 sm:border-0 w-full sm:w-auto">
              <div className="flex items-center gap-3 text-zinc-400 pointer-events-none flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-brand shrink-0" />
                  <span>
                    {t("Show & Grow")}: <strong className="text-white">{s.showAndGrowDate}</strong>
                  </span>
                </div>

                {s.extendedDays > 0 && (
                  <div className="flex items-center gap-1 text-emerald-400 text-xs">
                    <Calendar className="size-3.5 shrink-0" />
                    <span>+{s.extendedDays}d</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 ml-auto sm:ml-0 shrink-0">
                <Link
                  href={`/minor/sprints/${s.id}/present`}
                  onClick={(e) => e.stopPropagation()}
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-brand/10 text-brand border border-brand/20 hover:bg-brand hover:text-zinc-950 transition-all cursor-pointer"
                  title={t("Start Show & Tell presentatie")}
                  aria-label={t("Presentatie")}
                >
                  <Presentation className="size-3.5" />
                  <span>{t("Presentatie")}</span>
                </Link>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleExportSprint(s);
                  }}
                  className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
                  title={copiedSprintId === s.id ? t("Gekopieerd naar klembord!") : t("Sprint kopiëren naar klembord")}
                  aria-label={t("Sprint kopiëren naar klembord")}
                >
                  {copiedSprintId === s.id ? (
                    <Check className="size-4 text-brand" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openEditModal(s);
                  }}
                  className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
                  title={t("Bewerken")}
                  aria-label={t("Bewerken")}
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
  );
}
