"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ListChecks,
  Search,
  Layers,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  ArrowRight,
} from "lucide-react";
import { t } from "@/lib/lang";
import {
  api,
  type MinorSprint,
  type MinorStoryWithSprint,
} from "@/lib/api";
import { StoryTypeBadge } from "@/components/minor-story-type-badge";

interface MinorStoriesClientProps {
  initialStories: MinorStoryWithSprint[];
  sprints: MinorSprint[];
}

export function MinorStoriesClient({ initialStories, sprints }: MinorStoriesClientProps) {
  const [stories, setStories] = useState<MinorStoryWithSprint[]>(initialStories);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSprintId, setSelectedSprintId] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedLU, setSelectedLU] = useState<string>("all");
  const [groupBySprint, setGroupBySprint] = useState<boolean>(true);
  const [expandedStoryIds, setExpandedStoryIds] = useState<Set<number>>(new Set());

  function toggleExpand(id: number) {
    setExpandedStoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleToggleCriterion(criterionId: number, isCompleted: boolean) {
    try {
      await api.minor.sprints.stories.toggleCriterion(criterionId, isCompleted);
      setStories((prev) =>
        prev.map((st) => ({
          ...st,
          criteria: st.criteria?.map((c) => (c.id === criterionId ? { ...c, isCompleted } : c)),
        }))
      );
    } catch (err) {
      console.error("Failed to toggle criterion:", err);
    }
  }

  async function handleStatusChange(storyId: number, newStatus: "todo" | "in_progress" | "done") {
    try {
      await api.minor.sprints.stories.update(storyId, { status: newStatus });
      setStories((prev) =>
        prev.map((st) => (st.id === storyId ? { ...st, status: newStatus } : st))
      );
    } catch (err) {
      console.error("Failed to update story status:", err);
    }
  }

  const filteredStories = useMemo(() => {
    return stories.filter((st) => {
      // Sprint filter
      if (selectedSprintId !== "all" && String(st.sprintId) !== selectedSprintId) {
        return false;
      }

      // Type filter
      if (selectedType !== "all" && st.storyTypeCode.toUpperCase() !== selectedType.toUpperCase()) {
        return false;
      }

      // Status filter
      if (selectedStatus !== "all" && st.status !== selectedStatus) {
        return false;
      }

      // Learning outcome filter
      if (selectedLU !== "all" && !st.learningOutcomes?.includes(Number(selectedLU))) {
        return false;
      }

      // Text query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = st.title.toLowerCase().includes(q);
        const matchesNumber = (st.storyNumber || "").toLowerCase().includes(q);
        const matchesCode = (st.storyTypeCode || "").toLowerCase().includes(q);
        const matchesAsA = (st.asA || "").toLowerCase().includes(q);
        const matchesIWant = (st.iWant || "").toLowerCase().includes(q);
        const matchesSoThat = (st.soThat || "").toLowerCase().includes(q);
        const matchesCriteria = st.criteria?.some((c) => c.text.toLowerCase().includes(q)) ?? false;

        if (!matchesTitle && !matchesNumber && !matchesCode && !matchesAsA && !matchesIWant && !matchesSoThat && !matchesCriteria) {
          return false;
        }
      }

      return true;
    });
  }, [stories, selectedSprintId, selectedType, selectedStatus, selectedLU, searchQuery]);

  // Statistics
  const totalCount = stories.length;
  const doneCount = stories.filter((s) => s.status === "done").length;
  const inProgressCount = stories.filter((s) => s.status === "in_progress").length;
  const todoCount = stories.filter((s) => s.status === "todo").length;
  const usCount = stories.filter((s) => s.storyTypeCode.toUpperCase() === "US").length;
  const rsCount = stories.filter((s) => s.storyTypeCode.toUpperCase() === "RS").length;
  const lsCount = stories.filter((s) => s.storyTypeCode.toUpperCase() === "LS").length;

  const completionPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // Grouping logic
  const sprintGroups = useMemo(() => {
    if (!groupBySprint) return null;

    const map = new Map<number, { sprint: MinorSprint | { id: number; sprintNumber?: string; name: string }; stories: MinorStoryWithSprint[] }>();

    // Initialise sprints order
    sprints.forEach((sp) => {
      map.set(sp.id, { sprint: sp, stories: [] });
    });

    filteredStories.forEach((st) => {
      if (!map.has(st.sprintId)) {
        map.set(st.sprintId, {
          sprint: {
            id: st.sprintId,
            sprintNumber: st.sprintNumber || `Sprint ${st.sprintId}`,
            name: st.sprintName || `Sprint ${st.sprintId}`,
          },
          stories: [],
        });
      }
      map.get(st.sprintId)!.stories.push(st);
    });

    return Array.from(map.values()).filter((g) => g.stories.length > 0);
  }, [filteredStories, sprints, groupBySprint]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl text-white tracking-tight">
            {t("User Stories Overzicht")}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            {t("Volledig overzicht van alle user stories, research stories en learning stories over alle sprints.")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setGroupBySprint(!groupBySprint)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
              groupBySprint
                ? "bg-zinc-800 border-white/20 text-white"
                : "bg-zinc-900/60 border-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            <Layers className="size-3.5" />
            <span>{groupBySprint ? t("Gegroepeerd per sprint") : t("Vlakke lijst")}</span>
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            {t("Totaal Stories")}
          </div>
          <div className="text-2xl font-bold font-mono text-white">{totalCount}</div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
            {t("User Stories (US)")}
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-300">{usCount}</div>
        </div>

        <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-orange-400">
            {t("Research (RS)")}
          </div>
          <div className="text-2xl font-bold font-mono text-orange-300">{rsCount}</div>
        </div>

        <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-purple-400">
            {t("Learning (LS)")}
          </div>
          <div className="text-2xl font-bold font-mono text-purple-300">{lsCount}</div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            {t("Voltooid")}
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {doneCount} <span className="text-xs font-normal text-zinc-400">({completionPct}%)</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            {t("In Uitvoering")}
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {inProgressCount} <span className="text-xs font-normal text-zinc-400">/ {todoCount} todo</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("Zoek op titel, nummer, criterium, rol...")}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-950 border border-white/10 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          {/* Sprint Filter */}
          <select
            value={selectedSprintId}
            onChange={(e) => setSelectedSprintId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-xs text-zinc-200 focus:outline-none focus:border-brand transition-colors cursor-pointer"
          >
            <option value="all">{t("Alle Sprints")}</option>
            {sprints.map((sp) => (
              <option key={sp.id} value={String(sp.id)}>
                {sp.sprintNumber}: {sp.name}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-xs text-zinc-200 focus:outline-none focus:border-brand transition-colors cursor-pointer"
          >
            <option value="all">{t("Alle Typen (US / RS / LS)")}</option>
            <option value="US">{t("US - User Story (Groen)")}</option>
            <option value="RS">{t("RS - Research Story (Oranje)")}</option>
            <option value="LS">{t("LS - Learning Story (Paars)")}</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-xs text-zinc-200 focus:outline-none focus:border-brand transition-colors cursor-pointer"
          >
            <option value="all">{t("Alle Statussen")}</option>
            <option value="todo">{t("To Do")}</option>
            <option value="in_progress">{t("Bezig")}</option>
            <option value="done">{t("Voltooid")}</option>
          </select>
        </div>

        {/* Quick LU Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-white/5">
          <span className="text-[11px] font-semibold text-zinc-500 mr-1">{t("Leeruitkomst:")}</span>
          <button
            onClick={() => setSelectedLU("all")}
            className={`px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-semibold transition-all cursor-pointer ${
              selectedLU === "all"
                ? "bg-brand/20 border border-brand/40 text-brand"
                : "bg-zinc-950 border border-white/5 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {t("Alle")}
          </button>
          {[1, 2, 3, 4, 5].map((lu) => (
            <button
              key={lu}
              onClick={() => setSelectedLU(selectedLU === String(lu) ? "all" : String(lu))}
              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                selectedLU === String(lu)
                  ? "bg-brand/20 border border-brand/40 text-brand"
                  : "bg-zinc-950 border border-white/5 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              LU {lu}
            </button>
          ))}

          {(searchQuery || selectedSprintId !== "all" || selectedType !== "all" || selectedStatus !== "all" || selectedLU !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedSprintId("all");
                setSelectedType("all");
                setSelectedStatus("all");
                setSelectedLU("all");
              }}
              className="text-[11px] text-zinc-500 hover:text-red-400 ml-auto cursor-pointer"
            >
              {t("Filters resetten")}
            </button>
          )}
        </div>
      </div>

      {/* Stories List */}
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
          {sprintGroups.map((group) => (
            <div key={group.sprint.id} className="space-y-4">
              {/* Sprint Section Header */}
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-zinc-800 border border-white/10 text-white">
                      {group.sprint.sprintNumber || `Sprint ${group.sprint.id}`}
                    </span>
                    <h2 className="text-base font-bold text-white">{group.sprint.name}</h2>
                  </div>
                  <span className="text-xs text-zinc-500">
                    ({group.stories.length} {group.stories.length === 1 ? t("story") : t("stories")})
                  </span>
                </div>

                <Link
                  href={`/minor/sprints/${group.sprint.id}`}
                  className="text-xs text-brand hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>{t("Bekijk sprint")}</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>

              {/* Stories Cards in this Sprint */}
              <div className="grid grid-cols-1 gap-4">
                {group.stories.map((story) => (
                  <StoryCard
                    key={story.id}
                    story={story}
                    isExpanded={expandedStoryIds.has(story.id)}
                    onToggleExpand={() => toggleExpand(story.id)}
                    onToggleCriterion={handleToggleCriterion}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredStories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              isExpanded={expandedStoryIds.has(story.id)}
              onToggleExpand={() => toggleExpand(story.id)}
              onToggleCriterion={handleToggleCriterion}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface StoryCardProps {
  story: MinorStoryWithSprint;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleCriterion: (criterionId: number, isCompleted: boolean) => void;
  onStatusChange: (storyId: number, newStatus: "todo" | "in_progress" | "done") => void;
}

function StoryCard({
  story,
  isExpanded,
  onToggleExpand,
  onToggleCriterion,
  onStatusChange,
}: StoryCardProps) {
  const criteria = story.criteria || [];
  const completedCriteria = criteria.filter((c) => c.isCompleted).length;
  const totalCriteria = criteria.length;
  const criteriaPct = totalCriteria > 0 ? Math.round((completedCriteria / totalCriteria) * 100) : 0;

  return (
    <div className="p-5 rounded-2xl bg-zinc-900/80 border border-white/10 hover:border-white/20 transition-all space-y-4">
      {/* Top Row: Type Badge, Story Number, Title, Sprint Tag, LU Badges, Status Select */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Prominent Story Type Badge */}
          <StoryTypeBadge code={story.storyTypeCode} showName size="md" />

          {story.storyNumber && (
            <span className="text-xs font-mono font-bold text-zinc-300 bg-zinc-950 px-2 py-1 rounded-md border border-white/5">
              {story.storyNumber}
            </span>
          )}

          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
            {story.title}
          </h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Sprint Badge */}
          {story.sprintNumber && (
            <Link
              href={`/minor/sprints/${story.sprintId}`}
              className="text-[11px] font-mono font-semibold px-2 py-1 rounded-lg bg-zinc-950 border border-white/10 text-zinc-400 hover:text-white hover:border-brand/40 transition-all flex items-center gap-1"
              title={story.sprintName || undefined}
            >
              <span>{story.sprintNumber}</span>
              <ExternalLink className="size-2.5 opacity-60" />
            </Link>
          )}

          {/* Learning Outcomes */}
          <div className="flex items-center gap-1">
            {story.learningOutcomes.map((lu) => (
              <span
                key={lu}
                className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-white/5"
              >
                LU {lu}
              </span>
            ))}
          </div>

          {/* Status Dropdown */}
          <select
            value={story.status}
            onChange={(e) => onStatusChange(story.id, e.target.value as "todo" | "in_progress" | "done")}
            className={`text-[11px] font-semibold uppercase px-2.5 py-1 rounded-lg border cursor-pointer ${
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

      {/* User Story Structure (Als / Wil ik / Zodat) */}
      {(story.asA || story.iWant || story.soThat) && (
        <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/5 text-xs text-zinc-300 space-y-0.5">
          <p>
            <span className="text-zinc-500 font-semibold">{t("Als [rol]")}: </span>
            {story.asA || "-"}
          </p>
          <p>
            <span className="text-zinc-500 font-semibold">{t("wil ik [wens]")}: </span>
            {story.iWant || "-"}
          </p>
          <p>
            <span className="text-zinc-500 font-semibold">{t("zodat [doel]")}: </span>
            {story.soThat || "-"}
          </p>
        </div>
      )}

      {/* Criteria & Evidence Overview Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-white/5">
        <div className="flex items-center gap-4 text-xs text-zinc-400">
          {/* Criteria Count */}
          {totalCriteria > 0 ? (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-300">
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
            <span className="text-zinc-400">
              {story.evidence.length} {story.evidence.length === 1 ? t("bewijsstuk") : t("bewijsstukken")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {totalCriteria > 0 && (
            <button
              onClick={onToggleExpand}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-medium transition-colors cursor-pointer"
            >
              <span>{isExpanded ? t("Criteria verbergen") : t("Criteria bekijken")}</span>
              {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>
          )}

          <Link
            href={`/minor/sprints/${story.sprintId}`}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all text-xs flex items-center gap-1"
            title={t("Naar sprint")}
          >
            <span className="text-[11px] font-semibold">{t("Sprint openen")}</span>
            <ExternalLink className="size-3" />
          </Link>
        </div>
      </div>

      {/* Collapsible Criteria & Evidence Detail */}
      {isExpanded && (
        <div className="p-4 rounded-xl bg-zinc-950 border border-white/5 space-y-4 animate-in fade-in duration-150">
          {/* Acceptance Criteria */}
          {criteria.some((c) => c.type === "acceptance") && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                {t("Acceptatiecriteria")}
              </div>
              <div className="space-y-1.5">
                {criteria
                  .filter((c) => c.type === "acceptance")
                  .map((c) => {
                    const isSub = (c.indent ?? 0) > 0;
                    return (
                      <div
                        key={c.id}
                        className={`flex items-start gap-2.5 text-xs ${
                          isSub ? "pl-5 sm:pl-7 border-l-2 border-brand/30 ml-2" : ""
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onToggleCriterion(c.id, !c.isCompleted)}
                          className="mt-0.5 text-zinc-400 hover:text-brand cursor-pointer"
                        >
                          {c.isCompleted ? (
                            <CheckSquare className="size-4 text-emerald-400" />
                          ) : (
                            <Square className="size-4" />
                          )}
                        </button>
                        <span className={c.isCompleted ? "line-through text-zinc-500" : "text-zinc-200"}>
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
            <div className="space-y-2 pt-2 border-t border-white/5">
              <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                {t("Kwaliteitscriteria")}
              </div>
              <div className="space-y-1.5">
                {criteria
                  .filter((c) => c.type === "quality")
                  .map((c) => {
                    const isSub = (c.indent ?? 0) > 0;
                    return (
                      <div
                        key={c.id}
                        className={`flex items-start gap-2.5 text-xs ${
                          isSub ? "pl-5 sm:pl-7 border-l-2 border-brand/30 ml-2" : ""
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onToggleCriterion(c.id, !c.isCompleted)}
                          className="mt-0.5 text-zinc-400 hover:text-brand cursor-pointer"
                        >
                          {c.isCompleted ? (
                            <CheckSquare className="size-4 text-emerald-400" />
                          ) : (
                            <Square className="size-4" />
                          )}
                        </button>
                        <span className={c.isCompleted ? "line-through text-zinc-500" : "text-zinc-200"}>
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
            <div className="space-y-2 pt-2 border-t border-white/5">
              <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                {t("Bewijslast & Links")}
              </div>
              <div className="flex flex-wrap gap-2">
                {story.evidence.map((ev) => (
                  <a
                    key={ev.id}
                    href={ev.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/10 text-xs text-zinc-300 hover:text-white hover:border-brand/40 transition-colors"
                  >
                    <span>{ev.title}</span>
                    <ExternalLink className="size-3 text-zinc-500" />
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
