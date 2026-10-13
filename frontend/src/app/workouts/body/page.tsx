/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { t } from "@/lib/lang";
import { NavHeader } from "@/components/nav-header";
import { WorkoutSubnav } from "@/components/workout-subnav";
import { Scale, Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { BodyChart } from "./body-chart";
import { BodyEditCard } from "./body-edit-card";
import { BodyLogCard } from "./body-log-card";
import { BodySummaryCards } from "./body-summary-cards";
import { usePhotoUpload } from "./use-photo-upload";
import {
  EMPTY_FORM,
  calculateBMI,
  formFromLog,
  formToPayload,
  getAutofilledHeight,
  getTodayString,
  hasCircumferences,
  parseNumberInput,
  type ChartTab,
  type FormValues,
  type Measurement,
} from "./body-utils";

export default function BodyPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: number; username: string } | null>(null);
  const [logs, setLogs] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State (used for both inline edit and new prepended entry)
  const [editingId, setEditingId] = useState<number | null>(null); // null, 0 for new, or measurementId for editing
  const [formDate, setFormDate] = useState("");
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [showBodyCircumferences, setShowBodyCircumferences] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingDeleteLogId, setPendingDeleteLogId] = useState<number | null>(null);
  const [deletingLog, setDeletingLog] = useState(false);

  // Photo viewer state
  const [activePhotoUrl, setActivePhotoUrl] = useState<string | null>(null);

  // Chart state
  const [chartTab, setChartTab] = useState<ChartTab>("weight");

  const fetchLogs = () => {
    setLoading(true);
    api.measurements.list()
      .then((data) => {
        const sorted = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setLogs(sorted);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load measurements:", err);
        setActionError(t("Metingen laden mislukt. Probeer het opnieuw."));
        setLoading(false);
      });
  };

  // Load user and data
  useEffect(() => {
    api.me()
      .then((res) => {
        setUser(res.user);
        api.measurements.list()
          .then((data) => {
            const sorted = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setLogs(sorted);
            setLoading(false);
          })
          .catch((err) => {
            console.error("Failed to load measurements:", err);
            setActionError(t("Metingen laden mislukt. Probeer het opnieuw."));
            setLoading(false);
          });
      })
      .catch(() => {
        router.push("/");
      });
  }, [router]);

  const { uploadingLogId, uploadProgress, uploadStage, optimisticPhotoUrl, handlePhotoUpload, handleDeletePhoto } =
    usePhotoUpload(fetchLogs, setActionError);

  const handleFieldChange = (key: keyof FormValues, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "weight" || key === "bodyFat") {
        const weightNum = parseNumberInput(next.weight);
        const fatPctNum = parseNumberInput(next.bodyFat);
        next.fatMass =
          weightNum !== null && fatPctNum !== null ? ((weightNum * fatPctNum) / 100).toFixed(1) : "";
      }
      return next;
    });
  };

  const populateFormFieldsFromLog = (log: Measurement) => {
    setForm(formFromLog(log));
    setShowBodyCircumferences(hasCircumferences(log));
  };

  const handleDateChange = (date: string) => {
    setFormDate(date);
    setSaveError(null);
    if (editingId !== 0) return;
    const existing = logs.find((l) => l.date === date && l.measurementId !== editingId);
    if (existing) {
      populateFormFieldsFromLog(existing);
    } else {
      setForm((prev) => ({ ...prev, height: getAutofilledHeight(date, logs) }));
    }
  };

  // Open form for a new entry
  const handleNewEntry = () => {
    setSaveError(null);
    const today = getTodayString();
    setFormDate(today);

    const existing = logs.find((l) => l.date === today);
    if (existing) {
      setEditingId(existing.measurementId);
      populateFormFieldsFromLog(existing);
    } else {
      setEditingId(0);
      setForm({ ...EMPTY_FORM, height: getAutofilledHeight(today, logs) });
      setShowBodyCircumferences(false);
    }
  };

  // Open form to edit an existing entry
  const handleEditEntry = (log: Measurement) => {
    setSaveError(null);
    setEditingId(log.measurementId);
    setFormDate(log.date);
    populateFormFieldsFromLog(log);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  // Save current log
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDate) return;
    if (editingId && logs.some((l) => l.date === formDate && l.measurementId !== editingId)) {
      setSaveError(t("A measurement already exists for this date."));
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const data = { date: formDate, ...formToPayload(form) };

      if (editingId) {
        await api.measurements.update(editingId, data);
      } else {
        await api.measurements.save(data);
      }
      setEditingId(null);
      fetchLogs();
    } catch (err) {
      console.error("Failed to save log:", err);
      setSaveError(
        err instanceof ApiError && err.status === 409
          ? t("A measurement already exists for this date.")
          : t("Failed to save measurement. Please try again.")
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Delete measurement
  const handleDeleteLog = async (id: number) => {
    setDeletingLog(true);
    setActionError(null);
    try {
      await api.measurements.delete(id);
      if (editingId === id) {
        setEditingId(null);
      }
      fetchLogs();
    } catch (err) {
      console.error("Failed to delete log:", err);
      setActionError(t("Meting verwijderen mislukt. Probeer het opnieuw."));
    } finally {
      setDeletingLog(false);
      setPendingDeleteLogId(null);
    }
  };

  // Prepend mock log if creating a new one
  const displayLogs: Measurement[] = editingId === 0 ? [
    {
      measurementId: 0,
      userId: user?.id ?? 0,
      date: formDate,
      ...formToPayload(form),
      createdAt: "",
      photos: []
    },
    ...logs
  ] : logs;

  // Latest measurement for summary dashboard
  const latestLog = logs.length > 0 ? logs[0] : null;
  const latestBmi = latestLog ? calculateBMI(latestLog.weight, latestLog.height) : null;


  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <NavHeader username={user?.username ?? ""} />
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="size-8 text-brand animate-spin" />
          <span className="text-muted-foreground text-sm mt-3">{t("Metingen laden...")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <NavHeader username={user.username} />

      <main id="main-content" className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="font-display text-2xl sm:text-3xl text-foreground flex items-center gap-2.5">
            <Scale className="size-6 sm:size-7 text-brand" />
            <span>{t("Body")}</span>
          </h1>

          <WorkoutSubnav current="body" />
        </div>


        <BodySummaryCards latestLog={latestLog} latestBmi={latestBmi} logCount={logs.length} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Inline Logs & Editing */}
          <section className="lg:col-span-7 flex flex-col gap-5 order-2 lg:order-1">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">
                {t("Logboek")}
              </h2>
              <Button 
                onClick={handleNewEntry} 
                disabled={editingId === 0}
                className="bg-brand text-zinc-900 hover:bg-brand-hover font-medium text-sm min-h-11 px-4 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="size-3.5" />
                {t("Meting")}
              </Button>
            </div>

            {actionError && (
              <p role="alert" className="rounded-lg bg-destructive/10 ring-1 ring-destructive/20 px-3 py-2 text-sm text-destructive break-words">
                {actionError}
              </p>
            )}

            {displayLogs.length === 0 ? (
              <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-12 text-center text-muted-foreground">
                <Scale className="size-12 mx-auto mb-3 opacity-20 text-brand" />
                <p className="font-medium text-sm">{t("No measurements logged yet.")}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {displayLogs.map((log) =>
                  editingId === log.measurementId ? (
                    <BodyEditCard
                      key={log.measurementId}
                      form={form}
                      formDate={formDate}
                      onDateChange={handleDateChange}
                      onFieldChange={handleFieldChange}
                      showBodyCircumferences={showBodyCircumferences}
                      setShowBodyCircumferences={setShowBodyCircumferences}
                      saveError={saveError}
                      isSaving={isSaving}
                      onSubmit={handleSave}
                      onCancel={handleCancelEdit}
                    />
                  ) : (
                    <BodyLogCard
                      key={log.measurementId}
                      log={log}
                      onEdit={handleEditEntry}
                      onDelete={setPendingDeleteLogId}
                      onViewPhoto={setActivePhotoUrl}
                      onDeletePhoto={handleDeletePhoto}
                      onUpload={handlePhotoUpload}
                      uploadingLogId={uploadingLogId}
                      optimisticPhotoUrl={optimisticPhotoUrl}
                      uploadStage={uploadStage}
                      uploadProgress={uploadProgress}
                    />
                  )
                )}
              </div>
            )}

          </section>

          {/* Right Column: Graphs */}
          <section className="lg:col-span-5 flex flex-col gap-5 order-1 lg:order-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">
                {t("Statistieken & Voortgang")}
              </h2>
            </div>

            {/* Tab switchers */}
            <div className="flex gap-1.5 overflow-x-auto">
              {[
                { id: "weight", label: t("Gewicht") },
                { id: "fat", label: t("Vet%") },
                { id: "muscle", label: t("Massa") },
                { id: "bmi", label: "BMI" },
              ].map((tab) => {
                const isActive = chartTab === tab.id;
                return (
                  <button 
                    key={tab.id}
                    onClick={() => setChartTab(tab.id as "weight" | "fat" | "muscle" | "bmi")}
                    className={`m-[2px] inline-flex items-center gap-1 rounded-lg px-3 min-h-11 text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                      isActive 
                        ? "bg-brand/15 text-brand ring-1 ring-brand/30" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <BodyChart logs={logs} chartTab={chartTab} />
          </section>

        </div>
      </main>

      {/* Lightbox photo viewer */}
      {activePhotoUrl && (
        <ModalOverlay
          open
          onClose={() => setActivePhotoUrl(null)}
          label={t("Meting groot scherm")}
          backdropClassName="bg-background/90 backdrop-blur-md"
        >
          <button
            onClick={() => setActivePhotoUrl(null)}
            className="absolute top-6 right-6 size-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            aria-label={t("Sluiten")}
          >
            <X className="size-5" />
          </button>
          <div className="max-w-4xl max-h-[85vh] overflow-hidden rounded-xl border border-border bg-card">
            <img src={activePhotoUrl} alt="Meting groot scherm" className="max-w-full max-h-[85vh] object-contain mx-auto" />
          </div>
        </ModalOverlay>
      )}

      <ConfirmDialog
        open={pendingDeleteLogId !== null}
        title={t("Are you sure you want to delete this log?")}
        description={t("The measurement and its photos are permanently removed.")}
        cancelLabel={t("Cancel")}
        confirmLabel={t("Delete")}
        tone="destructive"
        busy={deletingLog}
        onCancel={() => setPendingDeleteLogId(null)}
        onConfirm={() => {
          if (pendingDeleteLogId !== null) handleDeleteLog(pendingDeleteLogId);
        }}
      />
    </div>
  );
}
