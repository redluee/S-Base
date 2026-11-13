"use client";

import { Trash2, Edit3, Presentation, Copy, Check } from "lucide-react";
import { t } from "@/lib/lang";
import { api, type MinorStory, type MinorStoryType } from "@/lib/api";
import { StoryViewModal as BaseStoryViewModal } from "@/app/minor/story-view-modal";
import type { useSprintData } from "./use-sprint-data";
import type { useStoryEditor } from "./use-story-editor";

interface StoryViewModalProps {
  storyTypes: MinorStoryType[];
  viewingStory: MinorStory;
  setViewingStoryId: (id: number | null) => void;
  setEditingPresentationStory: (story: MinorStory | null) => void;
  data: ReturnType<typeof useSprintData>;
  editor: ReturnType<typeof useStoryEditor>;
}

export function StoryViewModal({ storyTypes, viewingStory, setViewingStoryId, setEditingPresentationStory, data, editor }: StoryViewModalProps) {
  const { reloadSprint } = data;
  const { copiedExport, openEditStoryModal, handleDeleteStory, handleExportStoryDirect, handleToggleCriterion } = editor;
  return (
    <BaseStoryViewModal
      storyTypes={storyTypes}
      viewingStory={viewingStory}
      handleToggleCriterion={handleToggleCriterion}
      handleStatusChange={async (id, status) => {
        await api.minor.stories.update(id, { status });
        await reloadSprint();
      }}
      onClose={() => setViewingStoryId(null)}
      footer={
        <div className="pt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-white/10">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleDeleteStory(viewingStory.id)}
              className="flex items-center justify-center p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              title={t("Verwijderen")}
              aria-label={t("Verwijderen")}
            >
              <Trash2 className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => handleExportStoryDirect(viewingStory)}
              className="flex items-center justify-center p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title={t("Exporteer story als JSON naar klembord")}
              aria-label={t("Exporteer story als JSON naar klembord")}
            >
              {copiedExport ? <Check className="size-4 text-brand" /> : <Copy className="size-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                const stToEdit = viewingStory;
                setViewingStoryId(null);
                setEditingPresentationStory(stToEdit);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-zinc-800 text-zinc-200 hover:text-white hover:bg-zinc-700 transition-all cursor-pointer border border-white/10"
              title={t("Show & Tell content bewerken")}
            >
              <Presentation className="size-3.5 text-brand" />
              <span>{t("Show & Tell")}</span>
            </button>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setViewingStoryId(null)}
              className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white text-xs sm:text-sm cursor-pointer"
            >
              {t("Sluiten")}
            </button>
            <button
              type="button"
              onClick={() => {
                const stToEdit = viewingStory;
                setViewingStoryId(null);
                openEditStoryModal(stToEdit);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold bg-brand text-zinc-950 hover:bg-brand-hover transition-all cursor-pointer shadow-sm"
            >
              <Edit3 className="size-4" />
              <span>{t("Story Bewerken")}</span>
            </button>
          </div>
        </div>
      }
    />
  );
}
