"use client";

import { api } from "@/lib/api";
import { useState, useEffect } from "react";
import type { MinorSprint, MinorSprintFull, MinorStory, MinorStoryWithSprint } from "@/lib/api";

export function useStoryLinking(sprint: MinorSprintFull, setSprint: React.Dispatch<React.SetStateAction<MinorSprintFull>>, reloadSprint: (keepLocalEvals?: boolean) => Promise<void>, setViewingStoryId: (id: number | null) => void) {
  const [isUnlinkModalOpen, setIsUnlinkModalOpen] = useState(false);
  const [storyToUnlink, setStoryToUnlink] = useState<MinorStory | null>(null);
  const [targetSprintIdForUnlink, setTargetSprintIdForUnlink] = useState<string>("");
  const [allSprints, setAllSprints] = useState<MinorSprint[]>([]);
  const [unlinkingStory, setUnlinkingStory] = useState(false);

  const [isLinkStoryModalOpen, setIsLinkStoryModalOpen] = useState(false);
  const [availableConceptStories, setAvailableConceptStories] = useState<MinorStoryWithSprint[]>([]);
  const [loadingConceptStories, setLoadingConceptStories] = useState(false);
  const [linkingStoryId, setLinkingStoryId] = useState<number | null>(null);
  const [linkSearchQuery, setLinkSearchQuery] = useState("");

  async function openLinkStoryModal() {
    setIsLinkStoryModalOpen(true);
    setLoadingConceptStories(true);
    setLinkSearchQuery("");
    try {
      const all = await api.minor.stories.list();
      // Unassigned stories (sprintId is null or != current sprint id)
      const unassigned = all.filter((s) => !s.sprintId);
      setAvailableConceptStories(unassigned);
    } catch (err) {
      console.error("Failed to load concept stories:", err);
    } finally {
      setLoadingConceptStories(false);
    }
  }

  async function handleLinkStory(storyId: number) {
    setLinkingStoryId(storyId);
    try {
      await api.minor.stories.update(storyId, { sprintId: sprint.id });
      await reloadSprint();
      setAvailableConceptStories((prev) => prev.filter((s) => s.id !== storyId));
      setIsLinkStoryModalOpen(false);
    } catch (err) {
      console.error("Failed to link story:", err);
    } finally {
      setLinkingStoryId(null);
    }
  }

  async function moveStoryUpDirect(idx: number) {
    if (idx <= 0) return;
    await swapStories(idx, idx - 1);
  }

  async function moveStoryDownDirect(idx: number) {
    if (!sprint || idx >= (sprint.stories?.length ?? 0) - 1) return;
    await swapStories(idx, idx + 1);
  }

  async function swapStories(from: number, to: number) {
    if (!sprint) return;
    const stories = [...(sprint.stories ?? [])];
    const movedItem = stories[from];
    const movedId = movedItem?.id ?? to;
    const temp = stories[from];
    stories[from] = stories[to];
    stories[to] = temp;
    const reindexed = stories.map((st, i) => ({ ...st, orderIndex: i + 1 }));
    setSprint({ ...sprint, stories: reindexed });

    try {
      await api.minor.sprints.stories.reorder(
        sprint.id,
        reindexed.map((s) => s.id)
      );
    } catch (err) {
      console.error("Failed to persist reordered stories", err);
      await reloadSprint();
    }

    setTimeout(() => {
      const el =
        document.getElementById(`sprint-story-${movedId}`) ||
        document.querySelector(`[data-story-id="${movedId}"]`);
      if (el) {
        const rect = el.getBoundingClientRect();
        const isVeryTall = rect.height > window.innerHeight * 0.75;
        el.scrollIntoView({
          behavior: "smooth",
          block: isVeryTall ? "start" : "center",
        });
      }
    }, 60);
  }

  function openUnlinkStoryModal(st: MinorStory) {
    setStoryToUnlink(st);
    setTargetSprintIdForUnlink("");
    setIsUnlinkModalOpen(true);
  }

  async function handleConfirmUnlinkOrMove() {
    if (!storyToUnlink) return;
    setUnlinkingStory(true);
    try {
      const targetSprintId = targetSprintIdForUnlink ? Number(targetSprintIdForUnlink) : null;
      await api.minor.stories.update(storyToUnlink.id, { sprintId: targetSprintId });
      setIsUnlinkModalOpen(false);
      setStoryToUnlink(null);
      setViewingStoryId(null);
      await reloadSprint();
    } catch (err) {
      console.error("Failed to unlink or move story:", err);
    } finally {
      setUnlinkingStory(false);
    }
  }
  useEffect(() => {
    api.minor.sprints.list().then(setAllSprints).catch(() => {});
  }, []);

  return {
    isUnlinkModalOpen,
    setIsUnlinkModalOpen,
    storyToUnlink,
    setStoryToUnlink,
    targetSprintIdForUnlink,
    setTargetSprintIdForUnlink,
    allSprints,
    setAllSprints,
    unlinkingStory,
    setUnlinkingStory,
    isLinkStoryModalOpen,
    setIsLinkStoryModalOpen,
    availableConceptStories,
    setAvailableConceptStories,
    loadingConceptStories,
    setLoadingConceptStories,
    linkingStoryId,
    setLinkingStoryId,
    linkSearchQuery,
    setLinkSearchQuery,
    openLinkStoryModal,
    handleLinkStory,
    moveStoryUpDirect,
    moveStoryDownDirect,
    swapStories,
    openUnlinkStoryModal,
    handleConfirmUnlinkOrMove,
  };
}
