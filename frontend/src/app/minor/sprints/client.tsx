"use client";

import { useState, useEffect } from "react";

import { useRouter } from "next/navigation";
import { Plus, Download } from "lucide-react";
import { t } from "@/lib/lang";
import { api, type MinorSprint } from "@/lib/api";
import { MinorSprintImportModal } from "@/components/minor-sprint-import-modal";
import { copySprintJsonToClipboard } from "@/lib/minor-sprint-export";
import { SprintList } from "./sprint-list";
import { SprintFormModal, type SprintCalculatedDates } from "./sprint-form-modal";

interface MinorSprintsClientProps {
  initialSprints: MinorSprint[];
}

export function MinorSprintsClient({ initialSprints }: MinorSprintsClientProps) {
  const router = useRouter();
  const [sprints, setSprints] = useState<MinorSprint[]>(initialSprints);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [copiedSprintId, setCopiedSprintId] = useState<number | null>(null);
  const [editingSprint, setEditingSprint] = useState<MinorSprint | null>(null);

  // Form state
  const [sprintNumber, setSprintNumber] = useState("");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [durationDays, setDurationDays] = useState(14);
  const [calculatedDates, setCalculatedDates] = useState<SprintCalculatedDates>(null);
  const [saving, setSaving] = useState(false);

  // Load next sprint number suggestion when opening new sprint modal
  useEffect(() => {
    if (isModalOpen && !editingSprint) {
      api.minor.sprints.nextNumber().then((res) => {
        setSprintNumber(res.nextNumber);
        setName(res.nextName);
      }).catch(() => {});
    }
  }, [isModalOpen, editingSprint]);

  // Recalculate dates whenever startDate or durationDays changes
  useEffect(() => {
    if (!startDate) return;
    api.minor.sprints.calculateDates(startDate, durationDays).then((res) => {
      setCalculatedDates({
        endDate: res.endDate,
        showAndGrowDate: res.showAndGrowDate,
        extendedDays: res.extendedDays,
        extensionReason: res.extensionReason,
      });
    }).catch(() => {});
  }, [startDate, durationDays]);

  function openCreateModal() {
    setEditingSprint(null);
    setStartDate(getDefaultStartDate());
    setDurationDays(14);
    setIsModalOpen(true);
  }

  function getDefaultStartDate() {
    if (sprints.length === 0) return new Date().toISOString().slice(0, 10);
    const latestEndDate = sprints.reduce(
      (latest, s) => (s.endDate > latest ? s.endDate : latest),
      sprints[0].endDate
    );
    const dayAfter = new Date(`${latestEndDate}T00:00:00`);
    dayAfter.setDate(dayAfter.getDate() + 1);
    return dayAfter.toISOString().slice(0, 10);
  }

  function openEditModal(sprint: MinorSprint) {
    setEditingSprint(sprint);
    setSprintNumber(sprint.sprintNumber);
    setName(sprint.name);
    setStartDate(sprint.startDate);
    setDurationDays(sprint.durationDays);
    setCalculatedDates({
      endDate: sprint.endDate,
      showAndGrowDate: sprint.showAndGrowDate,
      extendedDays: sprint.extendedDays,
      extensionReason: sprint.extensionReason,
    });
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
          name,
          startDate,
          durationDays,
        });
        setSprints((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      } else {
        const created = await api.minor.sprints.create({
          sprintNumber,
          name,
          startDate,
          durationDays,
        });
        setSprints((prev) => [...prev, created]);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Failed to save sprint:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSprint(id: number) {
    if (!confirm(t("Weet je zeker dat je deze sprint en alle bijbehorende stories wilt verwijderen?"))) {
      return;
    }
    try {
      await api.minor.sprints.delete(id);
      setSprints((prev) => prev.filter((s) => s.id !== id));
      setIsModalOpen(false);
    } catch (err) {
      console.error("Failed to delete sprint:", err);
    }
  }

  async function handleExportSprint(sprintItem: MinorSprint) {
    try {
      const fullSprint = await api.minor.sprints.get(sprintItem.id);
      await copySprintJsonToClipboard(fullSprint);
      setCopiedSprintId(sprintItem.id);
      setTimeout(() => setCopiedSprintId(null), 2500);
    } catch (err) {
      console.error("Failed to export sprint:", err);
    }
  }

  const filteredSprints = sprints.filter((s) => {
    if (statusFilter === "all") return true;
    return s.status === statusFilter;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
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

      {/* Filter Tabs */}
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

      {/* Sprints List */}
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
          name={name}
          setName={setName}
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


      {/* Sprint Import Modal */}
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
