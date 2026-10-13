"use client";
import type { MinorStoryType } from "@/lib/api";

import { Plus, Link2, Search, X } from "lucide-react";
import { t } from "@/lib/lang";
import { StoryTypeBadge } from "@/components/minor-story-type-badge";
import { getLUShortDesc } from "@/lib/minor-constants";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import type { useSprintData } from "./use-sprint-data";
import type { useStoryEditor } from "./use-story-editor";
import type { useStoryLinking } from "./use-story-linking";

interface LinkStoryModalProps {
  storyTypes: MinorStoryType[];
  data: ReturnType<typeof useSprintData>;
  editor: ReturnType<typeof useStoryEditor>;
  linking: ReturnType<typeof useStoryLinking>;
}

export function LinkStoryModal({ storyTypes, data, editor, linking }: LinkStoryModalProps) {
  const { sprint } = data;
  const { openCreateStoryModal } = editor;
  const { setIsLinkStoryModalOpen, availableConceptStories, loadingConceptStories, linkingStoryId, linkSearchQuery, setLinkSearchQuery, handleLinkStory } = linking;
  return (
    <ModalOverlay
      open
      onClose={() => setIsLinkStoryModalOpen(false)}
      label={t("Concept Story Koppelen")}
      className="p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 max-w-2xl w-full space-y-4 shadow-2xl my-4 sm:my-8 max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Link2 className="size-4 text-brand" />
            <span>{t("Concept Story Koppelen")}</span>
          </h2>
          <button
            type="button"
            onClick={() => setIsLinkStoryModalOpen(false)}
            className="size-8 flex items-center justify-center rounded-lg border border-white/10 bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-white/20 transition-all cursor-pointer shrink-0"
            title={t("Sluiten")}
            aria-label={t("Sluiten")}
          >
            <X className="size-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-400">
          {t("Koppel een bestaande concept story of backlog item aan")} <span className="text-white font-semibold">{sprint.sprintNumber}: {sprint.name}</span>.
        </p>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
          <input
            type="text"
            value={linkSearchQuery}
            onChange={(e) => setLinkSearchQuery(e.target.value)}
            placeholder={t("Zoek op titel, nummer of rol...")}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand transition-colors"
          />
        </div>

        {/* Stories List */}
        <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
          {loadingConceptStories ? (
            <div className="p-8 text-center text-xs text-zinc-500">{t("Concept stories laden...")}</div>
          ) : availableConceptStories.filter((st) => {
              if (!linkSearchQuery.trim()) return true;
              const q = linkSearchQuery.toLowerCase();
              return (
                st.title.toLowerCase().includes(q) ||
                (st.storyNumber || "").toLowerCase().includes(q) ||
                (st.storyTypeCode || "").toLowerCase().includes(q) ||
                (st.asA || "").toLowerCase().includes(q) ||
                (st.iWant || "").toLowerCase().includes(q)
              );
            }).length === 0 ? (
            <div className="p-8 rounded-xl bg-zinc-950/60 border border-white/5 text-center space-y-3">
              <p className="text-xs text-zinc-400">
                {linkSearchQuery
                  ? t("Geen concept stories gevonden voor deze zoekopdracht.")
                  : t("Er zijn momenteel geen losse concept stories beschikbaar.")}
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsLinkStoryModalOpen(false);
                  openCreateStoryModal();
                }}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="size-3.5" />
                <span>{t("Nieuwe story aanmaken")}</span>
              </button>
            </div>
          ) : (
            availableConceptStories
              .filter((st) => {
                if (!linkSearchQuery.trim()) return true;
                const q = linkSearchQuery.toLowerCase();
                return (
                  st.title.toLowerCase().includes(q) ||
                  (st.storyNumber || "").toLowerCase().includes(q) ||
                  (st.storyTypeCode || "").toLowerCase().includes(q) ||
                  (st.asA || "").toLowerCase().includes(q) ||
                  (st.iWant || "").toLowerCase().includes(q)
                );
              })
              .map((st) => (
                <div
                  key={st.id}
                  className="p-3.5 rounded-xl bg-zinc-950 border border-white/5 hover:border-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StoryTypeBadge code={st.storyTypeCode} storyTypes={storyTypes} showName hideNameOnMobile size="sm" />
                      {st.storyNumber && (
                        <span className="text-[11px] font-mono font-bold text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded border border-white/5">
                          {st.storyNumber}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-white tracking-tight break-words">
                        {st.title}
                      </span>
                    </div>
                    {(st.asA || st.iWant) && (
                      <p className="text-[11px] text-zinc-400 line-clamp-1">
                        {st.asA ? `Als ${st.asA}, ` : ""}{st.iWant ? `wil ik ${st.iWant}` : ""}
                      </p>
                    )}
                    {st.learningOutcomes && st.learningOutcomes.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap pt-0.5">
                        {st.learningOutcomes.map((lu) => (
                          <span
                            key={lu}
                            title={getLUShortDesc(lu) ? `LU ${lu} · ${getLUShortDesc(lu)}` : `LU ${lu}`}
                            className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-white/5"
                          >
                            LU {lu}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={linkingStoryId === st.id}
                    onClick={() => handleLinkStory(st.id)}
                    className="px-3 py-2 rounded-lg bg-brand text-zinc-950 hover:bg-brand-hover text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 transition-all cursor-pointer disabled:opacity-50 w-full sm:w-auto"
                  >
                    <Link2 className="size-3.5" />
                    <span>{linkingStoryId === st.id ? t("Koppelen...") : t("Koppelen")}</span>
                  </button>
                </div>
              ))
          )}
        </div>

        <div className="pt-2 flex items-center justify-end">
          <button
            type="button"
            onClick={() => setIsLinkStoryModalOpen(false)}
            className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white text-xs cursor-pointer"
          >
            {t("Sluiten")}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
