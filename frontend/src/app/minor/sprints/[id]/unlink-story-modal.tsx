"use client";

import { Unlink, X } from "lucide-react";
import { t } from "@/lib/lang";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import type { useSprintData } from "./use-sprint-data";
import type { useStoryLinking } from "./use-story-linking";

interface UnlinkStoryModalProps {
  data: ReturnType<typeof useSprintData>;
  linking: ReturnType<typeof useStoryLinking>;
}

export function UnlinkStoryModal({ data, linking }: UnlinkStoryModalProps) {
  const { sprint } = data;
  const { setIsUnlinkModalOpen, storyToUnlink, targetSprintIdForUnlink, setTargetSprintIdForUnlink, allSprints, unlinkingStory, handleConfirmUnlinkOrMove } = linking;
  if (!storyToUnlink) return null;
  return (
    <ModalOverlay
      open
      onClose={() => setIsUnlinkModalOpen(false)}
      label={t("Story loskoppelen")}
      className="p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 max-w-lg w-full space-y-4 sm:space-y-5 shadow-2xl my-4 sm:my-8 max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Unlink className="size-5 text-amber-400" />
            <span>{t("Story loskoppelen")}</span>
          </h2>
          <button
            type="button"
            onClick={() => setIsUnlinkModalOpen(false)}
            className="size-8 flex items-center justify-center rounded-lg border border-white/10 bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-white/20 transition-all cursor-pointer shrink-0"
            title={t("Sluiten")}
            aria-label={t("Sluiten")}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 text-sm text-zinc-300">
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-white/5 space-y-1">
            <div className="text-xs text-zinc-400 font-medium">{t("Story")}:</div>
            <div className="font-semibold text-white">
              {storyToUnlink.storyNumber ? `${storyToUnlink.storyNumber} - ` : ""}
              {storyToUnlink.title}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-300">
              {t("Koppel aan andere sprint of bewaar als concept")}:
            </label>
            <select
              value={targetSprintIdForUnlink}
              onChange={(e) => setTargetSprintIdForUnlink(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-sm text-zinc-200 focus:outline-none focus:border-brand cursor-pointer"
            >
              <option value="">{t("Geen sprint (Concept / Backlog)")}</option>
              {allSprints
                .filter((sp) => sp.id !== sprint.id)
                .map((sp) => (
                  <option key={sp.id} value={String(sp.id)}>
                    {sp.sprintNumber}: {sp.name}
                  </option>
                ))}
            </select>
            <p className="text-xs text-zinc-500">
              {targetSprintIdForUnlink
                ? t("De story wordt verplaatst naar de geselecteerde sprint.")
                : t("De story wordt losgekoppeld en bewaard als concept story.")}
            </p>
          </div>
        </div>

        <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
          <button
            type="button"
            onClick={() => setIsUnlinkModalOpen(false)}
            disabled={unlinkingStory}
            className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white text-xs sm:text-sm cursor-pointer disabled:opacity-50"
          >
            {t("Annuleren")}
          </button>
          <button
            type="button"
            onClick={handleConfirmUnlinkOrMove}
            disabled={unlinkingStory}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold bg-amber-500 text-zinc-950 hover:bg-amber-400 transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            <Unlink className="size-4" />
            <span>
              {unlinkingStory
                ? t("Bezig...")
                : targetSprintIdForUnlink
                ? t("Verplaatsen")
                : t("Loskoppelen")}
            </span>
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
