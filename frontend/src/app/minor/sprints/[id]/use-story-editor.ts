"use client";

import { t } from "@/lib/lang";
import { api } from "@/lib/api";
import { useState } from "react";
import type { MinorSprintFull, MinorStory, MinorStoryType } from "@/lib/api";

export function useStoryEditor(sprint: MinorSprintFull, setSprint: React.Dispatch<React.SetStateAction<MinorSprintFull>>, storyTypes: MinorStoryType[], reloadSprint: (keepLocalEvals?: boolean) => Promise<void>, setViewingStoryId: (id: number | null) => void) {
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);

  const [editingStory, setEditingStory] = useState<MinorStory | null>(null);

  const [storyTypeCode, setStoryTypeCode] = useState("US");
  const [storyNumber, setStoryNumber] = useState("");
  const [storyTitle, setStoryTitle] = useState("");
  const [asA, setAsA] = useState("");
  const [iWant, setIWant] = useState("");
  const [soThat, setSoThat] = useState("");
  const [selectedLUs, setSelectedLUs] = useState<number[]>([]);
  const [storyStatus, setStoryStatus] = useState<"todo" | "in_progress" | "done">("todo");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<{ text: string; isCompleted: boolean; indent?: number }[]>([]);
  const [qualityCriteria, setQualityCriteria] = useState<{ text: string; isCompleted: boolean; indent?: number }[]>([]);
  const [focusTarget, setFocusTarget] = useState<{ type: "acceptance" | "quality"; index: number } | null>(null);
  const [evidenceList, setEvidenceList] = useState<{ type: "link" | "github" | "document" | "app"; title: string; url: string }[]>([]);
  const [savingStory, setSavingStory] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [copiedExport, setCopiedExport] = useState(false);

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

  // Story Helpers
  function openCreateStoryModal() {
    setEditingStory(null);
    setStoryTypeCode("US");
    setStoryNumber(`US ${(sprint.stories.length + 1).toFixed(1)}`);
    setStoryTitle("");
    setAsA("");
    setIWant("");
    setSoThat("");
    setSelectedLUs([1, 2]);
    setStoryStatus("todo");
    setAcceptanceCriteria([{ text: "", isCompleted: false, indent: 0 }]);
    setQualityCriteria(getDefaultQualityCriteriaForType("US"));
    setEvidenceList([]);
    setIsStoryModalOpen(true);
  }

  function openEditStoryModal(st: MinorStory) {
    setEditingStory(st);
    setStoryTypeCode(st.storyTypeCode);
    setStoryNumber(st.storyNumber || "");
    setStoryTitle(st.title);
    setAsA(st.asA || "");
    setIWant(st.iWant || "");
    setSoThat(st.soThat || "");
    setSelectedLUs(st.learningOutcomes);
    setStoryStatus(st.status);
    setAcceptanceCriteria(
      st.criteria?.filter((c) => c.type === "acceptance").map((c) => ({ text: c.text, isCompleted: c.isCompleted, indent: c.indent || 0 })) || [
        { text: "", isCompleted: false, indent: 0 },
      ]
    );
    setQualityCriteria(
      st.criteria?.filter((c) => c.type === "quality").map((c) => ({ text: c.text, isCompleted: c.isCompleted, indent: c.indent || 0 })) || [
        { text: "", isCompleted: false, indent: 0 },
      ]
    );
    setEvidenceList(
      st.evidence?.map((e) => ({ type: e.type as "link" | "github" | "document" | "app", title: e.title, url: e.url })) || []
    );
    setIsStoryModalOpen(true);
  }

  function addAcceptanceCriterion(indent: number = 0) {
    setAcceptanceCriteria((prev) => {
      const next = [...prev, { text: "", isCompleted: false, indent }];
      setFocusTarget({ type: "acceptance", index: next.length - 1 });
      return next;
    });
  }

  function addQualityCriterion(indent: number = 0) {
    setQualityCriteria((prev) => {
      const next = [...prev, { text: "", isCompleted: false, indent }];
      setFocusTarget({ type: "quality", index: next.length - 1 });
      return next;
    });
  }

  async function handleSaveStory(e: React.FormEvent) {
    e.preventDefault();
    if (!storyTitle.trim()) return;
    setSavingStory(true);
    try {
      const payload = {
        storyTypeCode,
        storyNumber: storyNumber.trim() || undefined,
        title: storyTitle.trim(),
        asA: asA.trim() || undefined,
        iWant: iWant.trim() || undefined,
        soThat: soThat.trim() || undefined,
        learningOutcomes: selectedLUs,
        status: storyStatus,
        acceptanceCriteria: acceptanceCriteria.filter((c) => c.text.trim()),
        qualityCriteria: qualityCriteria.filter((c) => c.text.trim()),
        evidence: evidenceList.filter((e) => e.title.trim() && e.url.trim()),
        presentationData: editingStory?.presentationData ?? undefined,
      };

      let targetStoryId: number | null = null;
      if (editingStory) {
        const updated = await api.minor.sprints.stories.update(editingStory.id, payload);
        targetStoryId = updated?.id ?? editingStory.id;
      } else {
        const created = await api.minor.sprints.stories.create(sprint.id, payload);
        targetStoryId = created?.id ?? null;
      }

      await reloadSprint();
      setIsStoryModalOpen(false);
      if (targetStoryId) {
        setViewingStoryId(targetStoryId);
      }
    } catch (err) {
      console.error("Failed to save story:", err);
    } finally {
      setSavingStory(false);
    }
  }

  async function handleDeleteStory(storyId: number) {
    if (!confirm(t("Weet je zeker dat je deze story wilt verwijderen?"))) return;
    try {
      await api.minor.stories.delete(storyId);
      await reloadSprint();
      setIsStoryModalOpen(false);
      setViewingStoryId(null);
    } catch (err) {
      console.error("Failed to delete story:", err);
    }
  }

  function handleExportStoryDirect(st: MinorStory) {
    const payload = {
      storyTypeCode: st.storyTypeCode,
      storyNumber: st.storyNumber || undefined,
      title: st.title,
      asA: st.asA || undefined,
      iWant: st.iWant || undefined,
      soThat: st.soThat || undefined,
      learningOutcomes: st.learningOutcomes,
      status: st.status,
      acceptanceCriteria: st.criteria
        ?.filter((c) => c.type === "acceptance")
        .map((c) => ({ text: c.text, isCompleted: c.isCompleted, indent: c.indent || 0 })) || [],
      qualityCriteria: st.criteria
        ?.filter((c) => c.type === "quality")
        .map((c) => ({ text: c.text, isCompleted: c.isCompleted, indent: c.indent || 0 })) || [],
      evidence: st.evidence?.map((e) => ({ type: e.type, title: e.title, url: e.url })) || [],
    };

    const json = JSON.stringify(payload, null, 2);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(json).then(() => {
        setCopiedExport(true);
        setTimeout(() => setCopiedExport(false), 2000);
      }).catch((err) => {
        console.error("Clipboard write failed:", err);
      });
    }
  }

  async function handleToggleCriterion(critId: number, current: boolean) {
    try {
      await api.minor.sprints.stories.toggleCriterion(critId, !current);
      setSprint((prev) => ({
        ...prev,
        stories: prev.stories.map((s) => ({
          ...s,
          criteria: s.criteria?.map((c) => (c.id === critId ? { ...c, isCompleted: !current } : c)),
        })),
      }));
    } catch (err) {
      console.error("Failed to toggle criterion:", err);
    }
  }

  async function handleFileUpload(file: File) {
    setUploadingFile(true);
    try {
      const res = await api.minor.upload(file);
      setEvidenceList((prev) => [
        ...prev,
        {
          type: "document",
          title: res.originalName || file.name,
          url: res.filePath,
        },
      ]);
    } catch (err) {
      console.error("File upload failed:", err);
    } finally {
      setUploadingFile(false);
    }
  }

  function handleExportStoryJson() {
    const payload = {
      storyTypeCode,
      storyNumber: storyNumber.trim() || undefined,
      title: storyTitle.trim(),
      asA: asA.trim() || undefined,
      iWant: iWant.trim() || undefined,
      soThat: soThat.trim() || undefined,
      learningOutcomes: selectedLUs,
      status: storyStatus,
      acceptanceCriteria: acceptanceCriteria
        .filter((c) => c.text.trim())
        .map((c) => ({ text: c.text.trim(), isCompleted: c.isCompleted, indent: c.indent || 0 })),
      qualityCriteria: qualityCriteria
        .filter((c) => c.text.trim())
        .map((c) => ({ text: c.text.trim(), isCompleted: c.isCompleted, indent: c.indent || 0 })),
      evidence: evidenceList
        .filter((e) => e.title.trim() && e.url.trim())
        .map((e) => ({ type: e.type, title: e.title.trim(), url: e.url.trim() })),
    };

    const json = JSON.stringify(payload, null, 2);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(json).then(() => {
        setCopiedExport(true);
        setTimeout(() => setCopiedExport(false), 2000);
      }).catch((err) => {
        console.error("Clipboard write failed:", err);
      });
    }
  }

  return {
    isStoryModalOpen,
    setIsStoryModalOpen,
    editingStory,
    setEditingStory,
    storyTypeCode,
    setStoryTypeCode,
    storyNumber,
    setStoryNumber,
    storyTitle,
    setStoryTitle,
    asA,
    setAsA,
    iWant,
    setIWant,
    soThat,
    setSoThat,
    selectedLUs,
    setSelectedLUs,
    storyStatus,
    setStoryStatus,
    acceptanceCriteria,
    setAcceptanceCriteria,
    qualityCriteria,
    setQualityCriteria,
    focusTarget,
    setFocusTarget,
    evidenceList,
    setEvidenceList,
    savingStory,
    setSavingStory,
    uploadingFile,
    setUploadingFile,
    copiedExport,
    setCopiedExport,
    getDefaultQualityCriteriaForType,
    openCreateStoryModal,
    openEditStoryModal,
    addAcceptanceCriterion,
    addQualityCriterion,
    handleSaveStory,
    handleDeleteStory,
    handleExportStoryDirect,
    handleToggleCriterion,
    handleFileUpload,
    handleExportStoryJson,
  };
}
