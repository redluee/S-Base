"use client";

import { useMemo } from "react";
import { ListChecks } from "lucide-react";
import { t } from "@/lib/lang";
import type { MinorStory, MinorStoryType } from "@/lib/api";
import { StoryTypeBadge, getStoryTypeDetails } from "@/components/minor-story-type-badge";
import { getLUShortDesc } from "@/lib/minor-constants";
import { useSlideStoryContent } from "./use-slide-story-content";
import { BulletsLayout, DemoLayout, MediaLayout, SplitLayout } from "./slide-story-layouts";

interface SlideStoryProps {
  story: MinorStory;
  storyTypes: MinorStoryType[];
  onImageClick: (image: { url: string; caption?: string }) => void;
  onOpenCriteria?: () => void;
}

export function SlideStory({
  story,
  storyTypes,
  onImageClick,
  onOpenCriteria,
}: SlideStoryProps) {
  const typeDetails = useMemo(() => {
    return getStoryTypeDetails(story.storyTypeCode, storyTypes);
  }, [story.storyTypeCode, storyTypes]);

  const storyColor = typeDetails.color || "#00e3a4";


  // Criteria counts for top badge
  const totalCriteriaCount = story.criteria?.length || 0;
  const completedCriteriaCount = (story.criteria || []).filter((c) => c.isCompleted).length;

  const { listStyle, websites, documents, images, demoUrl, demoTitle, bullets, activeLayout } =
    useSlideStoryContent(story);
  const layoutProps = {
    story, storyColor, bullets, listStyle, websites, documents, images, demoUrl, demoTitle,
    onImageClick, onOpenCriteria,
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col justify-center min-h-[72vh] px-4 sm:px-8 py-4 animate-in fade-in duration-200 select-text">
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4 mb-6">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <StoryTypeBadge
            code={story.storyTypeCode}
            storyTypes={storyTypes}
            fullNameOnly
            size="md"
          />
          {story.storyNumber && (
            <span
              className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg border"
              style={{
                borderColor: `${storyColor}40`,
                backgroundColor: `${storyColor}15`,
                color: storyColor,
              }}
            >
              {story.storyNumber}
            </span>
          )}
          <span
            className={`text-[10px] font-semibold uppercase px-2.5 py-1 rounded-lg ${
              story.status === "done"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "bg-zinc-800 text-zinc-300 border border-white/10"
            }`}
          >
            {story.status === "done" ? t("Voltooid") : story.status === "in_progress" ? t("Bezig") : t("To Do")}
          </span>

          {/* Criteria button */}
          {onOpenCriteria && (
            <button
              type="button"
              onClick={onOpenCriteria}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-zinc-900 border border-white/10 hover:border-brand/40 text-zinc-200 hover:text-white transition-all cursor-pointer shadow-sm group"
              title={t("Acceptatie- en kwaliteitscriteria inzien")}
            >
              <ListChecks className="size-4 text-brand group-hover:scale-110 transition-transform" />
              <span>{t("Criteria")}</span>
              {totalCriteriaCount > 0 && (
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-zinc-300">
                  {completedCriteriaCount}/{totalCriteriaCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Learning Outcome Tags */}
        <div className="flex items-center gap-1.5">
          {(story.learningOutcomes || []).map((lu) => (
            <span
              key={lu}
              className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-zinc-900 border border-white/10 text-zinc-300"
              title={getLUShortDesc(lu)}
            >
              LU {lu}
            </span>
          ))}
        </div>
      </div>

      {/* Story Title */}
      <h2 className="font-display text-2xl sm:text-4xl text-white tracking-tight leading-snug mb-4">
        {story.title}
      </h2>

      {activeLayout === "split" && <SplitLayout {...layoutProps} />}
      {activeLayout === "media" && <MediaLayout {...layoutProps} />}
      {activeLayout === "demo" && <DemoLayout {...layoutProps} />}
      {activeLayout === "bullets" && <BulletsLayout {...layoutProps} />}
    </div>
  );
}
