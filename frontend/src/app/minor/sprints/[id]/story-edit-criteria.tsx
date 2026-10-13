"use client";

import { Plus, CornerDownRight } from "lucide-react";
import { t } from "@/lib/lang";
import type { useStoryEditor } from "./use-story-editor";

interface StoryEditCriteriaProps {
  editor: ReturnType<typeof useStoryEditor>;
}

export function StoryEditCriteria({ editor }: StoryEditCriteriaProps) {
  const { storyTypeCode, acceptanceCriteria, setAcceptanceCriteria, qualityCriteria, setQualityCriteria, focusTarget, setFocusTarget, getDefaultQualityCriteriaForType, addAcceptanceCriterion, addQualityCriterion } = editor;
  return (
        <div className="space-y-4">
          {/* Acceptance criteria */}
          <div className="space-y-3 p-4 sm:p-5 rounded-xl bg-zinc-950 border border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-zinc-100 text-sm">{t("Acceptatiecriteria")}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 font-mono font-medium">
                  {acceptanceCriteria.length}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => addAcceptanceCriterion(0)}
                  className="text-brand hover:underline flex items-center gap-1 text-xs sm:text-sm font-medium cursor-pointer"
                >
                  <Plus className="size-4" />
                  <span>{t("Criterium")}</span>
                </button>
                <span className="text-zinc-700">|</span>
                <button
                  type="button"
                  onClick={() => addAcceptanceCriterion(1)}
                  className="text-brand/80 hover:text-brand hover:underline flex items-center gap-1 text-xs sm:text-sm font-medium cursor-pointer"
                  title={t("Subtaak toevoegen")}
                >
                  <CornerDownRight className="size-3.5" />
                  <span>{t("Subtaak")}</span>
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto overflow-x-hidden pr-2">
              {acceptanceCriteria.length === 0 ? (
                <p className="text-sm text-zinc-500 italic py-1">{t("Geen criteria opgegeven.")}</p>
              ) : (
                acceptanceCriteria.map((c, idx) => {
                  const isSub = (c.indent ?? 0) > 0;
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 ${
                        isSub ? "pl-4 sm:pl-6 border-l-2 border-brand/40 ml-2" : ""
                      }`}
                    >
                      <span className="text-zinc-500 font-mono text-xs w-5 shrink-0 text-center">
                        {isSub ? "↳" : `${idx + 1}.`}
                      </span>
                      <input
                        ref={(el) => {
                          if (focusTarget?.type === "acceptance" && focusTarget.index === idx && el) {
                            el.focus();
                            setFocusTarget(null);
                          }
                        }}
                        type="text"
                        value={c.text}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAcceptanceCriteria((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, text: val } : item))
                          );
                        }}
                        placeholder={isSub ? "Subtaak omschrijving..." : "Criterium omschrijving..."}
                        className="flex-1 min-w-0 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand transition-colors placeholder-zinc-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setAcceptanceCriteria((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, indent: isSub ? 0 : 1 } : item))
                          );
                        }}
                        title={isSub ? t("Terugspringen naar hoofdtaak") : t("Inspringen als subtaak")}
                        className={`p-2 rounded transition-colors cursor-pointer shrink-0 ${
                          isSub
                            ? "text-brand bg-brand/10 hover:bg-brand/20"
                            : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                        }`}
                      >
                        <CornerDownRight className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAcceptanceCriteria((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-zinc-500 hover:text-red-400 p-2 rounded hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                        title={t("Verwijderen")}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quality criteria */}
          <div className="space-y-3 p-4 sm:p-5 rounded-xl bg-zinc-950 border border-white/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-zinc-100 text-sm">{t("Kwaliteitscriteria")}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 font-mono font-medium">
                  {qualityCriteria.length}
                </span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setQualityCriteria(getDefaultQualityCriteriaForType(storyTypeCode))}
                  className="text-xs text-zinc-400 hover:text-brand hover:underline transition-colors cursor-pointer mr-1"
                  title={t("Herlaad de standaard kwaliteitscriteria voor dit story type")}
                >
                  {t("Standaard herladen")}
                </button>
                <button
                  type="button"
                  onClick={() => addQualityCriterion(0)}
                  className="text-brand hover:underline flex items-center gap-1 text-xs sm:text-sm font-medium cursor-pointer"
                >
                  <Plus className="size-4" />
                  <span>{t("Criterium")}</span>
                </button>
                <span className="text-zinc-700">|</span>
                <button
                  type="button"
                  onClick={() => addQualityCriterion(1)}
                  className="text-brand/80 hover:text-brand hover:underline flex items-center gap-1 text-xs sm:text-sm font-medium cursor-pointer"
                  title={t("Subtaak toevoegen")}
                >
                  <CornerDownRight className="size-3.5" />
                  <span>{t("Subtaak")}</span>
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto overflow-x-hidden pr-2">
              {qualityCriteria.length === 0 ? (
                <p className="text-sm text-zinc-500 italic py-1">{t("Geen criteria opgegeven.")}</p>
              ) : (
                qualityCriteria.map((c, idx) => {
                  const isSub = (c.indent ?? 0) > 0;
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 ${
                        isSub ? "pl-4 sm:pl-6 border-l-2 border-brand/40 ml-2" : ""
                      }`}
                    >
                      <span className="text-zinc-500 font-mono text-xs w-5 shrink-0 text-center">
                        {isSub ? "↳" : `${idx + 1}.`}
                      </span>
                      <input
                        ref={(el) => {
                          if (focusTarget?.type === "quality" && focusTarget.index === idx && el) {
                            el.focus();
                            setFocusTarget(null);
                          }
                        }}
                        type="text"
                        value={c.text}
                        onChange={(e) => {
                          const val = e.target.value;
                          setQualityCriteria((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, text: val } : item))
                          );
                        }}
                        placeholder={isSub ? "Sub-kwaliteitseis..." : "Kwaliteitseis omschrijving..."}
                        className="flex-1 min-w-0 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand transition-colors placeholder-zinc-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setQualityCriteria((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, indent: isSub ? 0 : 1 } : item))
                          );
                        }}
                        title={isSub ? t("Terugspringen naar hoofdtaak") : t("Inspringen als subtaak")}
                        className={`p-2 rounded transition-colors cursor-pointer shrink-0 ${
                          isSub
                            ? "text-brand bg-brand/10 hover:bg-brand/20"
                            : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                        }`}
                      >
                        <CornerDownRight className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setQualityCriteria((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-zinc-500 hover:text-red-400 p-2 rounded hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                        title={t("Verwijderen")}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
  );
}
