"use client";

import { Sparkles, Save, Check } from "lucide-react";
import { toExternalHref } from "@/lib/uri";
import { t } from "@/lib/lang";
import { getLUShortDesc } from "@/lib/minor-constants";
import type { useSprintData } from "./use-sprint-data";

interface SelfEvalTabProps {
  data: ReturnType<typeof useSprintData>;
}

export function SelfEvalTab({ data }: SelfEvalTabProps) {
  const { sprint, selfEvals, setSelfEvals, teacherAssessments, setTeacherAssessments, savingEvals, evalSaveSuccess, handleAutoPopulateEvals, handlePopulateSingleLuEvidence, handleAppendEvidenceToLu, handleSaveEvalsAndAssessments } = data;
  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              {t("Zelfevaluatie & Docentbeoordeling")}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {t("Onderbouw per leeruitkomst je niveau met bewijslast uit voltooide stories.")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoPopulateEvals}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 transition-all cursor-pointer"
              title={t("Automatisch vullen op basis van voltooide stories en bewijslast")}
              aria-label={t("Automatisch invullen")}
            >
              <Sparkles className="size-3.5 text-brand" />
              <span className="hidden sm:inline">{t("Automatisch invullen")}</span>
            </button>

            <button
              onClick={handleSaveEvalsAndAssessments}
              disabled={savingEvals}
              title={savingEvals ? t("Opslaan...") : evalSaveSuccess ? t("Opgeslagen!") : t("Wijzigingen opslaan")}
              aria-label={t("Wijzigingen opslaan")}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold bg-brand text-zinc-950 hover:bg-brand-hover transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="size-3.5" />
              <span className="hidden sm:inline">{savingEvals ? t("Opslaan...") : evalSaveSuccess ? t("Opgeslagen!") : t("Wijzigingen opslaan")}</span>
            </button>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-white/5 flex items-center justify-between text-xs text-zinc-400">
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-brand shrink-0" />
            <span>{t("Per sprint kan de docent per leeruitkomst maximaal 1 voldoende (V) toekennen.")}</span>
          </span>
          {teacherAssessments.some((a) => a.assessment === "V") && (
            <span className="text-[11px] font-mono text-brand font-semibold shrink-0">
              {t("Voldoendes: LU {lus}", {
                lus: teacherAssessments
                  .filter((a) => a.assessment === "V")
                  .map((a) => a.learningOutcome)
                  .sort((a, b) => a - b)
                  .join(", "),
              })}
            </span>
          )}
        </div>

        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((luNum) => {
            const evalItem = selfEvals.find((e) => e.learningOutcome === luNum);
            const assessItem = teacherAssessments.find((a) => a.learningOutcome === luNum);

            const storiesForLu = sprint.stories.filter((s) => Array.isArray(s.learningOutcomes) && s.learningOutcomes.includes(luNum));
            const doneStories = storiesForLu.filter((s) => s.status === "done");
            const isRealized = doneStories.length > 0;

            const luEvidenceList: { storyNumber?: string | null; storyTitle: string; type: string; title: string; url: string }[] = [];
            storiesForLu.forEach((st) => {
              if (st.evidence && st.evidence.length > 0) {
                st.evidence.forEach((ev) => {
                  luEvidenceList.push({
                    storyNumber: st.storyNumber,
                    storyTitle: st.title,
                    type: ev.type,
                    title: ev.title,
                    url: ev.url,
                  });
                });
              }
            });

            return (
              <div
                key={luNum}
                className="p-4 sm:p-5 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-zinc-800 text-brand border border-brand/20">
                      LU {luNum}
                    </span>
                    <h3 className="text-sm font-bold text-white">
                      {t(`Leeruitkomst ${luNum}`)}
                      {getLUShortDesc(luNum) && (
                        <span className="text-zinc-400 font-normal text-xs ml-1 sm:ml-2">
                          ({getLUShortDesc(luNum)})
                        </span>
                      )}
                    </h3>
                    {isRealized && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1">
                        <Check className="size-3" />
                        {t("Gerealiseerd ({count} voltooide {stories})", {
                          count: String(doneStories.length),
                          stories: doneStories.length === 1 ? t("story") : t("stories"),
                        })}
                      </span>
                    )}
                    {assessItem?.assessment === "V" && (
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-brand/10 border border-brand/20 text-brand">
                        {t("Sprint Voldoende")}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 sm:gap-4 text-xs flex-wrap">
                    {/* Self Eval Level */}
                    <div className="flex items-center gap-1.5">
                      <label className="text-zinc-400 font-semibold">{t("Zelf (Niv.)")}:</label>
                      <select
                        value={evalItem?.level ?? "-"}
                        onChange={(e) => {
                          const newLevel = e.target.value as "V" | "NV" | "-";
                          setSelfEvals((prev) =>
                            prev.map((item) =>
                              item.learningOutcome === luNum ? { ...item, level: newLevel } : item
                            )
                          );
                        }}
                        className="bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1 text-white text-xs font-bold focus:outline-none focus:border-brand cursor-pointer"
                      >
                        <option value="V">V (Voldoende)</option>
                        <option value="NV">NV (Niet Voldaan)</option>
                        <option value="-">- (N.v.t.)</option>
                      </select>
                    </div>

                    {/* Official Teacher Assessment */}
                    <div className="flex items-center gap-1.5">
                      <label className="text-zinc-400 font-semibold">{t("Docentoordeel")}:</label>
                      <select
                        value={assessItem?.assessment ?? "-"}
                        onChange={(e) => {
                          const newAssess = e.target.value as "V" | "O" | "-";
                          setTeacherAssessments((prev) =>
                            prev.map((item) =>
                              item.learningOutcome === luNum
                                ? { ...item, assessment: newAssess }
                                : item
                            )
                          );
                        }}
                        className={`bg-zinc-950 border rounded-lg px-2.5 py-1 text-xs font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer ${
                          assessItem?.assessment === "V"
                            ? "border-emerald-500/40 text-emerald-400"
                            : assessItem?.assessment === "O"
                            ? "border-red-500/40 text-red-400"
                            : "border-white/10 text-zinc-300"
                        }`}
                      >
                        <option value="V">V (Voldoende)</option>
                        <option value="O">O (Onvoldoende)</option>
                        <option value="-">- (Geen beoordeling)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Argumentation Textarea */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <label className="text-zinc-300 font-semibold flex items-center gap-1.5">
                      <span>{t("Argumentatie en bewijs")}</span>
                      <span className="text-zinc-500 font-normal text-[11px]">(Excel kolom D)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handlePopulateSingleLuEvidence(luNum)}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px] font-medium border border-white/10 transition-colors cursor-pointer"
                      title={t("Vul aan met verantwoording uit voltooide stories van LU {lu}", { lu: String(luNum) })}
                    >
                      <Sparkles className="size-3 text-brand" />
                      <span>{t("Vul aan uit stories")}</span>
                    </button>
                  </div>

                  <textarea
                    rows={4}
                    value={evalItem?.argumentation || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelfEvals((prev) =>
                        prev.map((item) =>
                          item.learningOutcome === luNum ? { ...item, argumentation: val } : item
                        )
                      );
                    }}
                    onBlur={() => handleSaveEvalsAndAssessments()}
                    placeholder="Beschrijf concrete beroepsproducten, acties en linkjes naar bewijslast voor deze leeruitkomst..."
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-brand"
                  />

                  {/* Attached Story Evidence Pills */}
                  {luEvidenceList.length > 0 && (
                    <div className="pt-1 space-y-1">
                      <span className="text-[11px] text-zinc-400 font-medium block">
                        {t("Gekoppeld bewijsmateriaal uit stories:")}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {luEvidenceList.map((ev, evIdx) => (
                          <div
                            key={evIdx}
                            className="flex items-center gap-1.5 bg-zinc-950/80 border border-white/10 rounded-lg px-2.5 py-1 text-[11px] text-zinc-300"
                          >
                            <span className="font-semibold text-brand">{ev.type}:</span>
                            <a
                              href={toExternalHref(ev.url)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-zinc-200 hover:underline truncate max-w-[160px]"
                              title={ev.url}
                            >
                              {ev.title}
                            </a>
                            <button
                              type="button"
                              onClick={() => handleAppendEvidenceToLu(luNum, ev)}
                              className="ml-1 text-[10px] text-brand hover:text-brand-hover hover:underline cursor-pointer font-medium"
                              title={t("Invoegen in tekst")}
                            >
                              + {t("Invoegen")}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Teacher notes */}
                <div className="space-y-1 text-xs">
                  <label className="block text-zinc-500 font-medium">
                    {t("Notities docent (optioneel)")}:
                  </label>
                  <input
                    type="text"
                    value={assessItem?.notes || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTeacherAssessments((prev) =>
                        prev.map((item) =>
                          item.learningOutcome === luNum ? { ...item, notes: val } : item
                        )
                      );
                    }}
                    placeholder="Eventuele opmerkingen of voorwaarden van de docent..."
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-brand"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
