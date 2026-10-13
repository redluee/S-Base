"use client";

import { ExternalLink, CheckSquare, Square, Sparkles, Link2, X } from "lucide-react";
import Link from "next/link";
import { t } from "@/lib/lang";
import { toExternalHref } from "@/lib/uri";
import { StoryTypeBadge } from "@/components/minor-story-type-badge";
import { getLUShortDesc } from "@/lib/minor-constants";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import type { MinorSprint, MinorStoryWithSprint, MinorStoryType } from "@/lib/api";

interface StoryViewModalProps {
  storyTypes: MinorStoryType[];
  sprints: MinorSprint[];
  viewingStory: MinorStoryWithSprint;
  handleToggleCriterion: (criterionId: number, isCompleted: boolean) => void;
  handleStatusChange: (storyId: number, newStatus: "todo" | "in_progress" | "done") => void;
  handleLinkStoryToSprint: (storyId: number, targetSprintId: number | null) => void;
  onClose: () => void;
}

export function StoryViewModal({ storyTypes, sprints, viewingStory, handleToggleCriterion, handleStatusChange, handleLinkStoryToSprint, onClose }: StoryViewModalProps) {
  return (
      <ModalOverlay
        open
        onClose={() => onClose()}
        label={viewingStory.storyNumber ? `${t("Story")} ${viewingStory.storyNumber}` : t("Story details")}
        className="p-3 sm:p-4 overflow-y-auto"
      >
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-7 max-w-3xl w-full space-y-4 sm:space-y-5 shadow-2xl my-4 sm:my-8 max-h-[calc(100dvh-2rem)] overflow-y-auto">
          {/* Modal Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StoryTypeBadge code={viewingStory.storyTypeCode} storyTypes={storyTypes} showName hideNameOnMobile size="md" />
              {viewingStory.storyNumber && (
                <span className="text-xs sm:text-sm font-mono font-bold text-zinc-300 bg-zinc-950 px-2.5 py-1 rounded-lg border border-white/5">
                  {viewingStory.storyNumber}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {viewingStory.sprintId ? (
                <Link
                  href={`/minor/sprints/${viewingStory.sprintId}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs sm:text-sm font-semibold transition-all"
                >
                  <span>{viewingStory.sprintNumber || t("Sprint")}</span>
                  <ExternalLink className="size-3.5 text-brand" />
                </Link>
              ) : (
                <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  {t("Concept Story")}
                </span>
              )}
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
          </div>

          <div className="space-y-5 text-sm">
            {/* Header Title & Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-xl bg-zinc-950 border border-white/5">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight break-words">
                  {viewingStory.title}
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-zinc-400 text-xs font-medium">{t("Status")}:</span>
                <select
                  value={viewingStory.status}
                  onChange={(e) => handleStatusChange(viewingStory.id, e.target.value as "todo" | "in_progress" | "done")}
                  className={`text-xs font-semibold uppercase px-3 py-1.5 rounded-lg border cursor-pointer ${
                    viewingStory.status === "done"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : viewingStory.status === "in_progress"
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                      : "bg-zinc-900 border-white/10 text-zinc-300"
                  }`}
                >
                  <option value="todo">{t("To Do")}</option>
                  <option value="in_progress">{t("Bezig")}</option>
                  <option value="done">{t("Voltooid")}</option>
                </select>
              </div>
            </div>

            {/* Sprint Connection Section */}
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-950 border border-white/5">
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <Link2 className="size-4 text-brand" />
                <span className="font-semibold">{t("Gekoppelde sprint")}:</span>
                <span className="text-zinc-400">
                  {viewingStory.sprintNumber
                    ? `${viewingStory.sprintNumber}: ${viewingStory.sprintName || ""}`
                    : t("Geen sprint (Concept / Backlog)")}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={viewingStory.sprintId ? String(viewingStory.sprintId) : ""}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    handleLinkStoryToSprint(viewingStory.id, val);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/10 text-xs text-zinc-200 focus:outline-none focus:border-brand cursor-pointer"
                >
                  <option value="">{t("Geen sprint (Concept)")}</option>
                  {sprints.map((sp) => (
                    <option key={sp.id} value={String(sp.id)}>
                      {sp.sprintNumber}: {sp.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Template: Als / Wil ik / Zodat */}
            {(viewingStory.asA || viewingStory.iWant || viewingStory.soThat) && (
              <div className="space-y-2.5 p-4 sm:p-5 rounded-xl bg-zinc-950 border border-white/5">
                <div className="flex items-center gap-2 font-bold text-zinc-200 text-sm">
                  <Sparkles className="size-4 text-brand" />
                  <span>{t("User Story Template")}</span>
                </div>
                <div className="space-y-2 text-sm text-zinc-200 leading-relaxed">
                  <p className="break-words">
                    <span className="text-zinc-400 font-semibold">{t("Als [rol]")}: </span>
                    {viewingStory.asA || "-"}
                  </p>
                  <p className="break-words">
                    <span className="text-zinc-400 font-semibold">{t("wil ik [wens]")}: </span>
                    {viewingStory.iWant || "-"}
                  </p>
                  <p className="break-words">
                    <span className="text-zinc-400 font-semibold">{t("zodat [doel]")}: </span>
                    {viewingStory.soThat || "-"}
                  </p>
                </div>
              </div>
            )}

            {/* Learning Outcomes */}
            {viewingStory.learningOutcomes && viewingStory.learningOutcomes.length > 0 && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  {t("Gekoppelde Leeruitkomsten")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {viewingStory.learningOutcomes.map((lu) => (
                    <span
                      key={lu}
                      className="px-3 py-1.5 rounded-lg border border-brand/30 bg-brand/10 text-brand text-xs sm:text-sm font-semibold flex items-center gap-1.5"
                    >
                      <CheckSquare className="size-4" />
                      <span>
                        LU {lu}
                        {getLUShortDesc(lu) && (
                          <span className="text-brand/80 font-normal ml-1">
                            · {getLUShortDesc(lu)}
                          </span>
                        )}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Criteria Checklists Stacked (Acceptance & Quality) */}
            <div className="space-y-4">
              {/* Acceptance criteria */}
              <div className="space-y-3 p-4 sm:p-5 rounded-xl bg-zinc-950 border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-100 text-sm">{t("Acceptatiecriteria")}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 font-mono font-medium">
                    {viewingStory.criteria?.filter((c) => c.type === "acceptance" && c.isCompleted).length || 0}
                    /
                    {viewingStory.criteria?.filter((c) => c.type === "acceptance").length || 0}
                  </span>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto overflow-x-hidden pr-2">
                  {viewingStory.criteria?.filter((c) => c.type === "acceptance").length === 0 ? (
                    <p className="text-sm text-zinc-500 italic py-1">{t("Geen criteria opgegeven.")}</p>
                  ) : (
                    viewingStory.criteria
                      ?.filter((c) => c.type === "acceptance")
                      .map((crit) => {
                        const isSub = (crit.indent ?? 0) > 0;
                        return (
                          <button
                            key={crit.id}
                            type="button"
                            onClick={() => handleToggleCriterion(crit.id, crit.isCompleted)}
                            className={`flex items-start gap-2.5 text-left w-full text-sm text-zinc-300 hover:text-white group cursor-pointer transition-colors py-0.5 ${
                              isSub ? "pl-4 sm:pl-6 border-l-2 border-brand/40 ml-2" : ""
                            }`}
                          >
                            {crit.isCompleted ? (
                              <CheckSquare className="size-4.5 text-brand shrink-0 mt-0.5" />
                            ) : (
                              <Square className="size-4.5 text-zinc-600 group-hover:text-zinc-400 shrink-0 mt-0.5" />
                            )}
                            <span className={`flex-1 min-w-0 break-words leading-relaxed ${crit.isCompleted ? "line-through text-zinc-500" : ""}`}>
                              {isSub ? (
                                <span className="text-zinc-500 mr-1.5 font-mono text-xs">↳</span>
                              ) : (
                                <span className="text-zinc-400 mr-1.5 font-medium">{crit.orderIndex}.</span>
                              )}
                              {crit.text}
                            </span>
                          </button>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Quality criteria */}
              <div className="space-y-3 p-4 sm:p-5 rounded-xl bg-zinc-950 border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-100 text-sm">{t("Kwaliteitscriteria")}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 font-mono font-medium">
                    {viewingStory.criteria?.filter((c) => c.type === "quality" && c.isCompleted).length || 0}
                    /
                    {viewingStory.criteria?.filter((c) => c.type === "quality").length || 0}
                  </span>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto overflow-x-hidden pr-2">
                  {viewingStory.criteria?.filter((c) => c.type === "quality").length === 0 ? (
                    <p className="text-sm text-zinc-500 italic py-1">{t("Geen criteria opgegeven.")}</p>
                  ) : (
                    viewingStory.criteria
                      ?.filter((c) => c.type === "quality")
                      .map((crit) => {
                        const isSub = (crit.indent ?? 0) > 0;
                        return (
                          <button
                            key={crit.id}
                            type="button"
                            onClick={() => handleToggleCriterion(crit.id, crit.isCompleted)}
                            className={`flex items-start gap-2.5 text-left w-full text-sm text-zinc-300 hover:text-white group cursor-pointer transition-colors py-0.5 ${
                              isSub ? "pl-4 sm:pl-6 border-l-2 border-brand/40 ml-2" : ""
                            }`}
                          >
                            {crit.isCompleted ? (
                              <CheckSquare className="size-4.5 text-brand shrink-0 mt-0.5" />
                            ) : (
                              <Square className="size-4.5 text-zinc-600 group-hover:text-zinc-400 shrink-0 mt-0.5" />
                            )}
                            <span className={`flex-1 min-w-0 break-words leading-relaxed ${crit.isCompleted ? "line-through text-zinc-500" : ""}`}>
                              {isSub ? (
                                <span className="text-zinc-500 mr-1.5 font-mono text-xs">↳</span>
                              ) : (
                                <span className="text-zinc-400 mr-1.5 font-medium">{crit.orderIndex}.</span>
                              )}
                              {crit.text}
                            </span>
                          </button>
                        );
                      })
                  )}
                </div>
              </div>
            </div>

            {/* Bewijslast */}
            {viewingStory.evidence && viewingStory.evidence.length > 0 && (
              <div className="space-y-2.5 p-4 rounded-xl bg-zinc-950 border border-white/5">
                <span className="font-bold text-zinc-200 text-sm">{t("Bewijsstukken & resultaten")}</span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {viewingStory.evidence.map((ev) => (
                    <a
                      key={ev.id}
                      href={toExternalHref(ev.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-900 border border-white/10 text-sky-400 hover:text-sky-300 hover:border-sky-500/40 text-xs sm:text-sm font-medium transition-all cursor-pointer"
                    >
                      <ExternalLink className="size-3.5 shrink-0" />
                      <span className="break-all">
                        ({ev.type}) {ev.title}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="pt-3 flex items-center justify-between gap-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => onClose()}
                className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white text-xs sm:text-sm cursor-pointer"
              >
                {t("Sluiten")}
              </button>

              {viewingStory.sprintId ? (
                <Link
                  href={`/minor/sprints/${viewingStory.sprintId}`}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold bg-brand text-zinc-950 hover:bg-brand-hover transition-all cursor-pointer shadow-sm"
                >
                  <span>{t("Sprint openen")}</span>
                  <ExternalLink className="size-4" />
                </Link>
              ) : (
                <span className="text-xs text-zinc-500 italic">
                  {t("Selecteer een sprint hierboven om deze story te koppelen")}
                </span>
              )}
            </div>
          </div>
        </div>
      </ModalOverlay>
  );
}
