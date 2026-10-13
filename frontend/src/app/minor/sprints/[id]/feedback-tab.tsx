"use client";

import { Plus, Trash2 } from "lucide-react";
import { t } from "@/lib/lang";
import type { useSprintData } from "./use-sprint-data";

interface FeedbackTabProps {
  data: ReturnType<typeof useSprintData>;
}

export function FeedbackTab({ data }: FeedbackTabProps) {
  const { sprint, fbDate, setFbDate, fbFromWhom, setFbFromWhom, fbText, setFbText, fbAction, setFbAction, addingFeedback, handleAddFeedback, handleDeleteFeedback } = data;
  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              {t("Show & Grow Feedbackregels")}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {t("Registreer ontvangen feedback van docenten en peers met jouw concrete actiepunten.")}
            </p>
          </div>
        </div>

        {/* Feedback Form */}
        <form onSubmit={handleAddFeedback} className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-3">
          <h3 className="text-xs font-bold text-zinc-200">{t("Feedbackregel toevoegen")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-zinc-400 mb-1">{t("Datum")}</label>
              <input
                type="date"
                value={fbDate}
                onChange={(e) => setFbDate(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
                required
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">{t("Van wie")}</label>
              <input
                type="text"
                placeholder="bijv. Docent Jan / Peer Lisa"
                value={fbFromWhom}
                onChange={(e) => setFbFromWhom(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
                required
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">{t("Feedback")}</label>
              <input
                type="text"
                placeholder="Wat was de opmerking?"
                value={fbText}
                onChange={(e) => setFbText(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
                required
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">{t("Jouw actie")}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Wat ga je hiermee doen?"
                  value={fbAction}
                  onChange={(e) => setFbAction(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
                  required
                />
                <button
                  type="submit"
                  disabled={addingFeedback}
                  className="px-3.5 py-2 rounded-lg bg-brand text-zinc-950 font-semibold text-xs hover:bg-brand-hover transition-all shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Feedback List (Responsive Cards for mobile, Table for desktop) */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 overflow-hidden text-xs">
          {/* Mobile Cards */}
          <div className="block sm:hidden divide-y divide-white/5">
            {sprint.feedback.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 italic">
                {t("Geen feedbackregels ingevuld.")}
              </div>
            ) : (
              sprint.feedback.map((fb) => (
                <div key={fb.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{fb.fromWhom}</span>
                      <span className="font-mono text-zinc-400 text-[11px]">{fb.date}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteFeedback(fb.id)}
                      className="text-zinc-500 hover:text-red-400 p-1.5 rounded transition-colors cursor-pointer"
                      title={t("Verwijderen")}
                      aria-label={t("Verwijderen")}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    <div className="text-zinc-300">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 block">{t("Feedback")}</span>
                      <p>{fb.feedback}</p>
                    </div>
                    <div className="text-zinc-200">
                      <span className="text-[10px] uppercase font-bold text-brand block">{t("Jouw actie")}</span>
                      <p>{fb.action}</p>
                    </div>
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
                  <th className="py-3 px-4 w-28">{t("Datum")}</th>
                  <th className="py-3 px-4 w-40">{t("Van wie")}</th>
                  <th className="py-3 px-4">{t("Feedback")}</th>
                  <th className="py-3 px-4">{t("Jouw actie")}</th>
                  <th className="py-3 px-4 w-12 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sprint.feedback.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-500 italic">
                      {t("Geen feedbackregels ingevuld.")}
                    </td>
                  </tr>
                ) : (
                  sprint.feedback.map((fb) => (
                    <tr key={fb.id} className="hover:bg-zinc-900/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-zinc-400">{fb.date}</td>
                      <td className="py-3 px-4 font-semibold text-white">{fb.fromWhom}</td>
                      <td className="py-3 px-4 text-zinc-300">{fb.feedback}</td>
                      <td className="py-3 px-4 text-zinc-300">{fb.action}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteFeedback(fb.id)}
                          className="text-zinc-500 hover:text-red-400 p-1 rounded transition-colors cursor-pointer"
                          title={t("Verwijderen")}
                          aria-label={t("Verwijderen")}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
