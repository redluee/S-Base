"use client";

import { useState, useMemo, useEffect } from "react";
import { Layers, Plus } from "lucide-react";
import { t } from "@/lib/lang";
import {
  api,
  type MinorSprint,
  type MinorStoryWithSprint,
  type MinorStoryType,
} from "@/lib/api";
import { StoryMetrics } from "./story-metrics";
import { StoryFilters } from "./story-filters";
import { StoryList } from "./story-list";
import { StoryViewModal } from "./story-view-modal";
import { StoryCreateModal } from "./story-create-modal";

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
      if (created?.id) {
        setViewingStoryId(created.id);
      }
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => setGroupBySprint(!groupBySprint)}
            title={groupBySprint ? t("Gegroepeerd per sprint") : t("Vlakke lijst")}
            aria-label={groupBySprint ? t("Gegroepeerd per sprint") : t("Vlakke lijst")}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
              groupBySprint
                ? "bg-zinc-800 border-white/20 text-white"
                : "bg-zinc-900/60 border-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            <Layers className="size-3.5" />
            <span className="hidden sm:inline">{groupBySprint ? t("Gegroepeerd per sprint") : t("Vlakke lijst")}</span>
            <span className="sm:hidden">{groupBySprint ? t("Gegroepeerd") : t("Lijst")}</span>
          </button>

          <button
            onClick={openCreateStoryModal}
            title={t("Nieuwe Story")}
            aria-label={t("Nieuwe Story")}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold bg-brand text-zinc-950 hover:bg-brand-hover transition-all cursor-pointer shadow-sm"
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">{t("Nieuwe Story")}</span>
          </button>
        </div>
      </div>


      <StoryMetrics
        totalCount={totalCount}
        conceptCount={conceptCount}
        doneCount={doneCount}
        inProgressCount={inProgressCount}
        todoCount={todoCount}
        usCount={usCount}
        rsCount={rsCount}
        lsCount={lsCount}
        completionPct={completionPct}
      />

      <StoryFilters
        sprints={sprints}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedSprintId={selectedSprintId}
        setSelectedSprintId={setSelectedSprintId}
        selectedType={selectedType}
        setSelectedType={setSelectedType}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        selectedLU={selectedLU}
        setSelectedLU={setSelectedLU}
      />

      <StoryList
        storyTypes={storyTypes}
        sprints={sprints}
        filteredStories={filteredStories}
        sprintGroups={sprintGroups}
        groupBySprint={groupBySprint}
        expandedStoryIds={expandedStoryIds}
        setViewingStoryId={setViewingStoryId}
        toggleExpand={toggleExpand}
        handleToggleCriterion={handleToggleCriterion}
        handleStatusChange={handleStatusChange}
      />

      {viewingStory && (
        <StoryViewModal
          storyTypes={storyTypes}
          sprints={sprints}
          viewingStory={viewingStory}
          handleToggleCriterion={handleToggleCriterion}
          handleStatusChange={handleStatusChange}
          handleLinkStoryToSprint={handleLinkStoryToSprint}
          onClose={() => setViewingStoryId(null)}
        />
      )}

      {isCreateModalOpen && (
        <StoryCreateModal
          storyTypes={storyTypes}
          sprints={sprints}
          getDefaultQualityCriteriaForType={getDefaultQualityCriteriaForType}
          newSprintId={newSprintId}
          setNewSprintId={setNewSprintId}
          newStoryTypeCode={newStoryTypeCode}
          setNewStoryTypeCode={setNewStoryTypeCode}
          newStoryNumber={newStoryNumber}
          setNewStoryNumber={setNewStoryNumber}
          newStoryTitle={newStoryTitle}
          setNewStoryTitle={setNewStoryTitle}
          newAsA={newAsA}
          setNewAsA={setNewAsA}
          newIWant={newIWant}
          setNewIWant={setNewIWant}
          newSoThat={newSoThat}
          setNewSoThat={setNewSoThat}
          newSelectedLUs={newSelectedLUs}
          setNewSelectedLUs={setNewSelectedLUs}
          newStatus={newStatus}
          setNewStatus={setNewStatus}
          newAcceptanceCriteria={newAcceptanceCriteria}
          setNewAcceptanceCriteria={setNewAcceptanceCriteria}
          setNewQualityCriteria={setNewQualityCriteria}
          savingNewStory={savingNewStory}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleSaveNewStory}
        />
      )}
    </div>
  );
}
