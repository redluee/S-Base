"use client";

import { CheckSquare, Square, Save } from "lucide-react";
import { t } from "@/lib/lang";
import { getLUShortDesc } from "@/lib/minor-constants";
import type { useSprintData } from "./use-sprint-data";

interface ReflectionTabProps {
  data: ReturnType<typeof useSprintData>;
}

export function ReflectionTab({ data }: ReflectionTabProps) {
  const { teacherAssessments, setTeacherAssessments, refDate, setRefDate, whatLearned, setWhatLearned, whatRetained, setWhatRetained, whatChange, setWhatChange, savingReflection, refSaveSuccess, handleSaveReflection } = data;
  return (
    <>
      <form onSubmit={handleSaveReflection} className="p-6 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              {t("Sprintreflectie")}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {t("Beantwoord de drie vaste reflectievragen na afloop van de Show & Grow sessie.")}
            </p>
          </div>

          <button
            type="submit"
            disabled={savingReflection}
            title={savingReflection ? t("Opslaan...") : refSaveSuccess ? t("Opgeslagen!") : t("Reflectie opslaan")}
            aria-label={t("Reflectie opslaan")}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold bg-brand text-zinc-950 hover:bg-brand-hover transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="size-3.5" />
            <span className="hidden sm:inline">{savingReflection ? t("Opslaan...") : refSaveSuccess ? t("Opgeslagen!") : t("Reflectie opslaan")}</span>
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div className="max-w-xs">
            <label className="block text-zinc-400 mb-1">{t("Datum van reflectie")}</label>
            <input
              type="date"
              value={refDate}
              onChange={(e) => setRefDate(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-zinc-300 font-bold">
              1. {t("Wat heb je geleerd?")}
            </label>
            <textarea
              rows={3}
              value={whatLearned}
              onChange={(e) => setWhatLearned(e.target.value)}
              placeholder="Nieuwe technieken, methodieken, inzichten of feedback..."
              className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-brand"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-zinc-300 font-bold">
              2. {t("Wat behoud je?")}
            </label>
            <textarea
              rows={3}
              value={whatRetained}
              onChange={(e) => setWhatRetained(e.target.value)}
              placeholder="Werkwijzen, structuur of routines die goed werkten..."
              className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-brand"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-zinc-300 font-bold">
              3. {t("Wat ga je anders doen?")}
            </label>
            <textarea
              rows={3}
              value={whatChange}
              onChange={(e) => setWhatChange(e.target.value)}
              placeholder="Aanpassingen in planning, communicatie of voorbereiding voor de volgende sprint..."
              className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-brand"
            />
          </div>

          {/* Docentbeoordeling per leeruitkomst (Voldoende behaald) */}
          <div className="pt-3 border-t border-white/10 space-y-2.5">
            <div>
              <label className="block text-zinc-200 font-bold text-xs">
                {t("Docentbeoordeling leeruitkomsten (Voldoende behaald)")}
              </label>
              <p className="text-[11px] text-zinc-400">
                {t("Vink per leeruitkomst aan of je hiervoor een voldoende hebt gekregen van de docent. Pas als dit is aangevinkt telt het mee als officieel behaald op het dashboard.")}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
              {[1, 2, 3, 4, 5].map((luNum) => {
                const assessItem = teacherAssessments.find((a) => a.learningOutcome === luNum);
                const isPassed = assessItem?.assessment === "V";
                return (
                  <button
                    key={luNum}
                    type="button"
                    onClick={() => {
                      const newAssess = isPassed ? "-" : "V";
                      setTeacherAssessments((prev) =>
                        prev.map((item) =>
                          item.learningOutcome === luNum ? { ...item, assessment: newAssess } : item
                        )
                      );
                    }}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isPassed
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : "bg-zinc-950/60 border-white/5 text-zinc-400 hover:border-white/15"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isPassed ? (
                        <CheckSquare className="size-4 text-emerald-400" />
                      ) : (
                        <Square className="size-4 text-zinc-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold flex items-center gap-1.5">
                        <span>LU {luNum}: {getLUShortDesc(luNum)}</span>
                        {isPassed && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                            V
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
                        {isPassed ? t("Voldoende toegekend door docent") : t("Nog niet als voldoende gemarkeerd")}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </form>
    </>
  );
}
