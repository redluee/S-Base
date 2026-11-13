"use client";

import { useState, useEffect } from "react";

import { useRouter } from "next/navigation";
import { Plus, Download } from "lucide-react";
import { t } from "@/lib/lang";
import { api, type MinorSprint } from "@/lib/api";
import { MinorSprintImportModal } from "@/app/minor/sprints/sprint-import-modal";
import { copySprintJson } from "@/app/minor/export-files";
import { SprintList } from "./sprint-list";
import { SprintFormModal } from "./sprint-form-modal";
import { useSprintDates } from "./use-sprint-dates";
import { useActionError } from "@/lib/use-action-error";
import { InlineAlert } from "@/components/ui/inline-alert";
import { today, DEFAULT_SPRINT_DAYS, formatDate } from "@backend/shared/minor";
import { useConfirm } from "@/components/ui/confirm-dialog";

interface MinorSprintsClientProps {
  initialSprints: MinorSprint[];
}

export function MinorSprintsClient({ initialSprints }: MinorSprintsClientProps) {
  const { confirm, dialog } = useConfirm();
  const { error: actionError, report } = useActionError();
  const router = useRouter();
  const [sprints, setSprints] = useState<MinorSprint[]>(initialSprints);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [copiedSprintId, setCopiedSprintId] = useState<number | null>(null);
  const [editingSprint, setEditingSprint] = useState<MinorSprint | null>(null);

  const [sprintNumber, setSprintNumber] = useState("");
  const [startDate, setStartDate] = useState(today());
  const [durationDays, setDurationDays] = useState(DEFAULT_SPRINT_DAYS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isModalOpen && !editingSprint) {
      api.minor.sprints.nextNumber().then((res) => {
        setSprintNumber(res.nextNumber);
      }).catch((err) => report(err, "minor.actionFailed"));
    }
  }, [isModalOpen, editingSprint, report]);

  const calculatedDates = useSprintDates(startDate, durationDays, isModalOpen, report);

  function openCreateModal() {
    setEditingSprint(null);
    setStartDate(getDefaultStartDate());
    setDurationDays(DEFAULT_SPRINT_DAYS);
    setIsModalOpen(true);
  }

  function getDefaultStartDate() {
    if (sprints.length === 0) return today();
    const latestEndDate = sprints.reduce(
      (latest, s) => (s.endDate > latest ? s.endDate : latest),
      sprints[0].endDate
    );
    const dayAfter = new Date(`${latestEndDate}T00:00:00`);
    dayAfter.setDate(dayAfter.getDate() + 1);
    return formatDate(dayAfter);
  }

  function openEditModal(sprint: MinorSprint) {
    setEditingSprint(sprint);
    setSprintNumber(sprint.sprintNumber);
    setStartDate(sprint.startDate);
    setDurationDays(sprint.durationDays);
    setIsModalOpen(true);
  }

  async function handleSaveSprint(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate) return;
    setSaving(true);
    try {
      if (editingSprint) {
        const updated = await api.minor.sprints.update(editingSprint.id, {
          sprintNumber,
          startDate,
          durationDays,
        });
        setSprints((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      } else {
        const created = await api.minor.sprints.create({
          sprintNumber,
          startDate,
          durationDays,
        });
        setSprints((prev) => [...prev, created]);
      }
      setIsModalOpen(false);
    } catch (err) {
      report(err, "minor.actionFailed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSprint(id: number) {
    if (!(await confirm(t("Weet je zeker dat je deze sprint en alle bijbehorende stories wilt verwijderen?")))) {
      return;
    }
    try {
      await api.minor.sprints.delete(id);
      setSprints((prev) => prev.filter((s) => s.id !== id));
      setIsModalOpen(false);
    } catch (err) {
      report(err, "minor.actionFailed");
    }
  }

  async function handleExportSprint(sprintItem: MinorSprint) {
    try {
      await copySprintJson(sprintItem.id);
      setCopiedSprintId(sprintItem.id);
      setTimeout(() => setCopiedSprintId(null), 2500);
    } catch (err) {
      report(err, "minor.actionFailed");
    }
  }

  const filteredSprints = sprints.filter((s) => {
    if (statusFilter === "all") return true;
    return s.status === statusFilter;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {dialog}
      <InlineAlert>{actionError}</InlineAlert>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl text-white tracking-tight">
            {t("Sprintbeheer")}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            {t("Beheer je sprints, Show & Grow data en automatische vakantieverlengingen.")}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            title={t("Sprint Importeren")}
            aria-label={t("Sprint Importeren")}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 transition-all cursor-pointer"
          >
            <Download className="size-4 text-zinc-400" />
            <span className="hidden sm:inline">{t("Sprint Importeren")}</span>
          </button>
          <button
            onClick={openCreateModal}
            title={t("Nieuwe Sprint")}
            aria-label={t("Nieuwe Sprint")}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold bg-brand text-zinc-950 hover:bg-brand-hover hover:shadow-[0_0_1.5rem_rgba(0,227,164,0.3)] transition-all cursor-pointer"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">{t("Nieuwe Sprint")}</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto scrollbar-none">
        {[
          { id: "all", label: "Alle" },
          { id: "active", label: "Actief" },
          { id: "planned", label: "Gepland" },
          { id: "completed", label: "Voltooid" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === tab.id
                ? "bg-brand/15 text-brand border border-brand/30"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
            }`}
          >
            {t(tab.label)}
          </button>
        ))}
      </div>

      <SprintList
        filteredSprints={filteredSprints}
        copiedSprintId={copiedSprintId}
        openCreateModal={openCreateModal}
        openEditModal={openEditModal}
        handleExportSprint={handleExportSprint}
      />

      {isModalOpen && (
        <SprintFormModal
          editingSprint={editingSprint}
          sprintNumber={sprintNumber}
          setSprintNumber={setSprintNumber}
          startDate={startDate}
          setStartDate={setStartDate}
          durationDays={durationDays}
          setDurationDays={setDurationDays}
          calculatedDates={calculatedDates}
          saving={saving}
          handleDeleteSprint={handleDeleteSprint}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSaveSprint}
        />
      )}


      <MinorSprintImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        sprints={sprints}
        onSuccess={(imported) => {
          setSprints((prev) => {
            const filtered = prev.filter((p) => p.id !== imported.id);
            return [...filtered, imported];
          });
          router.push(`/minor/sprints/${imported.id}`);
        }}
      />
    </div>
  );
}
