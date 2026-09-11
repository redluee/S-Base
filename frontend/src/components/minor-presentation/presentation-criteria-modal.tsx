"use client";

import { useEffect, useMemo } from "react";
import {
  X,
  CheckSquare,
  Square,
  ListChecks,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { t } from "@/lib/lang";
import { api, type MinorStory, type MinorStoryType } from "@/lib/api";
import { StoryTypeBadge, getStoryTypeDetails } from "@/components/minor-story-type-badge";

interface PresentationCriteriaModalProps {
  story: MinorStory;
  storyTypes: MinorStoryType[];
  onClose: () => void;
  onStoryUpdated?: (updatedStory: MinorStory) => void;
}

export function PresentationCriteriaModal({
  story,
  storyTypes,
  onClose,
  onStoryUpdated,
}: PresentationCriteriaModalProps) {
  const typeDetails = useMemo(() => {
    return getStoryTypeDetails(story.storyTypeCode, storyTypes);
  }, [story.storyTypeCode, storyTypes]);

  const storyColor = typeDetails.color || "#00e3a4";

  // Filter criteria by type
  const acceptanceCriteria = useMemo(() => {
    return (story.criteria || [])
      .filter((c) => c.type === "acceptance")
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [story.criteria]);

  const qualityCriteria = useMemo(() => {
    return (story.criteria || [])
      .filter((c) => c.type === "quality")
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [story.criteria]);

  const completedAcceptanceCount = acceptanceCriteria.filter((c) => c.isCompleted).length;
  const completedQualityCount = qualityCriteria.filter((c) => c.isCompleted).length;

  // ESC key handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onClose]);

  // Toggle criterion completion status
  async function handleToggleCriterion(critId: number, currentStatus: boolean) {
    try {
      await api.minor.sprints.stories.toggleCriterion(critId, !currentStatus);
      const updatedStory: MinorStory = {
        ...story,
        criteria: (story.criteria || []).map((c) =>
          c.id === critId ? { ...c, isCompleted: !currentStatus } : c
        ),
      };
      if (onStoryUpdated) {
        onStoryUpdated(updatedStory);
      }
    } catch (err) {
      console.error("Failed to toggle criterion in presentation modal:", err);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-7 max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <StoryTypeBadge
                code={story.storyTypeCode}
                storyTypes={storyTypes}
                fullNameOnly
                size="sm"
              />
              {story.storyNumber && (
                <span
                  className="text-xs font-mono font-bold px-2 py-0.5 rounded border"
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
                className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                  story.status === "done"
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "bg-zinc-800 text-zinc-300 border border-white/10"
                }`}
              >
                {story.status === "done"
                  ? t("Voltooid")
                  : story.status === "in_progress"
                  ? t("Bezig")
                  : t("To Do")}
              </span>
            </div>

            <h3 className="text-base sm:text-xl font-bold text-white tracking-tight leading-snug">
              {story.title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="size-8 flex items-center justify-center rounded-lg border border-white/10 bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-white/20 transition-all cursor-pointer shrink-0"
            title={t("Sluiten (ESC)")}
            aria-label={t("Sluiten")}
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Story Context / User Story sentence (if present) */}
        {story.iWant && (
          <div className="text-xs sm:text-sm text-zinc-300 italic bg-zinc-950/70 p-3 rounded-xl border border-white/5">
            {story.asA && `Als ${story.asA} `}wil ik {story.iWant}
            {story.soThat && ` zodat ${story.soThat}`}.
          </div>
        )}

        {/* Criteria Content List - Scrollable */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-6">
          {/* Section 1: Acceptatiecriteria */}
          <div className="space-y-3 p-4 sm:p-5 rounded-xl bg-zinc-950/90 border border-white/10 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListChecks className="size-4.5" style={{ color: storyColor }} />
                <h4 className="text-sm sm:text-base font-bold text-white">
                  {t("Acceptatiecriteria")}
                </h4>
              </div>
              <span
                className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold"
                style={{
                  backgroundColor: `${storyColor}20`,
                  color: storyColor,
                  border: `1px solid ${storyColor}40`,
                }}
              >
                {completedAcceptanceCount} / {acceptanceCriteria.length} {t("voltooid")}
              </span>
            </div>

            {acceptanceCriteria.length === 0 ? (
              <p className="text-xs sm:text-sm text-zinc-500 italic py-2">
                {t("Geen acceptatiecriteria opgegeven voor deze story.")}
              </p>
            ) : (
              <div className="space-y-2.5 pt-1">
                {acceptanceCriteria.map((crit) => {
                  const isSub = (crit.indent ?? 0) > 0;
                  return (
                    <button
                      key={crit.id}
                      type="button"
                      onClick={() => handleToggleCriterion(crit.id, crit.isCompleted)}
                      className={`flex items-start gap-3 text-left w-full text-xs sm:text-sm text-zinc-200 hover:text-white group cursor-pointer transition-all p-2 rounded-lg hover:bg-zinc-900/60 ${
                        isSub ? "pl-5 sm:pl-7 border-l-2 ml-2" : ""
                      }`}
                      style={{
                        borderLeftColor: isSub ? `${storyColor}60` : undefined,
                      }}
                    >
                      {crit.isCompleted ? (
                        <CheckSquare
                          className="size-4.5 shrink-0 mt-0.5"
                          style={{ color: storyColor }}
                        />
                      ) : (
                        <Square className="size-4.5 text-zinc-500 group-hover:text-zinc-300 shrink-0 mt-0.5" />
                      )}
                      <span
                        className={`flex-1 min-w-0 break-words leading-relaxed ${
                          crit.isCompleted ? "line-through text-zinc-500" : ""
                        }`}
                      >
                        {isSub ? (
                          <span className="text-zinc-500 mr-2 font-mono text-xs">↳</span>
                        ) : (
                          <span className="text-zinc-400 mr-1.5 font-medium font-mono">
                            {crit.orderIndex}.
                          </span>
                        )}
                        {crit.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Kwaliteitscriteria */}
          <div className="space-y-3 p-4 sm:p-5 rounded-xl bg-zinc-950/90 border border-white/10 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4.5" style={{ color: storyColor }} />
                <h4 className="text-sm sm:text-base font-bold text-white">
                  {t("Kwaliteitscriteria")}
                </h4>
              </div>
              <span
                className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold"
                style={{
                  backgroundColor: `${storyColor}20`,
                  color: storyColor,
                  border: `1px solid ${storyColor}40`,
                }}
              >
                {completedQualityCount} / {qualityCriteria.length} {t("voltooid")}
              </span>
            </div>

            {qualityCriteria.length === 0 ? (
              <p className="text-xs sm:text-sm text-zinc-500 italic py-2">
                {t("Geen kwaliteitscriteria opgegeven voor deze story.")}
              </p>
            ) : (
              <div className="space-y-2.5 pt-1">
                {qualityCriteria.map((crit) => {
                  const isSub = (crit.indent ?? 0) > 0;
                  return (
                    <button
                      key={crit.id}
                      type="button"
                      onClick={() => handleToggleCriterion(crit.id, crit.isCompleted)}
                      className={`flex items-start gap-3 text-left w-full text-xs sm:text-sm text-zinc-200 hover:text-white group cursor-pointer transition-all p-2 rounded-lg hover:bg-zinc-900/60 ${
                        isSub ? "pl-5 sm:pl-7 border-l-2 ml-2" : ""
                      }`}
                      style={{
                        borderLeftColor: isSub ? `${storyColor}60` : undefined,
                      }}
                    >
                      {crit.isCompleted ? (
                        <CheckSquare
                          className="size-4.5 shrink-0 mt-0.5"
                          style={{ color: storyColor }}
                        />
                      ) : (
                        <Square className="size-4.5 text-zinc-500 group-hover:text-zinc-300 shrink-0 mt-0.5" />
                      )}
                      <span
                        className={`flex-1 min-w-0 break-words leading-relaxed ${
                          crit.isCompleted ? "line-through text-zinc-500" : ""
                        }`}
                      >
                        {isSub ? (
                          <span className="text-zinc-500 mr-2 font-mono text-xs">↳</span>
                        ) : (
                          <span className="text-zinc-400 mr-1.5 font-medium font-mono">
                            {crit.orderIndex}.
                          </span>
                        )}
                        {crit.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer info & close button */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-400" />
            <span>{t("Klik op een criterium om deze live af te vinken.")}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors cursor-pointer"
          >
            {t("Sluiten")}
          </button>
        </div>
      </div>
    </div>
  );
}
