"use client";

import { MessageSquare, RotateCcw, X } from "lucide-react";
import { t } from "@/lib/lang";
import type { MinorSprintFull, MinorStory } from "@/lib/api";

interface SlideOutroProps {
  sprint: MinorSprintFull;
  stories: MinorStory[];
  onRestart: () => void;
  onClose: () => void;
}

export function SlideOutro({ sprint, stories, onRestart, onClose }: SlideOutroProps) {
  const completedCount = stories.filter((s) => s.status === "done").length;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col justify-center items-center min-h-[72vh] px-4 sm:px-8 py-6 text-center animate-in fade-in duration-300">
      {/* Icon Badge */}
      <div className="w-16 h-16 rounded-3xl bg-brand/10 border border-brand/30 flex items-center justify-center text-brand mb-6 shadow-[0_0_2rem_rgba(0,227,164,0.2)]">
        <MessageSquare className="size-8" />
      </div>

      {/* Outro Title */}
      <h2 className="font-display text-4xl sm:text-5xl text-white tracking-tight leading-tight mb-3">
        {t("Vragen & Feedback")}
      </h2>

      <p className="text-zinc-400 text-sm sm:text-base max-w-xl mx-auto mb-8">
        {t("Bedankt voor de aandacht! Tijd voor discussie, vragen over de implementatie en feedback voor de Show & Grow.")}
      </p>

      {/* Summary Card */}
      <div className="p-6 rounded-2xl bg-zinc-900/80 border border-white/10 max-w-md w-full text-left space-y-3 mb-10 shadow-xl">
        <div className="text-xs uppercase font-bold tracking-wider text-zinc-400 mb-2">
          {t("Sprint Samenvatting")} ({sprint.sprintNumber})
        </div>
        <div className="flex items-center justify-between text-sm text-zinc-300 py-1 border-b border-white/5">
          <span>{t("Gedemonstreerde Stories")}:</span>
          <strong className="text-white font-mono">{stories.length}</strong>
        </div>
        <div className="flex items-center justify-between text-sm text-zinc-300 py-1 border-b border-white/5">
          <span>{t("Voltooid (Definition of Done)")}:</span>
          <strong className="text-brand font-mono">{completedCount}</strong>
        </div>
        <div className="flex items-center justify-between text-sm text-zinc-300 py-1">
          <span>{t("Show & Grow Datum")}:</span>
          <strong className="text-white font-mono">{sprint.showAndGrowDate}</strong>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10 font-semibold text-xs sm:text-sm transition-all cursor-pointer"
        >
          <RotateCcw className="size-4 text-zinc-400" />
          <span>{t("Opnieuw beginnen")}</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand text-zinc-950 font-bold text-xs sm:text-sm hover:bg-brand-hover hover:shadow-[0_0_1.5rem_rgba(0,227,164,0.3)] transition-all cursor-pointer"
        >
          <X className="size-4" />
          <span>{t("Sluit Presentatie")}</span>
        </button>
      </div>
    </div>
  );
}
