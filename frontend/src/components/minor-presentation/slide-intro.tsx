"use client";

import { Sparkles, Calendar, Clock, ArrowRight } from "lucide-react";
import { t } from "@/lib/lang";
import type { MinorSprintFull, MinorStory, MinorStoryType } from "@/lib/api";
import { StoryTypeBadge } from "@/components/minor-story-type-badge";
import { getLUShortDesc } from "@/lib/minor-constants";

interface SlideIntroProps {
  sprint: MinorSprintFull;
  stories: MinorStory[];
  storyTypes: MinorStoryType[];
  onStart: () => void;
}

export function SlideIntro({ sprint, stories, storyTypes, onStart }: SlideIntroProps) {
  const completedStoriesCount = stories.filter((s) => s.status === "done").length;

  // Collect unique learning outcomes in presented stories
  const uniqueLUs = Array.from(
    new Set(stories.flatMap((s) => s.learningOutcomes || []))
  ).sort((a, b) => a - b);

  // Group stories count by type
  const typeCounts = stories.reduce<Record<string, number>>((acc, s) => {
    acc[s.storyTypeCode] = (acc[s.storyTypeCode] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col justify-center items-center min-h-[72vh] px-4 sm:px-8 py-6 text-center animate-in fade-in duration-300">
      {/* Top Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand/10 border border-brand/30 text-brand text-xs font-semibold tracking-wide uppercase mb-6">
        <Sparkles className="size-3.5" />
        <span>{t("Show & Tell Presentatie")}</span>
      </div>

      {/* Main Title */}
      <h1 className="font-display text-4xl sm:text-6xl text-white tracking-tight leading-tight max-w-4xl">
        {sprint.name}
      </h1>

      {/* Sprint Number & Dates */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-4 text-xs sm:text-sm text-zinc-400 font-mono">
        <span className="px-3 py-1 rounded-lg bg-zinc-900 border border-white/10 text-white font-bold">
          {sprint.sprintNumber}
        </span>
        <div className="flex items-center gap-1.5">
          <Calendar className="size-3.5 text-zinc-500" />
          <span>{sprint.startDate} t/m {sprint.endDate}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="size-3.5 text-brand" />
          <span>
            {t("Show & Grow")}: <strong className="text-white">{sprint.showAndGrowDate}</strong>
          </span>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mt-10 text-left">
        {/* Card 1: Stories total & completed */}
        <div className="p-5 rounded-2xl bg-zinc-900/80 border border-white/10 relative overflow-hidden group">
          <div className="text-xs uppercase font-semibold tracking-wider text-zinc-400 mb-1">
            {t("Opgeleverde Stories")}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-display font-bold text-white">
              {completedStoriesCount}
            </span>
            <span className="text-sm text-zinc-400">
              / {stories.length} {t("in sprint")}
            </span>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-brand h-full rounded-full transition-all duration-500"
              style={{
                width: `${stories.length > 0 ? (completedStoriesCount / stories.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Card 2: Story types breakdown */}
        <div className="p-5 rounded-2xl bg-zinc-900/80 border border-white/10">
          <div className="text-xs uppercase font-semibold tracking-wider text-zinc-400 mb-2">
            {t("Story Typen")}
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(typeCounts).map(([code, count]) => (
              <div key={code} className="flex items-center gap-1.5">
                <StoryTypeBadge code={code} storyTypes={storyTypes} />
                <span className="text-xs font-mono text-zinc-400 font-semibold">×{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Learning outcomes */}
        <div className="p-5 rounded-2xl bg-zinc-900/80 border border-white/10">
          <div className="text-xs uppercase font-semibold tracking-wider text-zinc-400 mb-2">
            {t("Leeruitkomsten")}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {uniqueLUs.length === 0 ? (
              <span className="text-xs text-zinc-500 italic">-</span>
            ) : (
              uniqueLUs.map((lu) => (
                <span
                  key={lu}
                  className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-zinc-800 border border-white/10 text-brand"
                  title={getLUShortDesc(lu)}
                >
                  LU {lu}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Start Button & Keyboard Hint */}
      <div className="mt-10 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onStart}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand text-zinc-950 font-bold text-sm sm:text-base hover:bg-brand-hover hover:shadow-[0_0_2rem_rgba(0,227,164,0.4)] transition-all cursor-pointer"
        >
          <span>{t("Start Presentatie")}</span>
          <ArrowRight className="size-4.5" />
        </button>
        <span className="text-xs text-zinc-400 font-mono">
          Tip: {t("Gebruik spatie of pijltjestoetsen om te navigeren, F voor fullscreen")}
        </span>
      </div>
    </div>
  );
}
