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
} from "lucide-react";
import { t } from "@/lib/lang";
import {
  api,
  type MinorSprintFull,
  type MinorStory,
  type MinorStoryType,
  type MinorSelfEvaluation,
  type MinorTeacherAssessment,
} from "@/lib/api";
import { downloadSprintPDF } from "@/components/minor-pdf";
import { downloadSprintExcel } from "@/lib/minor-excel";

interface MinorSprintDetailClientProps {
  initialSprint: MinorSprintFull;
  initialStoryTypes: MinorStoryType[];
}

export function MinorSprintDetailClient({ initialSprint }: MinorSprintDetailClientProps) {
  const [sprint, setSprint] = useState<MinorSprintFull>(initialSprint);
  const [activeTab, setActiveTab] = useState<"planning" | "feedback" | "self_eval" | "reflection">("planning");
  const [storyTypes, setStoryTypes] = useState<MinorStoryType[]>([]);

  // Story Modal State
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
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<{ text: string; isCompleted: boolean }[]>([]);
  const [qualityCriteria, setQualityCriteria] = useState<{ text: string; isCompleted: boolean }[]>([]);
  const [evidenceList, setEvidenceList] = useState<{ type: "link" | "github" | "document" | "app"; title: string; url: string }[]>([]);
  const [savingStory, setSavingStory] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

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
  }, []);

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
    setAcceptanceCriteria([{ text: "", isCompleted: false }]);
    setQualityCriteria([{ text: "", isCompleted: false }]);
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
      st.criteria?.filter((c) => c.type === "acceptance").map((c) => ({ text: c.text, isCompleted: c.isCompleted })) || [
        { text: "", isCompleted: false },
      ]
    );
    setQualityCriteria(
      st.criteria?.filter((c) => c.type === "quality").map((c) => ({ text: c.text, isCompleted: c.isCompleted })) || [
        { text: "", isCompleted: false },
      ]
    );
    setEvidenceList(
      st.evidence?.map((e) => ({ type: e.type as "link" | "github" | "document" | "app", title: e.title, url: e.url })) || []
    );
    setIsStoryModalOpen(true);
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

      if (editingStory) {
        await api.minor.sprints.stories.update(editingStory.id, payload);
      } else {
        await api.minor.sprints.stories.create(sprint.id, payload);
      }

      await reloadSprint();
      setIsStoryModalOpen(false);
    } catch (err) {
      console.error("Failed to save story:", err);
    } finally {
      setSavingStory(false);
    }
  }

  async function handleDeleteStory(storyId: number) {
    if (!confirm(t("Weet je zeker dat je deze story wilt verwijderen?"))) return;
    try {
      await api.minor.sprints.stories.delete(storyId);
      await reloadSprint();
    } catch (err) {
      console.error("Failed to delete story:", err);
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
            <button
              onClick={openCreateStoryModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-brand text-zinc-950 hover:bg-brand-hover transition-all cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>{t("Nieuwe Story")}</span>
            </button>
          </div>

          {sprint.stories.length === 0 ? (
            <div className="p-12 rounded-2xl bg-zinc-900/40 border border-white/10 text-center text-zinc-400 text-xs space-y-3">
              <Layers className="size-8 text-zinc-600 mx-auto" />
              <p>{t("Geen stories in deze sprint.")}</p>
              <button
                onClick={openCreateStoryModal}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all cursor-pointer"
              >
                {t("Voeg je eerste story toe")}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {sprint.stories.map((st) => (
                <div
                  key={st.id}
                  className="p-5 rounded-2xl bg-zinc-900/80 border border-white/10 hover:border-white/20 transition-all space-y-4"
                >
                  {/* Story Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-brand/10 border border-brand/20 text-brand">
                        {st.storyTypeCode}
                      </span>
                      {st.storyNumber && (
                        <span className="text-xs font-mono font-semibold text-zinc-400">
                          {st.storyNumber}
                        </span>
                      )}
                      <h3 className="text-sm font-bold text-white tracking-tight">
                        {st.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {st.learningOutcomes.map((lu) => (
                          <span
                            key={lu}
                            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-white/5"
                          >
                            LU {lu}
                          </span>
                        ))}
                      </div>

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
                      <button
                        onClick={() => handleDeleteStory(st.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-all cursor-pointer"
                        title={t("Verwijderen")}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Template description: Als / Wil ik / Zodat */}
                  {(st.asA || st.iWant || st.soThat) && (
                    <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/5 text-xs text-zinc-300 space-y-0.5">
                      <p>
                        <span className="text-zinc-500 font-semibold">{t("Als [rol]")}: </span>
                        {st.asA || "-"}
                      </p>
                      <p>
                        <span className="text-zinc-500 font-semibold">{t("wil ik [wens]")}: </span>
                        {st.iWant || "-"}
                      </p>
                      <p>
                        <span className="text-zinc-500 font-semibold">{t("zodat [doel]")}: </span>
                        {st.soThat || "-"}
                      </p>
                    </div>
                  )}

                  {/* Dual Columns: Acceptatiecriteria & Kwaliteitscriteria */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {/* Acceptatiecriteria */}
                    <div className="p-3.5 rounded-xl bg-zinc-950/40 border border-white/5 space-y-2">
                      <h4 className="text-xs font-bold text-zinc-200">
                        {t("Acceptatiecriteria")}
                      </h4>
                      {st.criteria?.filter((c) => c.type === "acceptance").length === 0 ? (
                        <p className="text-[11px] text-zinc-500 italic">{t("Geen criteria opgegeven.")}</p>
                      ) : (
                        <div className="space-y-1.5">
                          {st.criteria
                            ?.filter((c) => c.type === "acceptance")
                            .map((crit) => (
                              <button
                                key={crit.id}
                                onClick={() => handleToggleCriterion(crit.id, crit.isCompleted)}
                                className="flex items-start gap-2 text-left w-full text-xs text-zinc-300 hover:text-white group cursor-pointer"
                              >
                                {crit.isCompleted ? (
                                  <CheckSquare className="size-3.5 text-brand shrink-0 mt-0.5" />
                                ) : (
                                  <Square className="size-3.5 text-zinc-600 group-hover:text-zinc-400 shrink-0 mt-0.5" />
                                )}
                                <span className={crit.isCompleted ? "line-through text-zinc-500" : ""}>
                                  {crit.orderIndex}. {crit.text}
                                </span>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Kwaliteitscriteria */}
                    <div className="p-3.5 rounded-xl bg-zinc-950/40 border border-white/5 space-y-2">
                      <h4 className="text-xs font-bold text-zinc-200">
                        {t("Kwaliteitscriteria")}
                      </h4>
                      {st.criteria?.filter((c) => c.type === "quality").length === 0 ? (
                        <p className="text-[11px] text-zinc-500 italic">{t("Geen criteria opgegeven.")}</p>
                      ) : (
                        <div className="space-y-1.5">
                          {st.criteria
                            ?.filter((c) => c.type === "quality")
                            .map((crit) => (
                              <button
                                key={crit.id}
                                onClick={() => handleToggleCriterion(crit.id, crit.isCompleted)}
                                className="flex items-start gap-2 text-left w-full text-xs text-zinc-300 hover:text-white group cursor-pointer"
                              >
                                {crit.isCompleted ? (
                                  <CheckSquare className="size-3.5 text-brand shrink-0 mt-0.5" />
                                ) : (
                                  <Square className="size-3.5 text-zinc-600 group-hover:text-zinc-400 shrink-0 mt-0.5" />
                                )}
                                <span className={crit.isCompleted ? "line-through text-zinc-500" : ""}>
                                  {crit.orderIndex}. {crit.text}
                                </span>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* External Evidence Links */}
                  {st.evidence && st.evidence.length > 0 && (
                    <div className="pt-2 border-t border-white/5 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] text-zinc-500 font-semibold">{t("Bewijslast")}:</span>
                      {st.evidence.map((ev) => (
                        <a
                          key={ev.id}
                          href={ev.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950/80 border border-white/10 text-sky-400 hover:text-sky-300 hover:border-sky-500/40 text-[11px] transition-all cursor-pointer"
                        >
                          <ExternalLink className="size-3" />
                          <span>
                            ({ev.type}) {ev.title}
                          </span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
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
                      </h3>
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
                              prev.map((item) =>
                                item.learningOutcome === luNum ? { ...item, assessment: newAssess } : item
                              )
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

      {/* Story Create / Edit Modal */}
      {isStoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-2xl w-full space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="size-4 text-brand" />
                <span>{editingStory ? t("Story Bewerken") : t("Nieuwe Story Aanmaken")}</span>
              </h2>
              <button
                onClick={() => setIsStoryModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStory} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">{t("Story Type")}</label>
                  <select
                    value={storyTypeCode}
                    onChange={(e) => setStoryTypeCode(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand cursor-pointer"
                  >
                    <option value="US">User Story (US)</option>
                    <option value="RS">Research Story (RS)</option>
                    <option value="LS">Learning Story (LS)</option>
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
                  <label className="block text-zinc-400 mb-1">{t("Story nummer")}</label>
                  <input
                    type="text"
                    placeholder="bijv. US 1.1"
                    value={storyNumber}
                    onChange={(e) => setStoryNumber(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">{t("Titel")}</label>
                  <input
                    type="text"
                    placeholder="Korte omschrijving"
                    value={storyTitle}
                    onChange={(e) => setStoryTitle(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-brand"
                    required
                  />
                </div>
              </div>

              {/* Template fields: Als / Wil ik / Zodat */}
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-white/5 space-y-2.5">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  {t("Story Format")}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-zinc-500 mb-0.5">{t("Als [rol]")}</label>
                    <input
                      type="text"
                      placeholder="bijv. student"
                      value={asA}
                      onChange={(e) => setAsA(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-brand"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-0.5">{t("wil ik [wens]")}</label>
                    <input
                      type="text"
                      placeholder="bijv. vakanties kunnen invoeren"
                      value={iWant}
                      onChange={(e) => setIWant(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-brand"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-0.5">{t("zodat [doel]")}</label>
                    <input
                      type="text"
                      placeholder="bijv. de planning automatisch verlengt"
                      value={soThat}
                      onChange={(e) => setSoThat(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-brand"
                    />
                  </div>
                </div>
              </div>

              {/* Learning Outcomes multi-select */}
              <div className="space-y-1.5">
                <label className="block text-zinc-400 font-semibold">{t("Gekoppelde Leeruitkomsten")}</label>
                <div className="flex flex-wrap items-center gap-2">
                  {[1, 2, 3, 4, 5].map((lu) => {
                    const isSelected = selectedLUs.includes(lu);
                    return (
                      <button
                        key={lu}
                        type="button"
                        onClick={() => {
                          setSelectedLUs((prev) =>
                            isSelected ? prev.filter((x) => x !== lu) : [...prev, lu]
                          );
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-brand text-zinc-950 border border-brand"
                            : "bg-zinc-950 text-zinc-400 border border-white/10 hover:border-white/20"
                        }`}
                      >
                        LU {lu}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dual Criteria Checklists (Acceptance & Quality) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Acceptance criteria */}
                <div className="space-y-2 p-3 rounded-xl bg-zinc-950 border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-300">{t("Acceptatiecriteria")}</span>
                    <button
                      type="button"
                      onClick={() => setAcceptanceCriteria((prev) => [...prev, { text: "", isCompleted: false }])}
                      className="text-brand hover:underline flex items-center gap-0.5 text-[11px]"
                    >
                      <Plus className="size-3" />
                      <span>{t("Regel")}</span>
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {acceptanceCriteria.map((c, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className="text-zinc-500 font-mono text-[10px]">{idx + 1}.</span>
                        <input
                          type="text"
                          value={c.text}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAcceptanceCriteria((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, text: val } : item))
                            );
                          }}
                          placeholder="Criterium..."
                          className="w-full bg-zinc-900 border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-brand"
                        />
                        <button
                          type="button"
                          onClick={() => setAcceptanceCriteria((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-zinc-500 hover:text-red-400"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quality criteria */}
                <div className="space-y-2 p-3 rounded-xl bg-zinc-950 border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-300">{t("Kwaliteitscriteria")}</span>
                    <button
                      type="button"
                      onClick={() => setQualityCriteria((prev) => [...prev, { text: "", isCompleted: false }])}
                      className="text-brand hover:underline flex items-center gap-0.5 text-[11px]"
                    >
                      <Plus className="size-3" />
                      <span>{t("Regel")}</span>
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {qualityCriteria.map((c, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className="text-zinc-500 font-mono text-[10px]">{idx + 1}.</span>
                        <input
                          type="text"
                          value={c.text}
                          onChange={(e) => {
                            const val = e.target.value;
                            setQualityCriteria((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, text: val } : item))
                            );
                          }}
                          placeholder="Kwaliteitseis..."
                          className="w-full bg-zinc-900 border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-brand"
                        />
                        <button
                          type="button"
                          onClick={() => setQualityCriteria((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-zinc-500 hover:text-red-400"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Evidence Links & Document Uploads */}
              <div className="space-y-2 p-3 rounded-xl bg-zinc-950 border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-300">{t("Bewijslast (GitHub, Live URL, Document)")}</span>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-brand hover:underline cursor-pointer flex items-center gap-1">
                      <Upload className="size-3" />
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
                      className="text-brand hover:underline flex items-center gap-0.5 text-[11px]"
                    >
                      <Plus className="size-3" />
                      <span>{t("Link")}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {evidenceList.map((ev, idx) => (
                    <div key={idx} className="grid grid-cols-4 gap-2 items-center">
                      <select
                        value={ev.type}
                        onChange={(e) => {
                          const val = e.target.value as "link" | "github" | "document" | "app";
                          setEvidenceList((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, type: val } : item))
                          );
                        }}
                        className="bg-zinc-900 border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none"
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
                        className="bg-zinc-900 border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none"
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
                        className="col-span-1 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setEvidenceList((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-zinc-500 hover:text-red-400 text-right pr-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStoryModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-zinc-400 hover:text-white text-xs cursor-pointer"
                >
                  {t("Annuleren")}
                </button>
                <button
                  type="submit"
                  disabled={savingStory}
                  className="px-4 py-2 rounded-lg bg-brand text-zinc-950 font-semibold text-xs hover:bg-brand-hover transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingStory ? t("Opslaan...") : t("Opslaan")}
                </button>
              </div>
            </form>
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
