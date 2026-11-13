"use client";

import type { StoryStatus } from "@backend/shared/minor";
import { ExternalLink, Link2 } from "lucide-react";
import Link from "next/link";
import { t } from "@/lib/lang";
import type { MinorSprint, MinorStoryType, MinorStoryWithSprint } from "@/lib/api";
import { StoryViewModal as BaseStoryViewModal } from "@/app/minor/story-view-modal";

interface StoryViewModalProps {
  storyTypes: MinorStoryType[];
  sprints: MinorSprint[];
  viewingStory: MinorStoryWithSprint;
  handleToggleCriterion: (criterionId: number, isCompleted: boolean) => void;
  handleStatusChange: (storyId: number, newStatus: StoryStatus) => void;
  handleLinkStoryToSprint: (storyId: number, targetSprintId: number | null) => void;
  onClose: () => void;
}

export function StoryViewModal({ sprints, viewingStory, handleLinkStoryToSprint, ...rest }: StoryViewModalProps) {
  const sprintHref = viewingStory.sprintId ? `/minor/sprints/${viewingStory.sprintId}` : null;
  return (
    <BaseStoryViewModal
      {...rest}
      viewingStory={viewingStory}
      headerExtra={
        sprintHref ? (
          <Link
            href={sprintHref}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs sm:text-sm font-semibold transition-all"
          >
            <span>{viewingStory.sprintNumber || t("Sprint")}</span>
            <ExternalLink className="size-3.5 text-brand" />
          </Link>
        ) : (
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            {t("Concept Story")}
          </span>
        )
      }
      beforeNarrative={
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
          <select
            value={viewingStory.sprintId ? String(viewingStory.sprintId) : ""}
            onChange={(e) => handleLinkStoryToSprint(viewingStory.id, e.target.value ? Number(e.target.value) : null)}
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
      }
      footer={
        <div className="pt-3 flex items-center justify-between gap-3 border-t border-white/10">
          <button
            type="button"
            onClick={rest.onClose}
            className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white text-xs sm:text-sm cursor-pointer"
          >
            {t("Sluiten")}
          </button>
          {sprintHref ? (
            <Link
              href={sprintHref}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold bg-brand text-zinc-950 hover:bg-brand-hover transition-all cursor-pointer shadow-sm"
            >
              <span>{t("Sprint openen")}</span>
              <ExternalLink className="size-4" />
            </Link>
          ) : (
            <span className="text-xs text-zinc-500 italic">{t("Selecteer een sprint hierboven om deze story te koppelen")}</span>
          )}
        </div>
      }
    />
  );
}
