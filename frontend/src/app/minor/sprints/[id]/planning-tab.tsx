"use client";
import type { MinorStoryType, MinorStory } from "@/lib/api";

import { Layers, Plus, Edit3, CheckSquare, Presentation, Download, Link2, ChevronUp, ChevronDown } from "lucide-react";
import { t } from "@/lib/lang";
import { api } from "@/lib/api";
import { StoryTypeBadge, getStoryTypeDetails } from "@/components/minor-story-type-badge";
import { getLUShortDesc } from "@/lib/minor-constants";
import type { useSprintData } from "./use-sprint-data";
import type { useStoryEditor } from "./use-story-editor";
import type { useStoryLinking } from "./use-story-linking";
import type { useStoryImport } from "./use-story-import";

interface PlanningTabProps {
  storyTypes: MinorStoryType[];
  setViewingStoryId: (id: number | null) => void;
  setEditingPresentationStory: (story: MinorStory | null) => void;
  data: ReturnType<typeof useSprintData>;
  editor: ReturnType<typeof useStoryEditor>;
  linking: ReturnType<typeof useStoryLinking>;
  importer: ReturnType<typeof useStoryImport>;
}

export function PlanningTab({ storyTypes, setViewingStoryId, setEditingPresentationStory, data, editor, linking, importer }: PlanningTabProps) {
  const { sprint, reloadSprint } = data;
  const { openCreateStoryModal, openEditStoryModal } = editor;
  const { openLinkStoryModal, moveStoryUpDirect, moveStoryDownDirect } = linking;
  const { setIsImportStoryModalOpen, setImportJsonText, setImportError } = importer;
  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            {t("Sprintplanning & Stories")} ({sprint.stories.length})
          </h2>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={openLinkStoryModal}
              title={t("Bestaande concept story koppelen")}
              aria-label={t("Bestaande concept story koppelen")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-900 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
            >
              <Link2 className="size-3.5 text-zinc-400" />
              <span className="hidden sm:inline">{t("Koppelen")}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setImportJsonText("");
                setImportError(null);
                setIsImportStoryModalOpen(true);
              }}
              title={t("Story importeren (JSON)")}
              aria-label={t("Story importeren (JSON)")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-900 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
            >
              <Download className="size-3.5 text-zinc-400" />
              <span className="hidden sm:inline">{t("Importeren")}</span>
            </button>
            <button
              onClick={openCreateStoryModal}
              title={t("Nieuwe Story")}
              aria-label={t("Nieuwe Story")}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-lg text-xs font-semibold bg-brand text-zinc-950 hover:bg-brand-hover transition-all cursor-pointer shadow-sm"
            >
              <Plus className="size-3.5" />
              <span>{t("Nieuwe Story")}</span>
            </button>
          </div>
        </div>

        {sprint.stories.length === 0 ? (
          <div className="p-12 rounded-2xl bg-zinc-900/40 border border-white/10 text-center text-zinc-400 text-xs space-y-3">
            <Layers className="size-8 text-zinc-600 mx-auto" />
            <p>{t("Geen stories in deze sprint.")}</p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={openLinkStoryModal}
                title={t("Bestaande concept story koppelen")}
                aria-label={t("Bestaande concept story koppelen")}
                className="p-2 rounded-lg text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-all cursor-pointer flex items-center justify-center"
              >
                <Link2 className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportJsonText("");
                  setImportError(null);
                  setIsImportStoryModalOpen(true);
                }}
                title={t("Story importeren (JSON)")}
                aria-label={t("Story importeren (JSON)")}
                className="p-2 rounded-lg text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-all cursor-pointer flex items-center justify-center"
              >
                <Download className="size-3.5" />
              </button>
              <button
                onClick={openCreateStoryModal}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all cursor-pointer"
              >
                {t("Voeg je eerste story toe")}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {sprint.stories.map((st, stIdx) => {
              const totalCriteria = st.criteria?.length || 0;
              const completedCriteria = st.criteria?.filter((c) => c.isCompleted).length || 0;
              const typeDetails = getStoryTypeDetails(st.storyTypeCode, storyTypes);

              return (
                <div
                  key={st.id}
                  id={`sprint-story-${st.id}`}
                  data-story-id={st.id}
                  onClick={() => setViewingStoryId(st.id)}
                  style={{ ["--story-type-color" as string]: typeDetails.color } as React.CSSProperties}
                  className={`scroll-mt-24 p-3.5 sm:p-4 rounded-xl bg-zinc-900/80 border border-white/10 ${typeDetails.hoverBorderClass} hover:bg-zinc-800/50 transition-all cursor-pointer flex flex-col gap-2.5 sm:gap-3 group`}
                >
                  {/* Top Row: Type Badge + Story Number (Left) & Status Dropdown / Desktop Title */}
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 shrink-0">
                      <StoryTypeBadge
                        code={st.storyTypeCode}
                        storyTypes={storyTypes}
                        showName
                        hideNameOnMobile
                        size="sm"
                      />
                      {st.storyNumber && (
                        <span className="text-xs font-mono font-bold text-zinc-300 bg-zinc-950 px-2 py-0.5 rounded border border-white/5 shrink-0">
                          {st.storyNumber}
                        </span>
                      )}
                    </div>

                    {/* Desktop only: Title placed inline */}
                    <div className="hidden sm:flex items-center min-w-0 flex-1 ml-1">
                      <h3 className={`text-sm font-semibold text-white tracking-tight truncate ${typeDetails.hoverTextClass} transition-colors`}>
                        {st.title}
                      </h3>
                    </div>

                    {/* Mobile Status dropdown pinned to top-right */}
                    <div className="sm:hidden" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={st.status}
                        onChange={async (e) => {
                          const newStatus = e.target.value as "todo" | "in_progress" | "done";
                          await api.minor.sprints.stories.update(st.id, { status: newStatus });
                          await reloadSprint();
                        }}
                        className={`text-[10px] font-semibold uppercase px-2 py-1 rounded border cursor-pointer ${
                          st.status === "done"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : st.status === "in_progress"
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                            : "bg-zinc-800 border-white/10 text-zinc-300"
                        }`}
                      >
                        <option value="todo">{t("To Do")}</option>
                        <option value="in_progress">{t("Bezig")}</option>
                        <option value="done">{t("Voltooid")}</option>
                      </select>
                    </div>
                  </div>

                  {/* Mobile Title Row: Full width, clean wrapping */}
                  <div className="sm:hidden">
                    <h3 className={`text-sm font-semibold text-white tracking-tight break-words leading-snug ${typeDetails.hoverTextClass} transition-colors`}>
                      {st.title}
                    </h3>
                  </div>

                  {/* Bottom Metadata & Actions: Clean divider and never-wrapping action buttons */}
                  <div
                    className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 sm:border-0 sm:pt-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      {st.learningOutcomes && st.learningOutcomes.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {st.learningOutcomes.map((lu) => (
                            <span
                              key={lu}
                              title={getLUShortDesc(lu) ? `LU ${lu} · ${getLUShortDesc(lu)}` : `LU ${lu}`}
                              className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-950 text-zinc-400 border border-white/5 whitespace-nowrap"
                            >
                              LU {lu}
                            </span>
                          ))}
                        </div>
                      )}

                      {totalCriteria > 0 && (
                        <div
                          className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded-md border flex items-center gap-1.5 whitespace-nowrap ${
                            completedCriteria === totalCriteria
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-zinc-950 text-zinc-400 border-white/5"
                          }`}
                          title={`${completedCriteria} van ${totalCriteria} criteria voltooid`}
                        >
                          <CheckSquare className="size-3 shrink-0" />
                          <span>
                            {completedCriteria}/{totalCriteria}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                      {/* Status dropdown for desktop */}
                      <div className="hidden sm:block">
                        <select
                          value={st.status}
                          onChange={async (e) => {
                            const newStatus = e.target.value as "todo" | "in_progress" | "done";
                            await api.minor.sprints.stories.update(st.id, { status: newStatus });
                            await reloadSprint();
                          }}
                          className={`text-[10px] font-semibold uppercase px-2 py-1 rounded border cursor-pointer ${
                            st.status === "done"
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                              : st.status === "in_progress"
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                              : "bg-zinc-800 border-white/10 text-zinc-300"
                          }`}
                        >
                          <option value="todo">{t("To Do")}</option>
                          <option value="in_progress">{t("Bezig")}</option>
                          <option value="done">{t("Voltooid")}</option>
                        </select>
                      </div>

                      {/* Reordering Controls (Same style & behavior as workout studio) */}
                      {sprint.stories.length > 1 && (
                        <div className="flex items-center gap-0.5 mr-0.5">
                          <button
                            type="button"
                            disabled={stIdx === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveStoryUpDirect(stIdx);
                            }}
                            className="p-1 rounded-md text-muted-foreground hover:text-brand hover:bg-white/5 disabled:opacity-20 disabled:hover:text-muted-foreground disabled:hover:bg-transparent transition-colors cursor-pointer"
                            title={t("Move Up")}
                            aria-label={t("Move Up")}
                          >
                            <ChevronUp className="size-4" />
                          </button>
                          <button
                            type="button"
                            disabled={stIdx === sprint.stories.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveStoryDownDirect(stIdx);
                            }}
                            className="p-1 rounded-md text-muted-foreground hover:text-brand hover:bg-white/5 disabled:opacity-20 disabled:hover:text-muted-foreground disabled:hover:bg-transparent transition-colors cursor-pointer"
                            title={t("Move Down")}
                            aria-label={t("Move Down")}
                          >
                            <ChevronDown className="size-4" />
                          </button>
                        </div>
                      )}

                      {/* Action buttons locked together: Never separate */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingPresentationStory(st)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-brand hover:bg-brand/10 transition-all cursor-pointer"
                          title={t("Show & Tell content bewerken")}
                          aria-label={t("Show & Tell content bewerken")}
                        >
                          <Presentation className="size-3.5" />
                        </button>

                        <button
                          onClick={() => openEditStoryModal(st)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
                          title={t("Bewerken")}
                          aria-label={t("Bewerken")}
                        >
                          <Edit3 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
