"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  AlertTriangle,
  Layers,
  ArrowLeft,
  Plus,
  Trash2,
  Edit3,
  CheckSquare,
  Square,
  Sparkles,
  FileSpreadsheet,
  FileText,
  ExternalLink,
  Save,
  CheckCircle2,
  Upload,
  Download,
  Link2,
  Unlink,
  Search,
  CornerDownRight,
  Copy,
  Check,
} from "lucide-react";
import { t } from "@/lib/lang";
import {
  api,
  type MinorSprint,
  type MinorSprintFull,
  type MinorStory,
  type MinorStoryWithSprint,
  type MinorStoryType,
  type MinorSelfEvaluation,
  type MinorTeacherAssessment,
} from "@/lib/api";
import { downloadSprintPDF } from "@/components/minor-pdf";
import { downloadSprintExcel } from "@/lib/minor-excel";
import { StoryTypeBadge, getStoryTypeDetails } from "@/components/minor-story-type-badge";
import { getLUShortDesc } from "@/lib/minor-constants";

interface MinorSprintDetailClientProps {
  initialSprint: MinorSprintFull;
  initialStoryTypes: MinorStoryType[];
}

export function MinorSprintDetailClient({ initialSprint, initialStoryTypes }: MinorSprintDetailClientProps) {
  const [sprint, setSprint] = useState<MinorSprintFull>(initialSprint);
  const [activeTab, setActiveTab] = useState<"planning" | "feedback" | "self_eval" | "reflection">("planning");
  const [storyTypes, setStoryTypes] = useState<MinorStoryType[]>(initialStoryTypes || []);

  // Story Modal & View State
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [viewingStoryId, setViewingStoryId] = useState<number | null>(null);
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

  // Story Unlink / Move Modal State
  const [isUnlinkModalOpen, setIsUnlinkModalOpen] = useState(false);
  const [storyToUnlink, setStoryToUnlink] = useState<MinorStory | null>(null);
  const [targetSprintIdForUnlink, setTargetSprintIdForUnlink] = useState<string>("");
  const [allSprints, setAllSprints] = useState<MinorSprint[]>([]);
  const [unlinkingStory, setUnlinkingStory] = useState(false);

  const viewingStory = sprint.stories.find((s) => s.id === viewingStoryId) || null;

  // Link Concept Story Modal State
  const [isLinkStoryModalOpen, setIsLinkStoryModalOpen] = useState(false);
  const [availableConceptStories, setAvailableConceptStories] = useState<MinorStoryWithSprint[]>([]);
  const [loadingConceptStories, setLoadingConceptStories] = useState(false);
  const [linkingStoryId, setLinkingStoryId] = useState<number | null>(null);
  const [linkSearchQuery, setLinkSearchQuery] = useState("");

  // Story Import Modal State
  const [isImportStoryModalOpen, setIsImportStoryModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [isImportingStory, setIsImportingStory] = useState(false);

  // Dynamic Feedback Row State
  const [fbDate, setFbDate] = useState(new Date().toISOString().slice(0, 10));
  const [fbFromWhom, setFbFromWhom] = useState("");
  const [fbText, setFbText] = useState("");
  const [fbAction, setFbAction] = useState("");
  const [addingFeedback, setAddingFeedback] = useState(false);

  // Self Evaluation & Teacher Assessment Edit State
  const [selfEvals, setSelfEvals] = useState<MinorSelfEvaluation[]>(initialSprint.selfEvaluations);
  const [teacherAssessments, setTeacherAssessments] = useState<MinorTeacherAssessment[]>(initialSprint.teacherAssessments);
  const [savingEvals, setSavingEvals] = useState(false);
  const [evalSaveSuccess, setEvalSaveSuccess] = useState(false);

  // Reflection State
  const [refDate, setRefDate] = useState(initialSprint.reflection?.date || new Date().toISOString().slice(0, 10));
  const [whatLearned, setWhatLearned] = useState(initialSprint.reflection?.whatLearned || "");
  const [whatRetained, setWhatRetained] = useState(initialSprint.reflection?.whatRetained || "");
  const [whatChange, setWhatChange] = useState(initialSprint.reflection?.whatChange || "");
  const [savingReflection, setSavingReflection] = useState(false);
  const [refSaveSuccess, setRefSaveSuccess] = useState(false);

  // Missing Feedback Pre-export Warning Modal State
  const [pendingExportType, setPendingExportType] = useState<"pdf" | "excel" | null>(null);

  useEffect(() => {
    api.minor.storyTypes.list().then(setStoryTypes).catch(() => {});
    api.minor.sprints.list().then(setAllSprints).catch(() => {});
  }, []);

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

  async function reloadSprint() {
    try {
      const updated = await api.minor.sprints.get(sprint.id);
      setSprint(updated);
      setSelfEvals(updated.selfEvaluations);
      setTeacherAssessments(updated.teacherAssessments);
      if (updated.reflection) {
        setRefDate(updated.reflection.date);
        setWhatLearned(updated.reflection.whatLearned || "");
        setWhatRetained(updated.reflection.whatRetained || "");
        setWhatChange(updated.reflection.whatChange || "");
      }
    } catch (err) {
      console.error("Failed to reload sprint:", err);
    }
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

  function parseStoryJson(rawJson: string) {
    let data: unknown;
    try {
      data = JSON.parse(rawJson);
    } catch {
      throw new Error(t("Ongeldig JSON-formaat. Controleer de syntax."));
    }

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error(t("Ongeldige JSON structuur."));
    }

    const obj = data as Record<string, unknown>;

    const rawTitle = obj.title ?? obj.name ?? "";
    const title = String(rawTitle).trim();
    if (!title) {
      throw new Error(t("Titel van de story is verplicht in JSON."));
    }

    const rawTypeCode = obj.storyTypeCode ?? obj.type ?? obj.storyType ?? "US";
    const typeCode = String(rawTypeCode).trim().toUpperCase();

    const rawNum = obj.storyNumber ?? obj.number;
    const num = rawNum != null ? String(rawNum).trim() : undefined;

    const rawAsA = obj.asA ?? obj.as_a ?? obj.role;
    const asARole = rawAsA != null ? String(rawAsA).trim() : undefined;

    const rawIWant = obj.iWant ?? obj.i_want ?? obj.want;
    const iWantWens = rawIWant != null ? String(rawIWant).trim() : undefined;

    const rawSoThat = obj.soThat ?? obj.so_that ?? obj.purpose;
    const soThatDoel = rawSoThat != null ? String(rawSoThat).trim() : undefined;

    let learningOutcomes: number[] = [];
    const rawLUs = obj.learningOutcomes ?? obj.learning_outcomes ?? obj.lus ?? obj.lu;
    if (Array.isArray(rawLUs)) {
      learningOutcomes = rawLUs
        .map((n: unknown) => Number(n))
        .filter((n: number) => !isNaN(n) && n >= 1 && n <= 5);
    } else if (typeof rawLUs === "number" || typeof rawLUs === "string") {
      const parsed = Number(rawLUs);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) learningOutcomes = [parsed];
    }

    const statusStr = String(obj.status || "todo");
    const statusVal = (["todo", "in_progress", "done"].includes(statusStr) ? statusStr : "todo") as "todo" | "in_progress" | "done";

    let acceptance: { text: string; isCompleted?: boolean; indent?: number }[] = [];
    const rawAcceptance = obj.acceptanceCriteria ?? obj.acceptance_criteria;
    if (Array.isArray(rawAcceptance)) {
      acceptance = rawAcceptance
        .map((item: unknown) => {
          if (typeof item === "string") return { text: item.trim(), isCompleted: false, indent: 0 };
          if (item && typeof item === "object") {
            const crit = item as Record<string, unknown>;
            const textVal = String(crit.text ?? crit.title ?? "").trim();
            return {
              text: textVal,
              isCompleted: Boolean(crit.isCompleted),
              indent: crit.indent ? 1 : 0,
            };
          }
          return null;
        })
        .filter((item): item is { text: string; isCompleted: boolean; indent: number } => Boolean(item && item.text));
    }

    let quality: { text: string; isCompleted?: boolean; indent?: number }[] = [];
    const rawQuality = obj.qualityCriteria ?? obj.quality_criteria;
    if (Array.isArray(rawQuality)) {
      quality = rawQuality
        .map((item: unknown) => {
          if (typeof item === "string") return { text: item.trim(), isCompleted: false, indent: 0 };
          if (item && typeof item === "object") {
            const crit = item as Record<string, unknown>;
            const textVal = String(crit.text ?? crit.title ?? "").trim();
            return {
              text: textVal,
              isCompleted: Boolean(crit.isCompleted),
              indent: crit.indent ? 1 : 0,
            };
          }
          return null;
        })
        .filter((item): item is { text: string; isCompleted: boolean; indent: number } => Boolean(item && item.text));
    }

    if (Array.isArray(obj.criteria)) {
      obj.criteria.forEach((c: unknown) => {
        if (!c || typeof c !== "object") return;
        const crit = c as Record<string, unknown>;
        const textVal = String(crit.text ?? crit.title ?? "").trim();
        if (!textVal) return;
        const critObj = { text: textVal, isCompleted: Boolean(crit.isCompleted), indent: crit.indent ? 1 : 0 };
        if (crit.type === "quality") {
          quality.push(critObj);
        } else {
          acceptance.push(critObj);
        }
      });
    }

    let evidence: { type: "link" | "github" | "document" | "app"; title: string; url: string }[] = [];
    const rawEvidence = obj.evidence ?? obj.evidenceList;
    if (Array.isArray(rawEvidence)) {
      evidence = rawEvidence
        .map((e: unknown) => {
          if (!e || typeof e !== "object") return null;
          const ev = e as Record<string, unknown>;
          const evTitle = String(ev.title ?? "").trim();
          const evUrl = String(ev.url ?? "").trim();
          const evTypeStr = String(ev.type ?? "link");
          const evType = (["link", "github", "document", "app"].includes(evTypeStr) ? evTypeStr : "link") as "link" | "github" | "document" | "app";
          return { type: evType, title: evTitle, url: evUrl };
        })
        .filter((e): e is { type: "link" | "github" | "document" | "app"; title: string; url: string } => Boolean(e && e.title && e.url));
    }

    return {
      storyTypeCode: typeCode,
      storyNumber: num,
      title,
      asA: asARole,
      iWant: iWantWens,
      soThat: soThatDoel,
      learningOutcomes,
      status: statusVal,
      acceptanceCriteria: acceptance,
      qualityCriteria: quality,
      evidence,
    };
  }

  async function handlePasteClipboardToImport() {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setImportJsonText(text);
          setImportError(null);
        }
      }
    } catch (err) {
      console.error("Failed to read clipboard:", err);
    }
  }

  async function handleImportStory(e: React.FormEvent) {
    e.preventDefault();
    if (!importJsonText.trim()) {
      setImportError(t("Voer JSON in om te importeren."));
      return;
    }

    try {
      const payload = parseStoryJson(importJsonText);
      setIsImportingStory(true);
      setImportError(null);

      const created = await api.minor.sprints.stories.create(sprint.id, payload);
      await reloadSprint();
      setIsImportStoryModalOpen(false);
      setImportJsonText("");
      if (created?.id) {
        setViewingStoryId(created.id);
      }
    } catch (err: unknown) {
      console.error("Story import error:", err);
      const msg = err instanceof Error ? err.message : t("Fout bij importeren van story.");
      setImportError(msg);
    } finally {
      setIsImportingStory(false);
    }
  }

  // Feedback Helpers
  async function handleAddFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!fbFromWhom.trim() || !fbText.trim() || !fbAction.trim()) return;
    setAddingFeedback(true);
    try {
      await api.minor.sprints.feedback.create(sprint.id, {
        date: fbDate,
        fromWhom: fbFromWhom.trim(),
        feedback: fbText.trim(),
        action: fbAction.trim(),
      });
      setFbFromWhom("");
      setFbText("");
      setFbAction("");
      await reloadSprint();
    } catch (err) {
      console.error("Failed to add feedback:", err);
    } finally {
      setAddingFeedback(false);
    }
  }

  async function handleDeleteFeedback(id: number) {
    try {
      await api.minor.sprints.feedback.delete(id);
      await reloadSprint();
    } catch (err) {
      console.error("Failed to delete feedback:", err);
    }
  }

  // Self Evaluation Helpers
  async function handleAutoPopulateEvals() {
    try {
      const autoGenerated = await api.minor.sprints.autoSelfEvaluations(sprint.id);
      setSelfEvals(autoGenerated);
      await reloadSprint();
    } catch (err) {
      console.error("Failed to auto-populate self evals:", err);
    }
  }

  async function handleSaveEvalsAndAssessments() {
    setSavingEvals(true);
    try {
      await api.minor.sprints.saveSelfEvaluations(
        sprint.id,
        selfEvals.map((e) => ({
          learningOutcome: e.learningOutcome,
          level: e.level,
          argumentation: e.argumentation || "",
        }))
      );
      await api.minor.sprints.saveTeacherAssessments(
        sprint.id,
        teacherAssessments.map((a) => ({
          learningOutcome: a.learningOutcome,
          assessment: a.assessment,
          notes: a.notes || "",
        }))
      );
      setEvalSaveSuccess(true);
      setTimeout(() => setEvalSaveSuccess(false), 3000);
      await reloadSprint();
    } catch (err) {
      console.error("Failed to save evaluations:", err);
    } finally {
      setSavingEvals(false);
    }
  }

  // Reflection Helpers
  async function handleSaveReflection(e: React.FormEvent) {
    e.preventDefault();
    setSavingReflection(true);
    try {
      await api.minor.sprints.saveReflection(sprint.id, {
        date: refDate,
        whatLearned,
        whatRetained,
        whatChange,
      });
      setRefSaveSuccess(true);
      setTimeout(() => setRefSaveSuccess(false), 3000);
      await reloadSprint();
    } catch (err) {
      console.error("Failed to save reflection:", err);
    } finally {
      setSavingReflection(false);
    }
  }

  // Export with Pre-check (US 6.2)
  function handleTriggerExport(type: "pdf" | "excel") {
    if (sprint.feedback.length === 0) {
      setPendingExportType(type);
    } else {
      if (type === "pdf") downloadSprintPDF(sprint);
      else downloadSprintExcel(sprint);
    }
  }

  function handleConfirmExportIgnore() {
    if (pendingExportType === "pdf") {
      downloadSprintPDF(sprint);
    } else if (pendingExportType === "excel") {
      downloadSprintExcel(sprint);
    }
    setPendingExportType(null);
  }

  // Calculate unique LUs in sprint for warnings
  const uniqueLUsInSprint = new Set<number>();
  sprint.stories.forEach((st) => {
    st.learningOutcomes.forEach((lu) => uniqueLUsInSprint.add(lu));
  });
  const hasFewLUs = uniqueLUsInSprint.size < 3;
  const missingLU5 = !uniqueLUsInSprint.has(5);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Back Link & Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/minor/sprints"
            className="p-2 rounded-xl bg-zinc-900 border border-white/10 hover:border-brand/40 text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl sm:text-3xl text-white tracking-tight">
                {sprint.name}
              </h1>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-zinc-800 border border-white/10 text-zinc-300">
                {sprint.sprintNumber}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Periode: {sprint.startDate} t/m {sprint.endDate} · Show & Grow:{" "}
              <strong className="text-white">{sprint.showAndGrowDate}</strong>
            </p>
          </div>
        </div>

        {/* Export Toolbar */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => handleTriggerExport("pdf")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10 transition-all cursor-pointer"
            title={t("Exporteer deze sprint als PDF")}
          >
            <FileText className="size-3.5 text-brand" />
            <span>PDF</span>
          </button>
          <button
            onClick={() => handleTriggerExport("excel")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10 transition-all cursor-pointer"
            title={t("Exporteer deze sprint als Excel")}
          >
            <FileSpreadsheet className="size-3.5 text-emerald-400" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* Warnings & Vacation Banners */}
      <div className="space-y-2">
        {sprint.extendedDays > 0 && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <Calendar className="size-4 shrink-0 text-emerald-400" />
            <span>
              {t("Verlengd met {days} vakantiedagen", { days: String(sprint.extendedDays) })} i.v.m. geregistreerde vakantieperiode ({sprint.extensionReason}).
            </span>
          </div>
        )}

        {(hasFewLUs || missingLU5) && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0 text-amber-400" />
            <div className="space-y-0.5">
              {hasFewLUs && (
                <p>
                  {t("Minder dan 3 leeruitkomsten geselecteerd in deze sprint.")} ({uniqueLUsInSprint.size} {t("geselecteerd")})
                </p>
              )}
              {missingLU5 && (
                <p>{t("Leeruitkomst 5 (LU 5) ontbreekt in deze sprint.")}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Section Tabs (1. PLANNING, 2. FEEDBACK, 3. ZELFEVALUATIE & BEOORDELING, 4. REFLECTIE) */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto">
        {[
          { id: "planning", label: "1. Planning", icon: Layers },
          { id: "feedback", label: "2. Feedback", icon: Clock },
          { id: "self_eval", label: "3. Zelfevaluatie & Beoordeling", icon: CheckCircle2 },
          { id: "reflection", label: "4. Reflectie", icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as "planning" | "feedback" | "self_eval" | "reflection")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                active
                  ? "bg-brand/15 text-brand border border-brand/30"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
              }`}
            >
              <Icon className="size-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: 1. PLANNING */}
      {activeTab === "planning" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight">
              {t("Sprintplanning & Stories")} ({sprint.stories.length})
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openLinkStoryModal}
                title={t("Bestaande concept story koppelen")}
                aria-label={t("Bestaande concept story koppelen")}
                className="p-2 rounded-lg text-zinc-400 hover:text-white bg-zinc-900 border border-white/10 hover:border-white/20 transition-all cursor-pointer flex items-center justify-center"
              >
                <Link2 className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportJsonText("");
                  setImportError(null);
                  setIsImportStoryModalOpen(true);
                }}
                title={t("Story importeren (JSON)")}
                aria-label={t("Story importeren (JSON)")}
                className="p-2 rounded-lg text-zinc-400 hover:text-white bg-zinc-900 border border-white/10 hover:border-white/20 transition-all cursor-pointer flex items-center justify-center"
              >
                <Download className="size-3.5" />
              </button>
              <button
                onClick={openCreateStoryModal}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-brand text-zinc-950 hover:bg-brand-hover transition-all cursor-pointer"
              >
                <Plus className="size-3.5" />
                <span>{t("Nieuwe Story")}</span>
              </button>
            </div>
          </div>

          {sprint.stories.length === 0 ? (
            <div className="p-12 rounded-2xl bg-zinc-900/40 border border-white/10 text-center text-zinc-400 text-xs space-y-3">
              <Layers className="size-8 text-zinc-600 mx-auto" />
              <p>{t("Geen stories in deze sprint.")}</p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={openLinkStoryModal}
                  title={t("Bestaande concept story koppelen")}
                  aria-label={t("Bestaande concept story koppelen")}
                  className="p-2 rounded-lg text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-all cursor-pointer flex items-center justify-center"
                >
                  <Link2 className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImportJsonText("");
                    setImportError(null);
                    setIsImportStoryModalOpen(true);
                  }}
                  title={t("Story importeren (JSON)")}
                  aria-label={t("Story importeren (JSON)")}
                  className="p-2 rounded-lg text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-all cursor-pointer flex items-center justify-center"
                >
                  <Download className="size-3.5" />
                </button>
                <button
                  onClick={openCreateStoryModal}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all cursor-pointer"
                >
                  {t("Voeg je eerste story toe")}
                </button>
              </div>
            </div>
          ) : (            <div className="space-y-2.5">
              {sprint.stories.map((st) => {
                const totalCriteria = st.criteria?.length || 0;
                const completedCriteria = st.criteria?.filter((c) => c.isCompleted).length || 0;
                const typeDetails = getStoryTypeDetails(st.storyTypeCode, storyTypes);

                return (
                  <div
                    key={st.id}
                    onClick={() => setViewingStoryId(st.id)}
                    style={{ ["--story-type-color" as string]: typeDetails.color } as React.CSSProperties}
                    className={`p-3.5 sm:p-4 rounded-xl bg-zinc-900/80 border border-white/10 ${typeDetails.hoverBorderClass} hover:bg-zinc-800/50 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-wrap sm:flex-nowrap">
                      <StoryTypeBadge code={st.storyTypeCode} storyTypes={storyTypes} showName size="sm" />
                      {st.storyNumber && (
                        <span className="text-xs font-mono font-bold text-zinc-300 bg-zinc-950 px-2 py-0.5 rounded border border-white/5 shrink-0">
                          {st.storyNumber}
                        </span>
                      )}
                      <h3 className={`text-sm font-semibold text-white tracking-tight truncate ${typeDetails.hoverTextClass} transition-colors`}>
                        {st.title}
                      </h3>
                    </div>

                    <div
                      className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap sm:flex-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {st.learningOutcomes && st.learningOutcomes.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {st.learningOutcomes.map((lu) => (
                            <span
                              key={lu}
                              className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-950 text-zinc-400 border border-white/5"
                            >
                              LU {lu}
                              {getLUShortDesc(lu) && (
                                <span className="font-sans font-normal text-zinc-500 ml-1">
                                  · {getLUShortDesc(lu)}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      )}

                      {totalCriteria > 0 && (
                        <div
                          className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded-md border flex items-center gap-1.5 ${
                            completedCriteria === totalCriteria
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-zinc-950 text-zinc-400 border-white/5"
                          }`}
                          title={`${completedCriteria} van ${totalCriteria} criteria voltooid`}
                        >
                          <CheckSquare className="size-3 shrink-0" />
                          <span>
                            {completedCriteria}/{totalCriteria}
                          </span>
                        </div>
                      )}

                      <select
                        value={st.status}
                        onChange={async (e) => {
                          const newStatus = e.target.value as "todo" | "in_progress" | "done";
                          await api.minor.sprints.stories.update(st.id, { status: newStatus });
                          await reloadSprint();
                        }}
                        className={`text-[10px] font-semibold uppercase px-2 py-1 rounded border cursor-pointer ${
                          st.status === "done"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : st.status === "in_progress"
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                            : "bg-zinc-800 border-white/10 text-zinc-300"
                        }`}
                      >
                        <option value="todo">{t("To Do")}</option>
                        <option value="in_progress">{t("Bezig")}</option>
                        <option value="done">{t("Voltooid")}</option>
                      </select>

                      <button
                        onClick={() => openEditStoryModal(st)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
                        title={t("Bewerken")}
                      >
                        <Edit3 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: 2. FEEDBACK */}
      {activeTab === "feedback" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {t("Show & Grow Feedbackregels")}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {t("Registreer ontvangen feedback van docenten en peers met jouw concrete actiepunten.")}
              </p>
            </div>
          </div>

          {/* Feedback Form */}
          <form onSubmit={handleAddFeedback} className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-3">
            <h3 className="text-xs font-bold text-zinc-200">{t("Feedbackregel toevoegen")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">{t("Datum")}</label>
                <input
                  type="date"
                  value={fbDate}
                  onChange={(e) => setFbDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
                  required
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">{t("Van wie")}</label>
                <input
                  type="text"
                  placeholder="bijv. Docent Jan / Peer Lisa"
                  value={fbFromWhom}
                  onChange={(e) => setFbFromWhom(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
                  required
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">{t("Feedback")}</label>
                <input
                  type="text"
                  placeholder="Wat was de opmerking?"
                  value={fbText}
                  onChange={(e) => setFbText(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
                  required
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">{t("Jouw actie")}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Wat ga je hiermee doen?"
                    value={fbAction}
                    onChange={(e) => setFbAction(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
                    required
                  />
                  <button
                    type="submit"
                    disabled={addingFeedback}
                    className="px-3.5 py-2 rounded-lg bg-brand text-zinc-950 font-semibold text-xs hover:bg-brand-hover transition-all shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Feedback Table */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-zinc-950/80 text-zinc-400 font-semibold">
                  <th className="py-3 px-4 w-28">{t("Datum")}</th>
                  <th className="py-3 px-4 w-40">{t("Van wie")}</th>
                  <th className="py-3 px-4">{t("Feedback")}</th>
                  <th className="py-3 px-4">{t("Jouw actie")}</th>
                  <th className="py-3 px-4 w-12 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sprint.feedback.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-500 italic">
                      {t("Geen feedbackregels ingevuld.")}
                    </td>
                  </tr>
                ) : (
                  sprint.feedback.map((fb) => (
                    <tr key={fb.id} className="hover:bg-zinc-900/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-zinc-400">{fb.date}</td>
                      <td className="py-3 px-4 font-semibold text-white">{fb.fromWhom}</td>
                      <td className="py-3 px-4 text-zinc-300">{fb.feedback}</td>
                      <td className="py-3 px-4 text-zinc-300">{fb.action}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteFeedback(fb.id)}
                          className="text-zinc-500 hover:text-red-400 p-1 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: 3. ZELFEVALUATIE & BEOORDELING */}
      {activeTab === "self_eval" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {t("Zelfevaluatie & Docentbeoordeling")}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {t("Onderbouw per leeruitkomst je niveau met bewijslast uit voltooide stories.")}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleAutoPopulateEvals}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 transition-all cursor-pointer"
                title={t("Automatisch vullen op basis van voltooide stories en bewijslast")}
              >
                <Sparkles className="size-3.5 text-brand" />
                <span>{t("Automatisch invullen")}</span>
              </button>

              <button
                onClick={handleSaveEvalsAndAssessments}
                disabled={savingEvals}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-brand text-zinc-950 hover:bg-brand-hover transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="size-3.5" />
                <span>{savingEvals ? t("Opslaan...") : evalSaveSuccess ? t("Opgeslagen!") : t("Wijzigingen opslaan")}</span>
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-white/5 flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-brand shrink-0" />
              <span>{t("Per sprint kan de docent maximaal 1 voldoende (V) toekennen voor de gehele sprint.")}</span>
            </span>
            {teacherAssessments.some((a) => a.assessment === "V") && (
              <span className="text-[11px] font-mono text-brand font-semibold shrink-0">
                {t("Toegekend: LU {lu}", { lu: String(teacherAssessments.find((a) => a.assessment === "V")?.learningOutcome) })}
              </span>
            )}
          </div>

          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((luNum) => {
              const evalItem = selfEvals.find((e) => e.learningOutcome === luNum);
              const assessItem = teacherAssessments.find((a) => a.learningOutcome === luNum);

              return (
                <div
                  key={luNum}
                  className="p-5 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-zinc-800 text-brand border border-brand/20">
                        LU {luNum}
                      </span>
                      <h3 className="text-sm font-bold text-white">
                        {t(`Leeruitkomst ${luNum}`)}
                        {getLUShortDesc(luNum) && (
                          <span className="text-zinc-400 font-normal text-xs ml-2">
                            ({getLUShortDesc(luNum)})
                          </span>
                        )}
                      </h3>
                      {assessItem?.assessment === "V" && (
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-brand/10 border border-brand/20 text-brand">
                          {t("Sprint Voldoende")}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      {/* Self Eval Level */}
                      <div className="flex items-center gap-1.5">
                        <label className="text-zinc-400 font-semibold">{t("Zelf (Niv.)")}:</label>
                        <select
                          value={evalItem?.level ?? "-"}
                          onChange={(e) => {
                            const newLevel = e.target.value as "V" | "NV" | "-";
                            setSelfEvals((prev) =>
                              prev.map((item) =>
                                item.learningOutcome === luNum ? { ...item, level: newLevel } : item
                              )
                            );
                          }}
                          className="bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1 text-white text-xs font-bold focus:outline-none focus:border-brand cursor-pointer"
                        >
                          <option value="V">V (Voldoende)</option>
                          <option value="NV">NV (Niet Voldaan)</option>
                          <option value="-">- (N.v.t.)</option>
                        </select>
                      </div>

                      {/* Official Teacher Assessment */}
                      <div className="flex items-center gap-1.5">
                        <label className="text-zinc-400 font-semibold">{t("Docentoordeel")}:</label>
                        <select
                          value={assessItem?.assessment ?? "-"}
                          onChange={(e) => {
                            const newAssess = e.target.value as "V" | "O" | "-";
                            setTeacherAssessments((prev) =>
                              prev.map((item) => {
                                if (item.learningOutcome === luNum) {
                                  return { ...item, assessment: newAssess };
                                }
                                // If selecting 'V' for this LU, reset any other LU from 'V' to '-'
                                if (newAssess === "V" && item.assessment === "V") {
                                  return { ...item, assessment: "-" };
                                }
                                return item;
                              })
                            );
                          }}
                          className={`bg-zinc-950 border rounded-lg px-2.5 py-1 text-xs font-bold focus:outline-none cursor-pointer ${
                            assessItem?.assessment === "V"
                              ? "border-emerald-500/40 text-emerald-400"
                              : assessItem?.assessment === "O"
                              ? "border-red-500/40 text-red-400"
                              : "border-white/10 text-zinc-300"
                          }`}
                        >
                          <option value="V">V (Voldoende)</option>
                          <option value="O">O (Onvoldoende)</option>
                          <option value="-">- (Geen beoordeling)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Argumentation Textarea */}
                  <div className="space-y-1.5 text-xs">
                    <label className="block text-zinc-400 font-semibold">
                      {t("Argumentatie en bewijs")}:
                    </label>
                    <textarea
                      rows={4}
                      value={evalItem?.argumentation || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelfEvals((prev) =>
                          prev.map((item) =>
                            item.learningOutcome === luNum ? { ...item, argumentation: val } : item
                          )
                        );
                      }}
                      placeholder="Beschrijf concrete beroepsproducten en linkjes naar bewijslast..."
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-brand"
                    />
                  </div>

                  {/* Teacher notes */}
                  <div className="space-y-1 text-xs">
                    <label className="block text-zinc-500 font-medium">
                      {t("Notities docent (optioneel)")}:
                    </label>
                    <input
                      type="text"
                      value={assessItem?.notes || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTeacherAssessments((prev) =>
                          prev.map((item) =>
                            item.learningOutcome === luNum ? { ...item, notes: val } : item
                          )
                        );
                      }}
                      placeholder="Eventuele opmerkingen of voorwaarden van de docent..."
                      className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-brand"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: 4. REFLECTIE */}
      {activeTab === "reflection" && (
        <form onSubmit={handleSaveReflection} className="p-6 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {t("Sprintreflectie")}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {t("Beantwoord de drie vaste reflectievragen na afloop van de Show & Grow sessie.")}
              </p>
            </div>

            <button
              type="submit"
              disabled={savingReflection}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-brand text-zinc-950 hover:bg-brand-hover transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="size-3.5" />
              <span>{savingReflection ? t("Opslaan...") : refSaveSuccess ? t("Opgeslagen!") : t("Reflectie opslaan")}</span>
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <div className="max-w-xs">
              <label className="block text-zinc-400 mb-1">{t("Datum van reflectie")}</label>
              <input
                type="date"
                value={refDate}
                onChange={(e) => setRefDate(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-zinc-300 font-bold">
                1. {t("Wat heb je geleerd?")}
              </label>
              <textarea
                rows={3}
                value={whatLearned}
                onChange={(e) => setWhatLearned(e.target.value)}
                placeholder="Nieuwe technieken, methodieken, inzichten of feedback..."
                className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-brand"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-zinc-300 font-bold">
                2. {t("Wat behoud je?")}
              </label>
              <textarea
                rows={3}
                value={whatRetained}
                onChange={(e) => setWhatRetained(e.target.value)}
                placeholder="Werkwijzen, structuur of routines die goed werkten..."
                className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-brand"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-zinc-300 font-bold">
                3. {t("Wat ga je anders doen?")}
              </label>
              <textarea
                rows={3}
                value={whatChange}
                onChange={(e) => setWhatChange(e.target.value)}
                placeholder="Aanpassingen in planning, communicatie of voorbereiding voor de volgende sprint..."
                className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-brand"
              />
            </div>
          </div>
        </form>
      )}

      {/* Story View Modal */}
      {viewingStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-7 max-w-3xl w-full space-y-5 shadow-2xl my-8">
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
                <button
                  onClick={() => setViewingStoryId(null)}
                  className="text-zinc-400 hover:text-white text-base cursor-pointer p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                  aria-label={t("Sluiten")}
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
                    onChange={async (e) => {
                      const newStatus = e.target.value as "todo" | "in_progress" | "done";
                      await api.minor.sprints.stories.update(viewingStory.id, { status: newStatus });
                      await reloadSprint();
                    }}
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
              {viewingStory.learningOutcomes?.length > 0 && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    {t("Gekoppelde Leeruitkomsten")}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {viewingStory.learningOutcomes.map((lu) => (
                      <span
                        key={lu}
                        className="px-3 py-1.5 rounded-lg border border-brand/30 bg-brand/10 text-brand text-xs sm:text-sm font-semibold flex items-center gap-1.5"
                      >
                        <CheckSquare className="size-4" />
                        <span>
                          LU {lu}
                          {getLUShortDesc(lu) && (
                            <span className="text-brand/80 font-normal ml-1">
                              · {getLUShortDesc(lu)}
                            </span>
                          )}
                        </span>
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
              <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteStory(viewingStory.id)}
                    className="flex items-center justify-center p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title={t("Verwijderen")}
                    aria-label={t("Verwijderen")}
                  >
                    <Trash2 className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportStoryDirect(viewingStory)}
                    className="flex items-center justify-center p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    title={t("Exporteer story als JSON naar klembord")}
                    aria-label={t("Exporteer story als JSON naar klembord")}
                  >
                    {copiedExport ? <Check className="size-4 text-brand" /> : <Upload className="size-4" />}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewingStoryId(null)}
                    className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white text-xs sm:text-sm cursor-pointer"
                  >
                    {t("Sluiten")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const stToEdit = viewingStory;
                      setViewingStoryId(null);
                      openEditStoryModal(stToEdit);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold bg-brand text-zinc-950 hover:bg-brand-hover transition-all cursor-pointer shadow-sm"
                  >
                    <Edit3 className="size-4" />
                    <span>{t("Story Bewerken")}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Story Create / Edit Modal */}
      {isStoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-7 max-w-3xl w-full space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="size-4.5 text-brand" />
                <span>{editingStory ? t("Story Bewerken") : t("Nieuwe Story Aanmaken")}</span>
              </h2>
              <button
                onClick={() => setIsStoryModalOpen(false)}
                className="text-zinc-400 hover:text-white text-base cursor-pointer p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStory} className="space-y-5 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">{t("Story Type")}</label>
                  <select
                    value={storyTypeCode}
                    onChange={(e) => {
                      const newCode = e.target.value;
                      const oldCode = storyTypeCode;
                      setStoryTypeCode(newCode);

                      if (!editingStory) {
                        if (storyNumber.startsWith(oldCode)) {
                          setStoryNumber(storyNumber.replace(oldCode, newCode));
                        }

                        const prevDefaults = getDefaultQualityCriteriaForType(oldCode);
                        const isUntouchedOrEmpty =
                          qualityCriteria.length === 0 ||
                          (qualityCriteria.length === 1 && !qualityCriteria[0].text.trim()) ||
                          JSON.stringify(qualityCriteria.map((c) => ({ text: c.text.trim(), indent: c.indent || 0 }))) ===
                            JSON.stringify(prevDefaults.map((c) => ({ text: c.text.trim(), indent: c.indent || 0 })));

                        if (isUntouchedOrEmpty) {
                          setQualityCriteria(getDefaultQualityCriteriaForType(newCode));
                        }
                      }
                    }}
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand cursor-pointer"
                  >
                    <option value="US">{t("US - User Story")}</option>
                    <option value="RS">{t("RS - Research Story")}</option>
                    <option value="LS">{t("LS - Learning Story")}</option>
                    {storyTypes
                      .filter((t) => !["US", "RS", "LS"].includes(t.code))
                      .map((t) => (
                        <option key={t.id} value={t.code}>
                          {t.name} ({t.code})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">{t("Story nummer")}</label>
                  <input
                    type="text"
                    placeholder="bijv. US 1.1"
                    value={storyNumber}
                    onChange={(e) => setStoryNumber(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">{t("Titel")}</label>
                  <input
                    type="text"
                    placeholder="Korte omschrijving"
                    value={storyTitle}
                    onChange={(e) => setStoryTitle(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand"
                    required
                  />
                </div>
              </div>

              {/* Template fields: Als / Wil ik / Zodat */}
              <div className="space-y-3 p-4 sm:p-5 rounded-xl bg-zinc-950 border border-white/5">
                <div className="flex items-center gap-2 font-bold text-zinc-200 text-sm">
                  <Sparkles className="size-4 text-brand" />
                  <span>{t("User Story Template")}</span>
                </div>
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-zinc-400 text-xs font-medium mb-1">{t("Als [rol]")}</label>
                    <input
                      type="text"
                      placeholder="bijv. beheerder, gebruiker..."
                      value={asA}
                      onChange={(e) => setAsA(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-xs font-medium mb-1">{t("Wil ik [wens]")}</label>
                    <input
                      type="text"
                      placeholder="bijv. kunnen inloggen met wachtwoord..."
                      value={iWant}
                      onChange={(e) => setIWant(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-xs font-medium mb-1">{t("Zodat [doel]")}</label>
                    <input
                      type="text"
                      placeholder="bijv. alleen geautoriseerde personen toegang hebben..."
                      value={soThat}
                      onChange={(e) => setSoThat(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand"
                    />
                  </div>
                </div>
              </div>

              {/* Learning Outcomes multi-select */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  {t("Gekoppelde Leeruitkomsten (1 t/m 5)")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((lu) => {
                    const isChecked = selectedLUs.includes(lu);
                    return (
                      <button
                        key={lu}
                        type="button"
                        onClick={() => {
                          setSelectedLUs((prev) =>
                            isChecked ? prev.filter((x) => x !== lu) : [...prev, lu].sort((a, b) => a - b)
                          );
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                          isChecked
                            ? "bg-brand/15 border-brand/40 text-brand"
                            : "bg-zinc-950 border-white/10 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {isChecked ? <CheckSquare className="size-4 shrink-0" /> : <Square className="size-4 shrink-0" />}
                        <span>
                          <span className="font-mono font-bold">LU {lu}</span>
                          {getLUShortDesc(lu) && (
                            <span className={isChecked ? "text-brand/90 font-medium ml-1" : "text-zinc-400 font-normal ml-1"}>
                              · {getLUShortDesc(lu)}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">{t("Status")}</label>
                <select
                  value={storyStatus}
                  onChange={(e) => setStoryStatus(e.target.value as "todo" | "in_progress" | "done")}
                  className="w-full sm:w-56 bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand cursor-pointer"
                >
                  <option value="todo">{t("To Do")}</option>
                  <option value="in_progress">{t("Bezig")}</option>
                  <option value="done">{t("Voltooid")}</option>
                </select>
              </div>

              {/* Criteria Checklists Stacked (Acceptance & Quality) */}
              <div className="space-y-4">
                {/* Acceptance criteria */}
                <div className="space-y-3 p-4 sm:p-5 rounded-xl bg-zinc-950 border border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-100 text-sm">{t("Acceptatiecriteria")}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 font-mono font-medium">
                        {acceptanceCriteria.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => addAcceptanceCriterion(0)}
                        className="text-brand hover:underline flex items-center gap-1 text-xs sm:text-sm font-medium cursor-pointer"
                      >
                        <Plus className="size-4" />
                        <span>{t("Criterium")}</span>
                      </button>
                      <span className="text-zinc-700">|</span>
                      <button
                        type="button"
                        onClick={() => addAcceptanceCriterion(1)}
                        className="text-brand/80 hover:text-brand hover:underline flex items-center gap-1 text-xs sm:text-sm font-medium cursor-pointer"
                        title={t("Subtaak toevoegen")}
                      >
                        <CornerDownRight className="size-3.5" />
                        <span>{t("Subtaak")}</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto overflow-x-hidden pr-2">
                    {acceptanceCriteria.length === 0 ? (
                      <p className="text-sm text-zinc-500 italic py-1">{t("Geen criteria opgegeven.")}</p>
                    ) : (
                      acceptanceCriteria.map((c, idx) => {
                        const isSub = (c.indent ?? 0) > 0;
                        return (
                          <div
                            key={idx}
                            className={`flex items-center gap-2 ${
                              isSub ? "pl-4 sm:pl-6 border-l-2 border-brand/40 ml-2" : ""
                            }`}
                          >
                            <span className="text-zinc-500 font-mono text-xs w-5 shrink-0 text-center">
                              {isSub ? "↳" : `${idx + 1}.`}
                            </span>
                            <input
                              ref={(el) => {
                                if (focusTarget?.type === "acceptance" && focusTarget.index === idx && el) {
                                  el.focus();
                                  setFocusTarget(null);
                                }
                              }}
                              type="text"
                              value={c.text}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAcceptanceCriteria((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, text: val } : item))
                                );
                              }}
                              placeholder={isSub ? "Subtaak omschrijving..." : "Criterium omschrijving..."}
                              className="flex-1 min-w-0 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand transition-colors placeholder-zinc-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setAcceptanceCriteria((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, indent: isSub ? 0 : 1 } : item))
                                );
                              }}
                              title={isSub ? t("Terugspringen naar hoofdtaak") : t("Inspringen als subtaak")}
                              className={`p-2 rounded transition-colors cursor-pointer shrink-0 ${
                                isSub
                                  ? "text-brand bg-brand/10 hover:bg-brand/20"
                                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                              }`}
                            >
                              <CornerDownRight className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setAcceptanceCriteria((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-zinc-500 hover:text-red-400 p-2 rounded hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                              title={t("Verwijderen")}
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Quality criteria */}
                <div className="space-y-3 p-4 sm:p-5 rounded-xl bg-zinc-950 border border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-100 text-sm">{t("Kwaliteitscriteria")}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 font-mono font-medium">
                        {qualityCriteria.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setQualityCriteria(getDefaultQualityCriteriaForType(storyTypeCode))}
                        className="text-xs text-zinc-400 hover:text-brand hover:underline transition-colors cursor-pointer mr-1"
                        title={t("Herlaad de standaard kwaliteitscriteria voor dit story type")}
                      >
                        {t("Standaard herladen")}
                      </button>
                      <button
                        type="button"
                        onClick={() => addQualityCriterion(0)}
                        className="text-brand hover:underline flex items-center gap-1 text-xs sm:text-sm font-medium cursor-pointer"
                      >
                        <Plus className="size-4" />
                        <span>{t("Criterium")}</span>
                      </button>
                      <span className="text-zinc-700">|</span>
                      <button
                        type="button"
                        onClick={() => addQualityCriterion(1)}
                        className="text-brand/80 hover:text-brand hover:underline flex items-center gap-1 text-xs sm:text-sm font-medium cursor-pointer"
                        title={t("Subtaak toevoegen")}
                      >
                        <CornerDownRight className="size-3.5" />
                        <span>{t("Subtaak")}</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto overflow-x-hidden pr-2">
                    {qualityCriteria.length === 0 ? (
                      <p className="text-sm text-zinc-500 italic py-1">{t("Geen criteria opgegeven.")}</p>
                    ) : (
                      qualityCriteria.map((c, idx) => {
                        const isSub = (c.indent ?? 0) > 0;
                        return (
                          <div
                            key={idx}
                            className={`flex items-center gap-2 ${
                              isSub ? "pl-4 sm:pl-6 border-l-2 border-brand/40 ml-2" : ""
                            }`}
                          >
                            <span className="text-zinc-500 font-mono text-xs w-5 shrink-0 text-center">
                              {isSub ? "↳" : `${idx + 1}.`}
                            </span>
                            <input
                              ref={(el) => {
                                if (focusTarget?.type === "quality" && focusTarget.index === idx && el) {
                                  el.focus();
                                  setFocusTarget(null);
                                }
                              }}
                              type="text"
                              value={c.text}
                              onChange={(e) => {
                                const val = e.target.value;
                                setQualityCriteria((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, text: val } : item))
                                );
                              }}
                              placeholder={isSub ? "Sub-kwaliteitseis..." : "Kwaliteitseis omschrijving..."}
                              className="flex-1 min-w-0 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand transition-colors placeholder-zinc-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setQualityCriteria((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, indent: isSub ? 0 : 1 } : item))
                                );
                              }}
                              title={isSub ? t("Terugspringen naar hoofdtaak") : t("Inspringen als subtaak")}
                              className={`p-2 rounded transition-colors cursor-pointer shrink-0 ${
                                isSub
                                  ? "text-brand bg-brand/10 hover:bg-brand/20"
                                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                              }`}
                            >
                              <CornerDownRight className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setQualityCriteria((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-zinc-500 hover:text-red-400 p-2 rounded hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                              title={t("Verwijderen")}
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Evidence Links & Document Uploads */}
              <div className="space-y-3 p-4 sm:p-5 rounded-xl bg-zinc-950 border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-200 text-sm">{t("Bewijslast (GitHub, Live URL, Document)")}</span>
                  <div className="flex items-center gap-3">
                    <label className="text-xs sm:text-sm text-brand hover:underline cursor-pointer flex items-center gap-1.5">
                      <Upload className="size-3.5" />
                      <span>{uploadingFile ? t("Uploaden...") : t("Document")}</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileUpload(f);
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setEvidenceList((prev) => [...prev, { type: "github", title: "", url: "" }])}
                      className="text-brand hover:underline flex items-center gap-1 text-xs sm:text-sm cursor-pointer font-medium"
                    >
                      <Plus className="size-3.5" />
                      <span>{t("Link")}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto overflow-x-hidden pr-2">
                  {evidenceList.map((ev, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                      <select
                        value={ev.type}
                        onChange={(e) => {
                          const val = e.target.value as "link" | "github" | "document" | "app";
                          setEvidenceList((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, type: val } : item))
                          );
                        }}
                        className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white text-xs sm:text-sm focus:outline-none"
                      >
                        <option value="github">GitHub</option>
                        <option value="document">Document</option>
                        <option value="app">Live URL</option>
                        <option value="link">Link</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Titel/Omschrijving"
                        value={ev.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEvidenceList((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, title: val } : item))
                          );
                        }}
                        className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white text-xs sm:text-sm focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="https://... of /api/uploads/..."
                        value={ev.url}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEvidenceList((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, url: val } : item))
                          );
                        }}
                        className="sm:col-span-1 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white text-xs sm:text-sm focus:outline-none font-mono"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setEvidenceList((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-zinc-400 hover:text-red-400 p-2 rounded hover:bg-white/5 cursor-pointer transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/10">
                <div className="flex items-center gap-2">
                  {editingStory && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDeleteStory(editingStory.id)}
                        className="flex items-center justify-center p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title={t("Verwijderen")}
                        aria-label={t("Verwijderen")}
                      >
                        <Trash2 className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const stToUnlink = editingStory;
                          setIsStoryModalOpen(false);
                          openUnlinkStoryModal(stToUnlink);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors text-xs sm:text-sm font-medium cursor-pointer"
                        title={t("Ontkoppel of verplaats story")}
                      >
                        <Unlink className="size-4" />
                        <span>{t("Loskoppelen")}</span>
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={handleExportStoryJson}
                    className="flex items-center justify-center p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    title={t("Exporteer story als JSON naar klembord")}
                    aria-label={t("Exporteer story als JSON naar klembord")}
                  >
                    {copiedExport ? <Check className="size-4 text-brand" /> : <Upload className="size-4" />}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsStoryModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white text-xs sm:text-sm cursor-pointer"
                  >
                    {t("Annuleren")}
                  </button>
                  <button
                    type="submit"
                    disabled={savingStory}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold bg-brand text-zinc-950 hover:bg-brand-hover transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <Check className="size-4" />
                    <span>{savingStory ? t("Opslaan...") : editingStory ? t("Opslaan") : t("Story Aanmaken")}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Story Import Modal */}
      {isImportStoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-xl w-full space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Download className="size-4 text-brand" />
                <span>{t("Story Importeren (JSON)")}</span>
              </h2>
              <button
                onClick={() => setIsImportStoryModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              {t("Plak hieronder de JSON van een user story of importeer direct vanuit je klembord.")}
            </p>

            <form onSubmit={handleImportStory} className="space-y-4 text-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-zinc-400 font-medium">{t("Story JSON")}</label>
                  <button
                    type="button"
                    onClick={handlePasteClipboardToImport}
                    className="text-brand hover:underline flex items-center gap-1 font-medium cursor-pointer text-xs"
                  >
                    <Copy className="size-3" />
                    <span>{t("Plakken vanuit klembord")}</span>
                  </button>
                </div>
                <textarea
                  rows={10}
                  value={importJsonText}
                  onChange={(e) => {
                    setImportJsonText(e.target.value);
                    setImportError(null);
                  }}
                  placeholder={`{\n  "storyTypeCode": "US",\n  "storyNumber": "US 1.1",\n  "title": "Voorbeeld story",\n  "asA": "bezoeker",\n  "iWant": "...",\n  "soThat": "...",\n  "learningOutcomes": [1, 2],\n  "acceptanceCriteria": [\n    { "text": "Criterium 1", "isCompleted": false }\n  ]\n}`}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-brand"
                />
              </div>

              {importError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportStoryModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-zinc-400 hover:text-white text-xs cursor-pointer"
                >
                  {t("Annuleren")}
                </button>
                <button
                  type="submit"
                  disabled={isImportingStory || !importJsonText.trim()}
                  className="px-4 py-2 rounded-lg bg-brand text-zinc-950 font-semibold text-xs hover:bg-brand-hover transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Download className="size-3.5" />
                  <span>{isImportingStory ? t("Importeren...") : t("Importeren")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link Concept Story Modal */}
      {isLinkStoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-2xl w-full space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Link2 className="size-4 text-brand" />
                <span>{t("Concept Story Koppelen")}</span>
              </h2>
              <button
                onClick={() => setIsLinkStoryModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              {t("Koppel een bestaande concept story of backlog item aan")} <span className="text-white font-semibold">{sprint.sprintNumber}: {sprint.name}</span>.
            </p>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
              <input
                type="text"
                value={linkSearchQuery}
                onChange={(e) => setLinkSearchQuery(e.target.value)}
                placeholder={t("Zoek op titel, nummer of rol...")}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand transition-colors"
              />
            </div>

            {/* Stories List */}
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {loadingConceptStories ? (
                <div className="p-8 text-center text-xs text-zinc-500">{t("Concept stories laden...")}</div>
              ) : availableConceptStories.filter((st) => {
                  if (!linkSearchQuery.trim()) return true;
                  const q = linkSearchQuery.toLowerCase();
                  return (
                    st.title.toLowerCase().includes(q) ||
                    (st.storyNumber || "").toLowerCase().includes(q) ||
                    (st.storyTypeCode || "").toLowerCase().includes(q) ||
                    (st.asA || "").toLowerCase().includes(q) ||
                    (st.iWant || "").toLowerCase().includes(q)
                  );
                }).length === 0 ? (
                <div className="p-8 rounded-xl bg-zinc-950/60 border border-white/5 text-center space-y-3">
                  <p className="text-xs text-zinc-400">
                    {linkSearchQuery
                      ? t("Geen concept stories gevonden voor deze zoekopdracht.")
                      : t("Er zijn momenteel geen losse concept stories beschikbaar.")}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLinkStoryModalOpen(false);
                      openCreateStoryModal();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="size-3.5" />
                    <span>{t("Nieuwe story aanmaken")}</span>
                  </button>
                </div>
              ) : (
                availableConceptStories
                  .filter((st) => {
                    if (!linkSearchQuery.trim()) return true;
                    const q = linkSearchQuery.toLowerCase();
                    return (
                      st.title.toLowerCase().includes(q) ||
                      (st.storyNumber || "").toLowerCase().includes(q) ||
                      (st.storyTypeCode || "").toLowerCase().includes(q) ||
                      (st.asA || "").toLowerCase().includes(q) ||
                      (st.iWant || "").toLowerCase().includes(q)
                    );
                  })
                  .map((st) => (
                    <div
                      key={st.id}
                      className="p-3.5 rounded-xl bg-zinc-950 border border-white/5 hover:border-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StoryTypeBadge code={st.storyTypeCode} storyTypes={storyTypes} showName size="sm" />
                          {st.storyNumber && (
                            <span className="text-[11px] font-mono font-bold text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded border border-white/5">
                              {st.storyNumber}
                            </span>
                          )}
                          <span className="text-xs font-semibold text-white tracking-tight truncate">
                            {st.title}
                          </span>
                          {st.learningOutcomes && st.learningOutcomes.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              {st.learningOutcomes.map((lu) => (
                                <span
                                  key={lu}
                                  className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-white/5"
                                >
                                  LU {lu}
                                  {getLUShortDesc(lu) && (
                                    <span className="font-sans font-normal text-zinc-500 ml-1">
                                      · {getLUShortDesc(lu)}
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {(st.asA || st.iWant) && (
                          <p className="text-[11px] text-zinc-400 truncate">
                            {st.asA ? `Als ${st.asA}, ` : ""}{st.iWant ? `wil ik ${st.iWant}` : ""}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={linkingStoryId === st.id}
                        onClick={() => handleLinkStory(st.id)}
                        className="px-3 py-1.5 rounded-lg bg-brand text-zinc-950 hover:bg-brand-hover text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer disabled:opacity-50 self-end sm:self-auto"
                      >
                        <Link2 className="size-3.5" />
                        <span>{linkingStoryId === st.id ? t("Koppelen...") : t("Koppelen")}</span>
                      </button>
                    </div>
                  ))
              )}
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsLinkStoryModalOpen(false)}
                className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white text-xs cursor-pointer"
              >
                {t("Sluiten")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Story Unlink / Move Modal */}
      {isUnlinkModalOpen && storyToUnlink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Unlink className="size-5 text-amber-400" />
                <span>{t("Story loskoppelen")}</span>
              </h2>
              <button
                onClick={() => setIsUnlinkModalOpen(false)}
                className="text-zinc-400 hover:text-white text-base cursor-pointer p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                aria-label={t("Sluiten")}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm text-zinc-300">
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-white/5 space-y-1">
                <div className="text-xs text-zinc-400 font-medium">{t("Story")}:</div>
                <div className="font-semibold text-white">
                  {storyToUnlink.storyNumber ? `${storyToUnlink.storyNumber} - ` : ""}
                  {storyToUnlink.title}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-300">
                  {t("Koppel aan andere sprint of bewaar als concept")}:
                </label>
                <select
                  value={targetSprintIdForUnlink}
                  onChange={(e) => setTargetSprintIdForUnlink(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-sm text-zinc-200 focus:outline-none focus:border-brand cursor-pointer"
                >
                  <option value="">{t("Geen sprint (Concept / Backlog)")}</option>
                  {allSprints
                    .filter((sp) => sp.id !== sprint.id)
                    .map((sp) => (
                      <option key={sp.id} value={String(sp.id)}>
                        {sp.sprintNumber}: {sp.name}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-zinc-500">
                  {targetSprintIdForUnlink
                    ? t("De story wordt verplaatst naar de geselecteerde sprint.")
                    : t("De story wordt losgekoppeld en bewaard als concept story.")}
                </p>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsUnlinkModalOpen(false)}
                disabled={unlinkingStory}
                className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white text-xs sm:text-sm cursor-pointer disabled:opacity-50"
              >
                {t("Annuleren")}
              </button>
              <button
                type="button"
                onClick={handleConfirmUnlinkOrMove}
                disabled={unlinkingStory}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold bg-amber-500 text-zinc-950 hover:bg-amber-400 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Unlink className="size-4" />
                <span>
                  {unlinkingStory
                    ? t("Bezig...")
                    : targetSprintIdForUnlink
                    ? t("Verplaatsen")
                    : t("Loskoppelen")}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Missing Feedback Warning Dialog Modal (US 6.2) */}
      {pendingExportType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-amber-400 font-bold">
              <AlertTriangle className="size-5 shrink-0" />
              <h3 className="text-base text-white">{t("Feedback ontbreekt")}</h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {t("Er zijn nog geen feedbackregels ingevuld voor deze sprint. Weet je zeker dat je wilt exporteren?")}
            </p>
            <div className="pt-2 flex flex-col sm:flex-row justify-end gap-2">
              <button
                onClick={() => {
                  setPendingExportType(null);
                  setActiveTab("feedback");
                }}
                className="px-4 py-2 rounded-lg bg-brand text-zinc-950 font-semibold text-xs hover:bg-brand-hover transition-all cursor-pointer"
              >
                {t("Ga naar feedback invoeren")}
              </button>
              <button
                onClick={handleConfirmExportIgnore}
                className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium cursor-pointer"
              >
                {t("Negeren en downloaden")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
