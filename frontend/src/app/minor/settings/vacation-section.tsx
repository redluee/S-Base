"use client";

import { Calendar, Plus, Trash2, Edit2 } from "lucide-react";
import { t } from "@/lib/lang";
import type { MinorVacation } from "@/lib/api";

interface VacationSectionProps {
  vacations: MinorVacation[];
  onCreate: () => void;
  onEdit: (v: MinorVacation) => void;
  onDelete: (id: number) => void;
}

export function VacationSection({ vacations, onCreate, onEdit, onDelete }: VacationSectionProps) {
  return (
    <>
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Calendar className="size-5 text-brand" />
          <h2 className="text-lg font-bold text-white tracking-tight">
            {t("Vakantiebeheer & Automatische Verlenging")}
          </h2>
        </div>
        <button
          onClick={onCreate}
          title={t("Vakantie toevoegen")}
          aria-label={t("Vakantie toevoegen")}
          className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-lg text-xs font-semibold bg-brand text-zinc-950 hover:bg-brand-hover transition-all cursor-pointer"
        >
          <Plus className="size-3.5" />
          <span className="hidden sm:inline">{t("Vakantie toevoegen")}</span>
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/60 overflow-hidden text-xs">
        {/* Mobile Cards */}
        <div className="block sm:hidden divide-y divide-white/5">
          {vacations.length === 0 ? (
            <div className="py-8 text-center text-zinc-500 italic">
              {t("Geen vakanties geregistreerd.")}
            </div>
          ) : (
            vacations.map((v) => (
              <div key={v.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white text-sm">{v.name}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEdit(v)}
                      className="text-zinc-400 hover:text-white p-1.5 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
                      title={t("Bewerken")}
                      aria-label={t("Bewerken")}
                    >
                      <Edit2 className="size-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(v.id)}
                      className="text-zinc-500 hover:text-red-400 p-1.5 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
                      title={t("Verwijderen")}
                      aria-label={t("Verwijderen")}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
                <div className="text-zinc-400 font-mono text-[11px]">
                  {v.startDate} → {v.endDate}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-zinc-950/80 text-zinc-400 font-semibold">
                <th className="py-3 px-4">{t("Vakantienaam")}</th>
                <th className="py-3 px-4 w-36">{t("Startdatum")}</th>
                <th className="py-3 px-4 w-36">{t("Einddatum")}</th>
                <th className="py-3 px-4 w-20 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {vacations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-zinc-500 italic">
                    {t("Geen vakanties geregistreerd.")}
                  </td>
                </tr>
              ) : (
                vacations.map((v) => (
                  <tr key={v.id} className="hover:bg-zinc-900/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white">{v.name}</td>
                    <td className="py-3.5 px-4 font-mono text-zinc-300">{v.startDate}</td>
                    <td className="py-3.5 px-4 font-mono text-zinc-300">{v.endDate}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onEdit(v)}
                          className="text-zinc-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
                          title={t("Bewerken")}
                          aria-label={t("Bewerken")}
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(v.id)}
                          className="text-zinc-500 hover:text-red-400 p-1 rounded transition-colors cursor-pointer"
                          title={t("Verwijderen")}
                          aria-label={t("Verwijderen")}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
    </>
  );
}
