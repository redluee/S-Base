"use client";

import { ListChecks, ArrowRight } from "lucide-react";
import Link from "next/link";
import { t } from "@/lib/lang";
import type { MinorSprint, MinorStoryWithSprint, MinorStoryType } from "@/lib/api";
import { StoryCard } from "./story-card";

interface StoryListProps {
  storyTypes: MinorStoryType[];
  sprints: MinorSprint[];
  filteredStories: MinorStoryWithSprint[];
  sprintGroups: { sprint: MinorSprint | { id: number; sprintNumber?: string; name: string }; stories: MinorStoryWithSprint[] }[] | null;
  groupBySprint: boolean;
  expandedStoryIds: Set<number>;
  setViewingStoryId: React.Dispatch<React.SetStateAction<number | null>>;
  toggleExpand: (id: number) => void;
  handleToggleCriterion: (criterionId: number, isCompleted: boolean) => void;
  handleStatusChange: (storyId: number, newStatus: "todo" | "in_progress" | "done") => void;
}

export function StoryList({ storyTypes, sprints, filteredStories, sprintGroups, groupBySprint, expandedStoryIds, setViewingStoryId, toggleExpand, handleToggleCriterion, handleStatusChange }: StoryListProps) {
  return (
    <>
      {filteredStories.length === 0 ? (
        <div className="p-16 rounded-3xl bg-zinc-900/40 border border-white/10 text-center space-y-3">
          <ListChecks className="size-10 text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-white">{t("Geen user stories gevonden")}</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            {t("Er zijn geen stories die voldoen aan de geselecteerde zoekcriteria of filters.")}
          </p>
        </div>
      ) : groupBySprint && sprintGroups ? (
        <div className="space-y-8">
          {sprintGroups.map((group) => {
            const isConceptGroup = group.sprint.id === 0;

            return (
              <div key={group.sprint.id} className="space-y-4">
                {/* Sprint Section Header */}
                {isConceptGroup ? (
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded border bg-amber-500/10 border-amber-500/30 text-amber-400">
                          {group.sprint.sprintNumber || `Sprint ${group.sprint.id}`}
                        </span>
                        <h2 className="text-base font-bold text-white">{group.sprint.name}</h2>
                      </div>
                      <span className="text-xs text-zinc-500">
                        ({group.stories.length} {group.stories.length === 1 ? t("story") : t("stories")})
                      </span>
                    </div>
                  </div>
                ) : (
                  <Link
                    href={`/minor/sprints/${group.sprint.id}`}
                    className="flex items-center justify-between pb-2 border-b border-white/10 hover:border-brand/40 group/sprint transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded border bg-zinc-800 border-white/10 text-white group-hover/sprint:border-brand/40 group-hover/sprint:text-brand transition-colors">
                          {group.sprint.sprintNumber || `Sprint ${group.sprint.id}`}
                        </span>
                        <h2 className="text-base font-bold text-white group-hover/sprint:text-brand transition-colors">
                          {group.sprint.name}
                        </h2>
                      </div>
                      <span className="text-xs text-zinc-500">
                        ({group.stories.length} {group.stories.length === 1 ? t("story") : t("stories")})
                      </span>
                    </div>

                    <div className="text-xs text-brand flex items-center gap-1 font-semibold group-hover/sprint:translate-x-0.5 transition-transform">
                      <span>{t("Bekijk sprint")}</span>
                      <ArrowRight className="size-3.5" />
                    </div>
                  </Link>
                )}

                {/* Stories Cards in this Sprint */}
                <div className="grid grid-cols-1 gap-4">
                  {group.stories.map((story) => (
                    <StoryCard
                      key={story.id}
                      story={story}
                      storyTypes={storyTypes}
                      sprints={sprints}
                      isExpanded={expandedStoryIds.has(story.id)}
                      onView={() => setViewingStoryId(story.id)}
                      onToggleExpand={() => toggleExpand(story.id)}
                      onToggleCriterion={handleToggleCriterion}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredStories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              storyTypes={storyTypes}
              sprints={sprints}
              isExpanded={expandedStoryIds.has(story.id)}
              onView={() => setViewingStoryId(story.id)}
              onToggleExpand={() => toggleExpand(story.id)}
              onToggleCriterion={handleToggleCriterion}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </>
  );
}
