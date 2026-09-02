"use client";

import { useState, useMemo, useEffect } from "react";
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
  Sparkles,
  Plus,
  Link2,
  Check,
} from "lucide-react";
import { t } from "@/lib/lang";
import {
  api,
  type MinorSprint,
  type MinorStoryWithSprint,
  type MinorStoryType,
} from "@/lib/api";
import { StoryTypeBadge, getStoryTypeDetails } from "@/components/minor-story-type-badge";

interface MinorStoriesClientProps {
  initialStories: MinorStoryWithSprint[];
  sprints: MinorSprint[];
}

export function MinorStoriesClient({ initialStories, sprints }: MinorStoriesClientProps) {
  const [stories, setStories] = useState<MinorStoryWithSprint[]>(initialStories);
  const [storyTypes, setStoryTypes] = useState<MinorStoryType[]>([]);
  const [viewingStoryId, setViewingStoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSprintId, setSelectedSprintId] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedLU, setSelectedLU] = useState<string>("all");
  const [groupBySprint, setGroupBySprint] = useState<boolean>(true);
  const [expandedStoryIds, setExpandedStoryIds] = useState<Set<number>>(new Set());

  // Create Story Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSprintId, setNewSprintId] = useState<string>("");
  const [newStoryTypeCode, setNewStoryTypeCode] = useState("US");
  const [newStoryNumber, setNewStoryNumber] = useState("");
  const [newStoryTitle, setNewStoryTitle] = useState("");
  const [newAsA, setNewAsA] = useState("");
  const [newIWant, setNewIWant] = useState("");
  const [newSoThat, setNewSoThat] = useState("");
  const [newSelectedLUs, setNewSelectedLUs] = useState<number[]>([1, 2]);
  const [newStatus, setNewStatus] = useState<"todo" | "in_progress" | "done">("todo");
  const [newAcceptanceCriteria, setNewAcceptanceCriteria] = useState<{ text: string; isCompleted: boolean; indent?: number }[]>([
    { text: "", isCompleted: false, indent: 0 },
  ]);
  const [newQualityCriteria, setNewQualityCriteria] = useState<{ text: string; isCompleted: boolean; indent?: number }[]>([]);
  const [savingNewStory, setSavingNewStory] = useState(false);

  useEffect(() => {
    api.minor.storyTypes.list().then(setStoryTypes).catch(() => {});
  }, []);

  const viewingStory = stories.find((s) => s.id === viewingStoryId) || null;

  function getDefaultQualityCriteriaForType(code: string, customTypes: MinorStoryType[] = storyTypes) {
    const found = customTypes.find((t) => t.code.toUpperCase() === code.toUpperCase());
    if (found && found.defaultQualityCriteria && found.defaultQualityCriteria.length > 0) {
      return found.defaultQualityCriteria.map((c) => ({
        text: c.text,
        isCompleted: false,
        indent: c.indent || 0,
      }));
    }
    return [{ text: "", isCompleted: false, indent: 0 }];
  }

  function openCreateStoryModal() {
    setNewSprintId("");
    setNewStoryTypeCode("US");
    setNewStoryNumber(`US ${(stories.length + 1).toFixed(1)}`);
    setNewStoryTitle("");
    setNewAsA("");
    setNewIWant("");
    setNewSoThat("");
    setNewSelectedLUs([1, 2]);
    setNewStatus("todo");
    setNewAcceptanceCriteria([{ text: "", isCompleted: false, indent: 0 }]);
    setNewQualityCriteria(getDefaultQualityCriteriaForType("US"));
    setIsCreateModalOpen(true);
  }

  async function handleSaveNewStory(e: React.FormEvent) {
    e.preventDefault();
    if (!newStoryTitle.trim()) return;
    setSavingNewStory(true);
    try {
      const targetSprint = sprints.find((sp) => String(sp.id) === newSprintId);
      const sprintIdNum = newSprintId ? Number(newSprintId) : null;

      const created = await api.minor.stories.create({
        sprintId: sprintIdNum,
        storyTypeCode: newStoryTypeCode,
        storyNumber: newStoryNumber.trim() || undefined,
        title: newStoryTitle.trim(),
        asA: newAsA.trim() || undefined,
        iWant: newIWant.trim() || undefined,
        soThat: newSoThat.trim() || undefined,
        learningOutcomes: newSelectedLUs,
        status: newStatus,
        acceptanceCriteria: newAcceptanceCriteria.filter((c) => c.text.trim()),
        qualityCriteria: newQualityCriteria.filter((c) => c.text.trim()),
      });

      const storyWithSprint: MinorStoryWithSprint = {
        ...created,
        sprintNumber: targetSprint?.sprintNumber,
        sprintName: targetSprint?.name,
        sprintStatus: targetSprint?.status,
      };

      setStories((prev) => [storyWithSprint, ...prev]);
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error("Failed to create story:", err);
    } finally {
      setSavingNewStory(false);
    }
  }

  async function handleLinkStoryToSprint(storyId: number, targetSprintId: number | null) {
    try {
      await api.minor.stories.update(storyId, { sprintId: targetSprintId });
      const targetSprint = targetSprintId ? sprints.find((s) => s.id === targetSprintId) : null;
      setStories((prev) =>
        prev.map((s) =>
          s.id === storyId
            ? {
                ...s,
                sprintId: targetSprintId,
                sprintNumber: targetSprint?.sprintNumber,
                sprintName: targetSprint?.name,
                sprintStatus: targetSprint?.status,
              }
            : s
        )
      );
    } catch (err) {
      console.error("Failed to update story sprint:", err);
    }
  }

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
      if (selectedSprintId === "unassigned" && st.sprintId) {
        return false;
      }
      if (
        selectedSprintId !== "all" &&
        selectedSprintId !== "unassigned" &&
        String(st.sprintId) !== selectedSprintId
      ) {
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
  const conceptCount = stories.filter((s) => !s.sprintId).length;
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

    const unassigned: MinorStoryWithSprint[] = [];

    filteredStories.forEach((st) => {
      if (!st.sprintId) {
        unassigned.push(st);
      } else if (map.has(st.sprintId)) {
        map.get(st.sprintId)!.stories.push(st);
      } else {
        map.set(st.sprintId, {
          sprint: {
            id: st.sprintId,
            sprintNumber: st.sprintNumber || `Sprint ${st.sprintId}`,
            name: st.sprintName || `Sprint ${st.sprintId}`,
          },
          stories: [st],
        });
      }
    });

    const result = Array.from(map.values()).filter((g) => g.stories.length > 0);
    if (unassigned.length > 0) {
      result.unshift({
        sprint: {
          id: 0,
          sprintNumber: "Concept",
          name: "Concept Stories / Backlog",
        },
        stories: unassigned,
      });
    }

    return result;
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
            {t("Volledig overzicht van alle user stories, research stories, concepten en backlog items.")}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
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

          <button
            onClick={openCreateStoryModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-brand text-zinc-950 hover:bg-brand-hover transition-all cursor-pointer shadow-sm"
          >
            <Plus className="size-3.5" />
            <span>{t("Nieuwe Story")}</span>
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            {t("Totaal Stories")}
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {totalCount}{" "}
            {conceptCount > 0 && (
              <span className="text-xs font-normal text-amber-400">({conceptCount} {t("concept")})</span>
            )}
          </div>
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
            <option value="all">{t("Alle Sprints & Concepten")}</option>
            <option value="unassigned">{t("Concepten / Geen sprint")}</option>
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
            <option value="US">{t("US - User Story")}</option>
            <option value="RS">{t("RS - Research Story")}</option>
            <option value="LS">{t("LS - Learning Story")}</option>
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

      {/* Story View Modal */}
      {viewingStory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
          onClick={() => setViewingStoryId(null)}
        >
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-7 max-w-3xl w-full space-y-5 shadow-2xl my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <StoryTypeBadge code={viewingStory.storyTypeCode} storyTypes={storyTypes} showName size="md" />
                {viewingStory.storyNumber && (
                  <span className="text-xs sm:text-sm font-mono font-bold text-zinc-300 bg-zinc-950 px-2.5 py-1 rounded-lg border border-white/5">
                    {viewingStory.storyNumber}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {viewingStory.sprintId ? (
                  <Link
                    href={`/minor/sprints/${viewingStory.sprintId}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs sm:text-sm font-semibold transition-all"
                  >
                    <span>{viewingStory.sprintNumber || t("Sprint")}</span>
                    <ExternalLink className="size-3.5 text-brand" />
                  </Link>
                ) : (
                  <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    {t("Concept Story")}
                  </span>
                )}
                <button
                  onClick={() => setViewingStoryId(null)}
                  className="text-zinc-400 hover:text-white text-base cursor-pointer p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-5 text-sm">
              {/* Header Title & Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-xl bg-zinc-950 border border-white/5">
                <div className="space-y-1">
                  <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    {viewingStory.title}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {storyTypes.find((t) => t.code === viewingStory.storyTypeCode)?.name || viewingStory.storyTypeCode}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-zinc-400 text-xs font-medium">{t("Status")}:</span>
                  <select
                    value={viewingStory.status}
                    onChange={(e) => handleStatusChange(viewingStory.id, e.target.value as "todo" | "in_progress" | "done")}
                    className={`text-xs font-semibold uppercase px-3 py-1.5 rounded-lg border cursor-pointer ${
                      viewingStory.status === "done"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : viewingStory.status === "in_progress"
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        : "bg-zinc-900 border-white/10 text-zinc-300"
                    }`}
                  >
                    <option value="todo">{t("To Do")}</option>
                    <option value="in_progress">{t("Bezig")}</option>
                    <option value="done">{t("Voltooid")}</option>
                  </select>
                </div>
              </div>

              {/* Sprint Connection Section */}
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

                <div className="flex items-center gap-2">
                  <select
                    value={viewingStory.sprintId ? String(viewingStory.sprintId) : ""}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : null;
                      handleLinkStoryToSprint(viewingStory.id, val);
                    }}
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
              </div>

              {/* Template: Als / Wil ik / Zodat */}
              {(viewingStory.asA || viewingStory.iWant || viewingStory.soThat) && (
                <div className="space-y-2.5 p-4 sm:p-5 rounded-xl bg-zinc-950 border border-white/5">
                  <div className="flex items-center gap-2 font-bold text-zinc-200 text-sm">
                    <Sparkles className="size-4 text-brand" />
                    <span>{t("User Story Template")}</span>
                  </div>
                  <div className="space-y-2 text-sm text-zinc-200 leading-relaxed">
                    <p className="break-words">
                      <span className="text-zinc-400 font-semibold">{t("Als [rol]")}: </span>
                      {viewingStory.asA || "-"}
                    </p>
                    <p className="break-words">
                      <span className="text-zinc-400 font-semibold">{t("wil ik [wens]")}: </span>
                      {viewingStory.iWant || "-"}
                    </p>
                    <p className="break-words">
                      <span className="text-zinc-400 font-semibold">{t("zodat [doel]")}: </span>
                      {viewingStory.soThat || "-"}
                    </p>
                  </div>
                </div>
              )}

              {/* Learning Outcomes */}
              {viewingStory.learningOutcomes && viewingStory.learningOutcomes.length > 0 && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    {t("Gekoppelde Leeruitkomsten")}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {viewingStory.learningOutcomes.map((lu) => (
                      <span
                        key={lu}
                        className="px-3 py-1.5 rounded-lg border border-brand/30 bg-brand/10 text-brand text-xs sm:text-sm font-semibold flex items-center gap-2"
                      >
                        <CheckSquare className="size-4" />
                        <span>LU {lu}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Criteria Checklists Stacked (Acceptance & Quality) */}
              <div className="space-y-4">
                {/* Acceptance criteria */}
                <div className="space-y-3 p-4 sm:p-5 rounded-xl bg-zinc-950 border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-100 text-sm">{t("Acceptatiecriteria")}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 font-mono font-medium">
                      {viewingStory.criteria?.filter((c) => c.type === "acceptance" && c.isCompleted).length || 0}
                      /
                      {viewingStory.criteria?.filter((c) => c.type === "acceptance").length || 0}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto overflow-x-hidden pr-2">
                    {viewingStory.criteria?.filter((c) => c.type === "acceptance").length === 0 ? (
                      <p className="text-sm text-zinc-500 italic py-1">{t("Geen criteria opgegeven.")}</p>
                    ) : (
                      viewingStory.criteria
                        ?.filter((c) => c.type === "acceptance")
                        .map((crit) => {
                          const isSub = (crit.indent ?? 0) > 0;
                          return (
                            <button
                              key={crit.id}
                              type="button"
                              onClick={() => handleToggleCriterion(crit.id, crit.isCompleted)}
                              className={`flex items-start gap-2.5 text-left w-full text-sm text-zinc-300 hover:text-white group cursor-pointer transition-colors py-0.5 ${
                                isSub ? "pl-4 sm:pl-6 border-l-2 border-brand/40 ml-2" : ""
                              }`}
                            >
                              {crit.isCompleted ? (
                                <CheckSquare className="size-4.5 text-brand shrink-0 mt-0.5" />
                              ) : (
                                <Square className="size-4.5 text-zinc-600 group-hover:text-zinc-400 shrink-0 mt-0.5" />
                              )}
                              <span className={`flex-1 min-w-0 break-words leading-relaxed ${crit.isCompleted ? "line-through text-zinc-500" : ""}`}>
                                {isSub ? (
                                  <span className="text-zinc-500 mr-1.5 font-mono text-xs">↳</span>
                                ) : (
                                  <span className="text-zinc-400 mr-1.5 font-medium">{crit.orderIndex}.</span>
                                )}
                                {crit.text}
                              </span>
                            </button>
                          );
                        })
                    )}
                  </div>
                </div>

                {/* Quality criteria */}
                <div className="space-y-3 p-4 sm:p-5 rounded-xl bg-zinc-950 border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-100 text-sm">{t("Kwaliteitscriteria")}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 font-mono font-medium">
                      {viewingStory.criteria?.filter((c) => c.type === "quality" && c.isCompleted).length || 0}
                      /
                      {viewingStory.criteria?.filter((c) => c.type === "quality").length || 0}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto overflow-x-hidden pr-2">
                    {viewingStory.criteria?.filter((c) => c.type === "quality").length === 0 ? (
                      <p className="text-sm text-zinc-500 italic py-1">{t("Geen criteria opgegeven.")}</p>
                    ) : (
                      viewingStory.criteria
                        ?.filter((c) => c.type === "quality")
                        .map((crit) => {
                          const isSub = (crit.indent ?? 0) > 0;
                          return (
                            <button
                              key={crit.id}
                              type="button"
                              onClick={() => handleToggleCriterion(crit.id, crit.isCompleted)}
                              className={`flex items-start gap-2.5 text-left w-full text-sm text-zinc-300 hover:text-white group cursor-pointer transition-colors py-0.5 ${
                                isSub ? "pl-4 sm:pl-6 border-l-2 border-brand/40 ml-2" : ""
                              }`}
                            >
                              {crit.isCompleted ? (
                                <CheckSquare className="size-4.5 text-brand shrink-0 mt-0.5" />
                              ) : (
                                <Square className="size-4.5 text-zinc-600 group-hover:text-zinc-400 shrink-0 mt-0.5" />
                              )}
                              <span className={`flex-1 min-w-0 break-words leading-relaxed ${crit.isCompleted ? "line-through text-zinc-500" : ""}`}>
                                {isSub ? (
                                  <span className="text-zinc-500 mr-1.5 font-mono text-xs">↳</span>
                                ) : (
                                  <span className="text-zinc-400 mr-1.5 font-medium">{crit.orderIndex}.</span>
                                )}
                                {crit.text}
                              </span>
                            </button>
                          );
                        })
                    )}
                  </div>
                </div>
              </div>

              {/* Bewijslast */}
              {viewingStory.evidence && viewingStory.evidence.length > 0 && (
                <div className="space-y-2.5 p-4 rounded-xl bg-zinc-950 border border-white/5">
                  <span className="font-bold text-zinc-200 text-sm">{t("Bewijslast")}</span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {viewingStory.evidence.map((ev) => (
                      <a
                        key={ev.id}
                        href={ev.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-900 border border-white/10 text-sky-400 hover:text-sky-300 hover:border-sky-500/40 text-xs sm:text-sm font-medium transition-all cursor-pointer"
                      >
                        <ExternalLink className="size-3.5 shrink-0" />
                        <span className="break-all">
                          ({ev.type}) {ev.title}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-3 flex items-center justify-between gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setViewingStoryId(null)}
                  className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white text-xs sm:text-sm cursor-pointer"
                >
                  {t("Sluiten")}
                </button>

                {viewingStory.sprintId ? (
                  <Link
                    href={`/minor/sprints/${viewingStory.sprintId}`}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold bg-brand text-zinc-950 hover:bg-brand-hover transition-all cursor-pointer shadow-sm"
                  >
                    <span>{t("Sprint openen")}</span>
                    <ExternalLink className="size-4" />
                  </Link>
                ) : (
                  <span className="text-xs text-zinc-500 italic">
                    {t("Selecteer een sprint hierboven om deze story te koppelen")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Story Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-7 max-w-3xl w-full space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Plus className="size-4 text-brand" />
                <span>{t("Nieuwe Story Aanmaken")}</span>
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-zinc-400 hover:text-white text-base cursor-pointer p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewStory} className="space-y-4 text-xs">
              {/* Type, Number, Sprint Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-medium">{t("Story Type")}</label>
                  <select
                    value={newStoryTypeCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      setNewStoryTypeCode(code);
                      setNewQualityCriteria(getDefaultQualityCriteriaForType(code));
                    }}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl p-2.5 text-zinc-200 text-xs focus:outline-none focus:border-brand"
                  >
                    <option value="US">US - User Story</option>
                    <option value="RS">RS - Research Story</option>
                    <option value="LS">LS - Learning Story</option>
                    {storyTypes
                      .filter((t) => !["US", "RS", "LS"].includes(t.code.toUpperCase()))
                      .map((t) => (
                        <option key={t.id} value={t.code}>
                          {t.code} - {t.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-medium">{t("Story Nummer (optioneel)")}</label>
                  <input
                    type="text"
                    value={newStoryNumber}
                    onChange={(e) => setNewStoryNumber(e.target.value)}
                    placeholder="US 1.1"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl p-2.5 text-zinc-200 text-xs font-mono focus:outline-none focus:border-brand"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-medium">{t("Sprint Koppeling")}</label>
                  <select
                    value={newSprintId}
                    onChange={(e) => setNewSprintId(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl p-2.5 text-zinc-200 text-xs focus:outline-none focus:border-brand cursor-pointer"
                  >
                    <option value="">{t("Geen sprint (Concept / Backlog)")}</option>
                    {sprints.map((sp) => (
                      <option key={sp.id} value={String(sp.id)}>
                        {sp.sprintNumber}: {sp.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="text-zinc-400 font-medium">{t("Titel van de story")} *</label>
                <input
                  type="text"
                  required
                  value={newStoryTitle}
                  onChange={(e) => setNewStoryTitle(e.target.value)}
                  placeholder={t("bv. Recepten filteren op bereidingstijd")}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-2.5 text-white text-xs sm:text-sm focus:outline-none focus:border-brand"
                />
              </div>

              {/* Als / Wil ik / Zodat */}
              <div className="p-4 rounded-xl bg-zinc-950/70 border border-white/5 space-y-3">
                <div className="text-zinc-300 font-semibold text-xs flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-brand" />
                  <span>{t("User Story Template")}</span>
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newAsA}
                    onChange={(e) => setNewAsA(e.target.value)}
                    placeholder={t("Als [rol/gebruiker], bv. thuiskok")}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand"
                  />
                  <input
                    type="text"
                    value={newIWant}
                    onChange={(e) => setNewIWant(e.target.value)}
                    placeholder={t("wil ik [wens/functionaliteit], bv. recepten kunnen sorteren op kooktijd")}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand"
                  />
                  <input
                    type="text"
                    value={newSoThat}
                    onChange={(e) => setNewSoThat(e.target.value)}
                    placeholder={t("zodat [doel/waarde], bv. ik snel een recept kan vinden dat past bij mijn beschikbare tijd")}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand"
                  />
                </div>
              </div>

              {/* Learning Outcomes */}
              <div className="space-y-1">
                <label className="text-zinc-400 font-medium block">{t("Leeruitkomsten (LU)")}</label>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 4, 5].map((lu) => {
                    const selected = newSelectedLUs.includes(lu);
                    return (
                      <button
                        key={lu}
                        type="button"
                        onClick={() => {
                          setNewSelectedLUs((prev) =>
                            prev.includes(lu) ? prev.filter((x) => x !== lu) : [...prev, lu]
                          );
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold cursor-pointer transition-all ${
                          selected
                            ? "bg-brand/20 border-brand/40 text-brand"
                            : "bg-zinc-950 border-white/10 text-zinc-400 hover:text-white"
                        }`}
                      >
                        LU {lu}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="text-zinc-400 font-medium">{t("Status")}</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as "todo" | "in_progress" | "done")}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-2.5 text-zinc-200 text-xs focus:outline-none focus:border-brand"
                >
                  <option value="todo">{t("To Do")}</option>
                  <option value="in_progress">{t("Bezig")}</option>
                  <option value="done">{t("Voltooid")}</option>
                </select>
              </div>

              {/* Criteria */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-zinc-400 font-medium">{t("Acceptatiecriteria")}</label>
                  <button
                    type="button"
                    onClick={() => setNewAcceptanceCriteria((prev) => [...prev, { text: "", isCompleted: false, indent: 0 }])}
                    className="text-xs text-brand hover:underline cursor-pointer"
                  >
                    + {t("Criterium toevoegen")}
                  </button>
                </div>
                {newAcceptanceCriteria.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={c.text}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewAcceptanceCriteria((prev) => prev.map((item, idx) => (idx === i ? { ...item, text: val } : item)));
                      }}
                      placeholder={t("bv. Er is een sorteerknop beschikbaar op de receptenpagina")}
                      className="flex-1 bg-zinc-950 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-brand"
                    />
                    <button
                      type="button"
                      onClick={() => setNewAcceptanceCriteria((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-zinc-500 hover:text-red-400 p-1.5 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white text-xs cursor-pointer"
                >
                  {t("Annuleren")}
                </button>
                <button
                  type="submit"
                  disabled={savingNewStory || !newStoryTitle.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold bg-brand text-zinc-950 hover:bg-brand-hover transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <Check className="size-4" />
                  <span>{savingNewStory ? t("Aanmaken...") : t("Story Aanmaken")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

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

function StoryCard({
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
      style={{ ["--story-type-color" as string]: typeDetails.color } as React.CSSProperties}
      className={`p-5 sm:p-6 rounded-2xl bg-zinc-900/80 border border-white/10 ${typeDetails.hoverBorderClass} hover:bg-zinc-800/40 transition-all space-y-4 cursor-pointer group`}
    >
      {/* Top Row: Type Badge, Story Number, Title, Sprint Tag, LU Badges, Status Select */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Prominent Story Type Badge */}
          <StoryTypeBadge code={story.storyTypeCode} storyTypes={storyTypes} showName size="md" />

          {story.storyNumber && (
            <span className="text-xs sm:text-sm font-mono font-bold text-zinc-300 bg-zinc-950 px-2.5 py-1 rounded-lg border border-white/5">
              {story.storyNumber}
            </span>
          )}

          <h3 className={`text-base sm:text-lg font-bold text-white tracking-tight ${typeDetails.hoverTextClass} transition-colors`}>
            {story.title}
          </h3>
        </div>

        <div
          className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sprint Badge / Concept Badge */}
          {story.sprintNumber ? (
            <Link
              href={`/minor/sprints/${story.sprintId}`}
              className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-zinc-950 border border-white/10 text-zinc-400 hover:text-white hover:border-brand/40 transition-all flex items-center gap-1.5"
              title={story.sprintName || undefined}
            >
              <span>{story.sprintNumber}</span>
              <ExternalLink className="size-3 opacity-60" />
            </Link>
          ) : (
            <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-zinc-950 border border-amber-500/20 text-amber-400/80">
              {t("Concept")}
            </span>
          )}

          {/* Learning Outcomes */}
          <div className="flex items-center gap-1.5">
            {story.learningOutcomes.map((lu) => (
              <span
                key={lu}
                className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-white/5"
              >
                LU {lu}
              </span>
            ))}
          </div>

          {/* Status Dropdown */}
          <select
            value={story.status}
            onChange={(e) => onStatusChange(story.id, e.target.value as "todo" | "in_progress" | "done")}
            className={`text-xs font-semibold uppercase px-3 py-1.5 rounded-lg border cursor-pointer ${
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-white/5">
        <div className="flex items-center gap-4 text-xs sm:text-sm text-zinc-400">
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

        {totalCriteria > 0 && (
          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onToggleExpand}
              className="text-xs sm:text-sm text-zinc-400 hover:text-white flex items-center gap-1 font-medium transition-colors cursor-pointer"
            >
              <span>{isExpanded ? t("Criteria verbergen") : t("Criteria bekijken")}</span>
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
                {t("Bewijslast & Links")}
              </div>
              <div className="flex flex-wrap gap-2">
                {story.evidence.map((ev) => (
                  <a
                    key={ev.id}
                    href={ev.url}
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

