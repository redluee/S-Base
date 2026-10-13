"use client";

import { ExternalLink, ChevronDown, ChevronUp, CheckSquare, Square } from "lucide-react";
import Link from "next/link";
import { t } from "@/lib/lang";
import { toExternalHref } from "@/lib/uri";
import { StoryTypeBadge, getStoryTypeDetails } from "@/components/minor-story-type-badge";
import { getLUShortDesc } from "@/lib/minor-constants";
import type { MinorSprint, MinorStoryWithSprint, MinorStoryType } from "@/lib/api";

interface StoryCardProps {
  story: MinorStoryWithSprint;
  storyTypes?: MinorStoryType[];
  sprints?: MinorSprint[];
  isExpanded: boolean;
  onView: () => void;
  onToggleExpand: () => void;
  onToggleCriterion: (criterionId: number, isCompleted: boolean) => void;
  onStatusChange: (storyId: number, newStatus: "todo" | "in_progress" | "done") => void;
}

export function StoryCard({
  story,
  storyTypes = [],
  isExpanded,
  onView,
  onToggleExpand,
  onToggleCriterion,
  onStatusChange,
}: StoryCardProps) {
  const criteria = story.criteria || [];
  const completedCriteria = criteria.filter((c) => c.isCompleted).length;
  const totalCriteria = criteria.length;
  const criteriaPct = totalCriteria > 0 ? Math.round((completedCriteria / totalCriteria) * 100) : 0;
  const typeDetails = getStoryTypeDetails(story.storyTypeCode, storyTypes);

  return (
    <div
      onClick={onView}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onView();
        }
      }}
      aria-label={story.title}
      style={{ ["--story-type-color" as string]: typeDetails.color } as React.CSSProperties}
      className={`p-4 sm:p-6 rounded-2xl bg-zinc-900/80 border border-white/10 ${typeDetails.hoverBorderClass} hover:bg-zinc-800/40 transition-all space-y-3 sm:space-y-4 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand`}
    >
      {/* Top Row: Type Badge, Story Number, Sprint Tag, Status Select & Story Title */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <StoryTypeBadge code={story.storyTypeCode} storyTypes={storyTypes} showName hideNameOnMobile size="sm" />

            {story.storyNumber && (
              <span className="text-xs font-mono font-bold text-zinc-300 bg-zinc-950 px-2 py-0.5 rounded border border-white/5 shrink-0">
                {story.storyNumber}
              </span>
            )}

            {story.sprintNumber ? (
              <Link
                href={`/minor/sprints/${story.sprintId}`}
                className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-zinc-950 border border-white/10 text-zinc-400 hover:text-white hover:border-brand/40 transition-all flex items-center gap-1 shrink-0"
                title={story.sprintName || undefined}
                onClick={(e) => e.stopPropagation()}
              >
                <span>{story.sprintNumber}</span>
                <ExternalLink className="size-2.5 opacity-60" />
              </Link>
            ) : (
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-zinc-950 border border-amber-500/20 text-amber-400/80 shrink-0">
                {t("Concept")}
              </span>
            )}
          </div>

          <div
            className="flex items-center gap-2 shrink-0 ml-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Learning Outcomes for desktop */}
            <div className="hidden sm:flex items-center gap-1">
              {story.learningOutcomes.map((lu) => (
                <span
                  key={lu}
                  title={getLUShortDesc(lu) ? `LU ${lu} · ${getLUShortDesc(lu)}` : `LU ${lu}`}
                  className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-white/5 whitespace-nowrap"
                >
                  LU {lu}
                </span>
              ))}
            </div>

            {/* Status Dropdown */}
            <select
              value={story.status}
              onChange={(e) => onStatusChange(story.id, e.target.value as "todo" | "in_progress" | "done")}
              className={`text-xs font-semibold uppercase px-2.5 py-1 rounded-lg border cursor-pointer ${
                story.status === "done"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : story.status === "in_progress"
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

        {/* Title: Unconstrained width for long titles with break-words */}
        <h3 className={`text-base sm:text-lg font-bold text-white tracking-tight break-words ${typeDetails.hoverTextClass} transition-colors`}>
          {story.title}
        </h3>

        {/* Mobile Learning Outcomes row */}
        {story.learningOutcomes && story.learningOutcomes.length > 0 && (
          <div className="flex sm:hidden items-center gap-1 flex-wrap pt-0.5">
            {story.learningOutcomes.map((lu) => (
              <span
                key={lu}
                title={getLUShortDesc(lu) ? `LU ${lu} · ${getLUShortDesc(lu)}` : `LU ${lu}`}
                className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-white/5 whitespace-nowrap"
              >
                LU {lu}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* User Story Structure (Als / Wil ik / Zodat) */}
      {(story.asA || story.iWant || story.soThat) && (
        <div className="p-4 rounded-xl bg-zinc-950/60 border border-white/5 text-sm text-zinc-300 space-y-1 leading-relaxed">
          <p className="break-words">
            <span className="text-zinc-400 font-semibold">{t("Als [rol]")}: </span>
            {story.asA || "-"}
          </p>
          <p className="break-words">
            <span className="text-zinc-400 font-semibold">{t("wil ik [wens]")}: </span>
            {story.iWant || "-"}
          </p>
          <p className="break-words">
            <span className="text-zinc-400 font-semibold">{t("zodat [doel]")}: </span>
            {story.soThat || "-"}
          </p>
        </div>
      )}

      {/* Criteria & Evidence Overview Row */}
      <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/5">
        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-zinc-400 flex-wrap">
          {/* Criteria Count */}
          {totalCriteria > 0 ? (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-300 whitespace-nowrap">
                {completedCriteria}/{totalCriteria} {t("criteria")}
              </span>
              <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    criteriaPct === 100 ? "bg-emerald-400" : "bg-brand"
                  }`}
                  style={{ width: `${criteriaPct}%` }}
                />
              </div>
            </div>
          ) : (
            <span className="text-zinc-500 italic">{t("Geen criteria")}</span>
          )}

          {/* Evidence Count */}
          {story.evidence && story.evidence.length > 0 && (
            <span className="text-zinc-400 whitespace-nowrap">
              {story.evidence.length} {story.evidence.length === 1 ? t("bewijsstuk") : t("bewijsstukken")}
            </span>
          )}
        </div>

        {totalCriteria > 0 && (
          <div
            className="flex items-center gap-2 shrink-0 ml-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onToggleExpand}
              className="text-xs sm:text-sm text-zinc-400 hover:text-white flex items-center gap-1 font-medium transition-colors cursor-pointer"
            >
              <span className="hidden sm:inline">{isExpanded ? t("Criteria verbergen") : t("Criteria bekijken")}</span>
              <span className="sm:hidden">{t("Criteria")}</span>
              {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
          </div>
        )}
      </div>

      {/* Collapsible Criteria & Evidence Detail */}
      {isExpanded && (
        <div
          className="p-4 sm:p-5 rounded-xl bg-zinc-950 border border-white/5 space-y-4 animate-in fade-in duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Acceptance Criteria */}
          {criteria.some((c) => c.type === "acceptance") && (
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                {t("Acceptatiecriteria")}
              </div>
              <div className="space-y-2 overflow-x-hidden">
                {criteria
                  .filter((c) => c.type === "acceptance")
                  .map((c) => {
                    const isSub = (c.indent ?? 0) > 0;
                    return (
                      <div
                        key={c.id}
                        className={`flex items-start gap-2.5 text-sm ${
                          isSub ? "pl-4 sm:pl-6 border-l-2 border-brand/40 ml-2" : ""
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onToggleCriterion(c.id, !c.isCompleted)}
                          className="mt-0.5 text-zinc-400 hover:text-brand cursor-pointer shrink-0"
                        >
                          {c.isCompleted ? (
                            <CheckSquare className="size-4.5 text-emerald-400" />
                          ) : (
                            <Square className="size-4.5" />
                          )}
                        </button>
                        <span className={`flex-1 min-w-0 break-words leading-relaxed ${c.isCompleted ? "line-through text-zinc-500" : "text-zinc-200"}`}>
                          {c.text}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Quality Criteria */}
          {criteria.some((c) => c.type === "quality") && (
            <div className="space-y-2.5 pt-3 border-t border-white/5">
              <div className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                {t("Kwaliteitscriteria")}
              </div>
              <div className="space-y-2 overflow-x-hidden">
                {criteria
                  .filter((c) => c.type === "quality")
                  .map((c) => {
                    const isSub = (c.indent ?? 0) > 0;
                    return (
                      <div
                        key={c.id}
                        className={`flex items-start gap-2.5 text-sm ${
                          isSub ? "pl-4 sm:pl-6 border-l-2 border-brand/40 ml-2" : ""
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onToggleCriterion(c.id, !c.isCompleted)}
                          className="mt-0.5 text-zinc-400 hover:text-brand cursor-pointer shrink-0"
                        >
                          {c.isCompleted ? (
                            <CheckSquare className="size-4.5 text-emerald-400" />
                          ) : (
                            <Square className="size-4.5" />
                          )}
                        </button>
                        <span className={`flex-1 min-w-0 break-words leading-relaxed ${c.isCompleted ? "line-through text-zinc-500" : "text-zinc-200"}`}>
                          {c.text}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Evidence List */}
          {story.evidence && story.evidence.length > 0 && (
            <div className="space-y-2.5 pt-3 border-t border-white/5">
              <div className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                {t("Bewijsstukken & resultaten")}
              </div>
              <div className="flex flex-wrap gap-2">
                {story.evidence.map((ev) => (
                  <a
                    key={ev.id}
                    href={toExternalHref(ev.url)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-xs sm:text-sm text-zinc-300 hover:text-white hover:border-brand/40 transition-colors"
                  >
                    <span className="break-all">{ev.title}</span>
                    <ExternalLink className="size-3.5 text-zinc-500 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

