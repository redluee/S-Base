"use client";

import { useState, useEffect, useMemo, useRef, type DragEvent, type FormEvent } from "react";
import { Download, Copy, Upload, AlertTriangle, X } from "lucide-react";
import { t } from "@/lib/lang";
import { api, type MinorSprint, type MinorSprintFull } from "@/lib/api";

interface MinorSprintImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (importedSprint: MinorSprintFull) => void;
  currentSprintId?: number;
  currentSprintName?: string;
  sprints?: MinorSprint[];
}

export function MinorSprintImportModal({
  isOpen,
  onClose,
  onSuccess,
  currentSprintId,
  currentSprintName,
  sprints,
}: MinorSprintImportModalProps) {
  const [jsonText, setJsonText] = useState("");
  const [importTarget, setImportTarget] = useState<"new" | "current">(
    currentSprintId ? "current" : "new"
  );
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fetchedSprints, setFetchedSprints] = useState<MinorSprint[]>([]);
  const existingSprints = sprints && sprints.length > 0 ? sprints : fetchedSprints;
  const [conflictAction, setConflictAction] = useState<"overwrite" | "rename">("rename");
  const [userCustomName, setUserCustomName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch sprints if not provided
  useEffect(() => {
    if (isOpen && (!sprints || sprints.length === 0)) {
      api.minor.sprints
        .list()
        .then((data) => setFetchedSprints(data))
        .catch(() => {});
    }
  }, [isOpen, sprints]);

  // Inspect entered JSON to detect sprint details
  const detectedSprint = useMemo(() => {
    if (!jsonText.trim()) return null;
    try {
      const parsed = JSON.parse(jsonText);
      const data =
        parsed && typeof parsed === "object" && (parsed as { sprint?: unknown }).sprint && typeof (parsed as { sprint?: unknown }).sprint === "object"
          ? (parsed as { sprint: Record<string, unknown> }).sprint
          : (parsed as Record<string, unknown>);
      if (!data || typeof data !== "object") return null;

      const name = typeof data.name === "string" ? data.name.trim() : "";
      const sprintNumber = typeof data.sprintNumber === "string" ? data.sprintNumber.trim() : "";
      const storiesCount = Array.isArray(data.stories) ? data.stories.length : 0;
      const isStoryPayload = Boolean(data.storyTypeCode && !data.stories && !data.sprintNumber);

      return { data, name, sprintNumber, storiesCount, isStoryPayload };
    } catch {
      return null;
    }
  }, [jsonText]);

  // Check if name collides with an existing sprint
  const overlappingSprint = useMemo(() => {
    if (!detectedSprint || !detectedSprint.name) return null;
    const nameLower = detectedSprint.name.toLowerCase();
    return (
      existingSprints.find((s) => {
        if (currentSprintId && s.id === currentSprintId) return false;
        return s.name.trim().toLowerCase() === nameLower;
      }) || null
    );
  }, [detectedSprint, existingSprints, currentSprintId]);

  const defaultRenamedName = overlappingSprint ? `${overlappingSprint.name} (kopie)` : "";
  const customSprintName = userCustomName !== null ? userCustomName : defaultRenamedName;

  if (!isOpen) return null;

  async function handlePasteClipboard() {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setJsonText(text);
          setError(null);
        }
      }
    } catch (err) {
      console.error("Failed to read clipboard:", err);
    }
  }

  function handleFileSelected(file: File) {
    if (!file.name.endsWith(".json") && file.type !== "application/json") {
      setError(t("Kies een geldig .json bestand."));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === "string") {
        setJsonText(text);
        setError(null);
      }
    };
    reader.onerror = () => {
      setError(t("Fout bij lezen van bestand."));
    };
    reader.readAsText(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!jsonText.trim()) {
      setError(t("Voer JSON in om te importeren."));
      return;
    }

    if (detectedSprint?.isStoryPayload) {
      setError(
        t(
          "Dit bestand bevat een losse user story in plaats van een sprint. Gebruik de story importknop op een sprintpagina."
        )
      );
      return;
    }

    let parsedData: unknown;
    try {
      parsedData = JSON.parse(jsonText);
    } catch {
      setError(t("Ongeldig JSON-formaat. Controleer de syntax."));
      return;
    }

    if (!parsedData || typeof parsedData !== "object") {
      setError(t("Ongeldige JSON structuur."));
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      let result: MinorSprintFull;

      if (overlappingSprint) {
        if (conflictAction === "overwrite") {
          result = await api.minor.sprints.import(parsedData, overlappingSprint.id, {
            overwrite: true,
          });
        } else {
          const cleanCustomName = customSprintName.trim();
          if (!cleanCustomName) {
            setError(t("Geef een nieuwe naam op voor de sprint."));
            setIsImporting(false);
            return;
          }
          result = await api.minor.sprints.import(parsedData, undefined, {
            customName: cleanCustomName,
          });
        }
      } else {
        const targetId = importTarget === "current" && currentSprintId ? currentSprintId : undefined;
        result = await api.minor.sprints.import(parsedData, targetId);
      }

      setJsonText("");
      onSuccess(result);
      onClose();
    } catch (err: unknown) {
      console.error("Sprint import failed:", err);
      const msg = err instanceof Error ? err.message : t("Fout bij importeren van sprint.");
      setError(msg);
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 max-w-xl w-full space-y-4 shadow-2xl my-4 sm:my-8 max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Download className="size-4 text-zinc-400" />
            <span>{t("Sprint Importeren (JSON)")}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="size-8 flex items-center justify-center rounded-lg border border-white/10 bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-white/20 transition-all cursor-pointer shrink-0"
            title={t("Sluiten")}
            aria-label={t("Sluiten")}
          >
            <X className="size-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-400">
          {t("Plak hieronder de JSON van een complete sprint of selecteer een geëxporteerd .json bestand.")}
        </p>

        {currentSprintId && (
          <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/5 space-y-2 text-xs">
            <span className="text-zinc-400 font-semibold block">{t("Import bestemming:")}</span>
            <div className="flex flex-col sm:flex-row gap-2">
              <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                <input
                  type="radio"
                  name="importTarget"
                  checked={importTarget === "current"}
                  onChange={() => setImportTarget("current")}
                  className="accent-[#00e3a4]"
                />
                <span>
                  {t("Toevoegen aan huidige sprint")} ({currentSprintName || `#${currentSprintId}`})
                </span>
              </label>
              <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                <input
                  type="radio"
                  name="importTarget"
                  checked={importTarget === "new"}
                  onChange={() => setImportTarget("new")}
                  className="accent-[#00e3a4]"
                />
                <span>{t("Als nieuwe sprint aanmaken")}</span>
              </label>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-zinc-400 font-medium">{t("Sprint JSON Data")}</label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelected(e.target.files[0]);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1 font-medium cursor-pointer text-xs"
                >
                  <Upload className="size-3 text-zinc-400" />
                  <span>{t("Bestand kiezen (.json)")}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="text-zinc-400 hover:text-white flex items-center gap-1 font-medium cursor-pointer text-xs"
                >
                  <Copy className="size-3 text-zinc-400" />
                  <span>{t("Plakken vanuit klembord")}</span>
                </button>
              </div>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`relative rounded-xl transition-all ${
                isDragging ? "ring-2 ring-brand bg-brand/5" : ""
              }`}
            >
              <textarea
                rows={9}
                value={jsonText}
                onChange={(e) => {
                  setJsonText(e.target.value);
                  setError(null);
                }}
                placeholder={`{\n  "sprintNumber": "Sprint 1",\n  "name": "Sprint 1: Basis & Setup",\n  "startDate": "2026-09-07",\n  "durationDays": 14,\n  "stories": [\n    {\n      "storyTypeCode": "US",\n      "title": "Voorbeeld story",\n      "learningOutcomes": [1, 2],\n      "acceptanceCriteria": [\n        { "text": "Criterium 1", "isCompleted": true }\n      ]\n    }\n  ]\n}`}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          {/* Overlapping Sprint Conflict Resolver */}
          {overlappingSprint && (
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-amber-500/30 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="size-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-white">
                    {t("Sprint met deze naam bestaat al")}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {t("Er bestaat al een sprint genaamd")}{" "}
                    <strong className="text-zinc-200 font-mono font-medium">
                      &quot;{overlappingSprint.name}&quot;
                    </strong>
                    {overlappingSprint.sprintNumber ? ` (${overlappingSprint.sprintNumber})` : ""}.{" "}
                    {t("Kies wat je wilt doen:")}
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-1 border-t border-white/5">
                <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-zinc-900/70 border border-white/5 hover:border-white/10 cursor-pointer transition-all">
                  <input
                    type="radio"
                    name="conflictAction"
                    value="overwrite"
                    checked={conflictAction === "overwrite"}
                    onChange={() => setConflictAction("overwrite")}
                    className="mt-0.5 accent-[#00e3a4]"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-medium text-white block">
                      {t("Bestaande sprint overschrijven")}
                    </span>
                    <span className="text-[11px] text-zinc-400 block">
                      {t("Vervangt alle verhalen, feedback en inhoud van \"{name}\".", {
                        name: overlappingSprint.name,
                      })}
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-zinc-900/70 border border-white/5 hover:border-white/10 cursor-pointer transition-all">
                  <input
                    type="radio"
                    name="conflictAction"
                    value="rename"
                    checked={conflictAction === "rename"}
                    onChange={() => setConflictAction("rename")}
                    className="mt-0.5 accent-[#00e3a4]"
                  />
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div>
                      <span className="text-xs font-medium text-white block">
                        {t("Geïmporteerde sprint hernoemen")}
                      </span>
                      <span className="text-[11px] text-zinc-400 block">
                        {t("Maak een nieuwe sprint aan onder een andere naam.")}
                      </span>
                    </div>

                    {conflictAction === "rename" && (
                      <div className="pt-1">
                        <label className="block text-[11px] text-zinc-400 mb-1">
                          {t("Nieuwe sprintnaam:")}
                        </label>
                        <input
                          type="text"
                          value={customSprintName}
                          onChange={(e) => setUserCustomName(e.target.value)}
                          placeholder={t("Voer een nieuwe sprintnaam in...")}
                          className="w-full bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand transition-colors font-medium"
                        />
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg text-zinc-400 hover:text-white text-xs cursor-pointer transition-colors"
            >
              {t("Annuleren")}
            </button>
            <button
              type="submit"
              disabled={isImporting || !jsonText.trim()}
              className="px-4 py-2 rounded-lg bg-brand text-zinc-950 font-semibold text-xs hover:bg-brand-hover transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <Download className="size-3.5" />
              <span>{isImporting ? t("Importeren...") : t("Importeren")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
