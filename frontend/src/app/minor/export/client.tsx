"use client";

import { useState } from "react";
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  CheckSquare,
  Square,
  Download,
  Layers,
  AlertTriangle,
} from "lucide-react";
import { t } from "@/lib/lang";
import { api, type MinorSprint, type MinorSprintFull } from "@/lib/api";
import { downloadAllSprintsPDF } from "@/components/minor-pdf";
import { downloadAllSprintsExcel, validateSprintForExport } from "@/lib/minor-excel";
import { downloadMultipleSprintsJson } from "@/lib/minor-sprint-export";
import { ModalOverlay } from "@/components/ui/modal-overlay";

interface MinorExportClientProps {
  initialSprints: MinorSprint[];
}

interface SprintExportIssue {
  sprintNumber: string;
  sprintName: string;
  issues: string[];
}

export function MinorExportClient({ initialSprints }: MinorExportClientProps) {
  const [sprints] = useState<MinorSprint[]>(initialSprints);
  const [selectedSprintIds, setSelectedSprintIds] = useState<number[]>(
    initialSprints.map((s) => s.id)
  );
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportIssues, setExportIssues] = useState<SprintExportIssue[]>([]);
  const [pendingExcelSprints, setPendingExcelSprints] = useState<MinorSprintFull[] | null>(null);

  function handleToggleAll() {
    if (selectedSprintIds.length === sprints.length) {
      setSelectedSprintIds([]);
    } else {
      setSelectedSprintIds(sprints.map((s) => s.id));
    }
  }

  function handleToggleSprint(id: number) {
    setSelectedSprintIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function fetchFullSprints(): Promise<MinorSprintFull[]> {
    const fullSprints: MinorSprintFull[] = [];
    for (const id of selectedSprintIds) {
      const full = await api.minor.sprints.get(id);
      fullSprints.push(full);
    }
    return fullSprints;
  }

  async function handleExportPDF() {
    if (selectedSprintIds.length === 0) return;
    setExportingPdf(true);
    try {
      const fullSprints = await fetchFullSprints();
      await downloadAllSprintsPDF(fullSprints);
    } catch (err) {
      console.error("Batch PDF export failed:", err);
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleExportExcel() {
    if (selectedSprintIds.length === 0) return;
    setExportingExcel(true);
    try {
      const fullSprints = await fetchFullSprints();
      
      const allIssues: SprintExportIssue[] = [];
      for (const sprint of fullSprints) {
        const issues = validateSprintForExport(sprint);
        if (issues.length > 0) {
          allIssues.push({
            sprintNumber: sprint.sprintNumber,
            sprintName: sprint.name,
            issues,
          });
        }
      }

      if (allIssues.length > 0) {
        setExportIssues(allIssues);
        setPendingExcelSprints(fullSprints);
      } else {
        await downloadAllSprintsExcel(fullSprints);
      }
    } catch (err) {
      console.error("Batch Excel export failed:", err);
    } finally {
      setExportingExcel(false);
    }
  }

  async function handleConfirmIgnoreIssues() {
    if (!pendingExcelSprints) return;
    setExportingExcel(true);
    try {
      await downloadAllSprintsExcel(pendingExcelSprints);
    } catch (err) {
      console.error("Batch Excel export failed:", err);
    } finally {
      setPendingExcelSprints(null);
      setExportIssues([]);
      setExportingExcel(false);
    }
  }

  const [exportingJson, setExportingJson] = useState(false);

  async function handleExportJson() {
    if (selectedSprintIds.length === 0) return;
    setExportingJson(true);
    try {
      const fullSprints = await fetchFullSprints();
      downloadMultipleSprintsJson(fullSprints);
    } catch (err) {
      console.error("Batch JSON export failed:", err);
    } finally {
      setExportingJson(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl sm:text-4xl text-white tracking-tight">
          {t("Verzamelexport Portfolio")}
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          {t("Genereer met één klik een compleet verzamelbestand van alle gewenste sprints voor je eindbeoordeling.")}
        </p>
      </div>

      {/* Export Format Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* PDF Card */}
        <div className="p-6 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="size-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
              <FileText className="size-5" />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">
              {t("Verzamel PDF Document")}
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {t("Bundelt alle geselecteerde sprints in één doorlopend PDF-document. Elke sprint start op een eigen pagina en bevat de 4 vereiste secties (Planning, Feedback, Zelfevaluatie, Reflectie).")}
            </p>
          </div>

          <button
            onClick={handleExportPDF}
            disabled={exportingPdf || selectedSprintIds.length === 0}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-brand text-zinc-950 font-semibold text-xs hover:bg-brand-hover transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="size-4 shrink-0" />
            <span>{exportingPdf ? t("PDF genereren...") : t("Download PDF")}</span>
          </button>
        </div>

        {/* Excel Card */}
        <div className="p-6 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="size-5" />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">
              {t("Integraal Sprint Logboek (Excel)")}
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {t("Genereert het officiële beoordelingsdocument (Dashboard met voortgangsmatrix, Logboek voor Sprints 1 t/m 8 met alle 4 secties, en Lijsten met drop-downs).")}
            </p>
          </div>

          <button
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 font-semibold text-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="size-4 text-zinc-400 shrink-0" />
            <span>{exportingExcel ? t("Excel genereren...") : t("Download Excel")}</span>
          </button>
        </div>

        {/* JSON Card */}
        <div className="p-6 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="size-10 rounded-xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center">
              <FileCode className="size-5" />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">
              {t("JSON Portfolio Archief")}
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {t("Exporteert alle geselecteerde sprints als gestructureerde JSON-data. Ideaal voor back-ups, data-overdracht of herimport naar een ander profiel.")}
            </p>
          </div>

          <button
            onClick={handleExportJson}
            disabled={exportingJson || selectedSprintIds.length === 0}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 font-semibold text-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="size-4 text-zinc-400 shrink-0" />
            <span>{exportingJson ? t("JSON genereren...") : t("Download JSON")}</span>
          </button>
        </div>
      </div>

      {/* Sprints Selection Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-brand" />
            <h2 className="text-base font-bold text-white">
              {t("Selecteer Sprints")} ({selectedSprintIds.length}/{sprints.length})
            </h2>
          </div>

          <button
            onClick={handleToggleAll}
            className="text-xs text-brand hover:underline font-semibold cursor-pointer"
          >
            {selectedSprintIds.length === sprints.length ? t("Niets selecteren") : t("Alles selecteren")}
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 overflow-hidden text-xs divide-y divide-white/5">
          {sprints.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 italic">
              {t("Geen sprints beschikbaar om te exporteren.")}
            </div>
          ) : (
            sprints.map((s) => {
              const isSelected = selectedSprintIds.includes(s.id);
              return (
                <div
                  key={s.id}
                  onClick={() => handleToggleSprint(s.id)}
                  className="p-4 flex items-center justify-between gap-3 hover:bg-zinc-900/80 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {isSelected ? (
                      <CheckSquare className="size-4 text-brand shrink-0" />
                    ) : (
                      <Square className="size-4 text-zinc-600 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-zinc-400 font-bold shrink-0">[{s.sprintNumber}]</span>
                        <h3 className="font-bold text-white truncate">{s.name}</h3>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
                        {s.startDate} t/m {s.endDate} · Show & Grow: {s.showAndGrowDate}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded shrink-0 ${
                      s.status === "active"
                        ? "bg-brand/10 text-brand border border-brand/20"
                        : "bg-zinc-800 text-zinc-300"
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Pre-export Validation Warning Modal */}
      {exportIssues.length > 0 && (
        <ModalOverlay
          open
          onClose={() => {
            setExportIssues([]);
            setPendingExcelSprints(null);
          }}
          label={t("Aandachtspunten voor Excel export")}
        >
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-xl w-full space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center gap-2.5 text-amber-400 font-bold shrink-0">
              <AlertTriangle className="size-5 shrink-0" />
              <h3 className="text-base text-white">{t("Aandachtspunten voor Excel export")}</h3>
            </div>
            
            <p className="text-xs text-zinc-300 leading-relaxed shrink-0">
              {t("Bij één of meerdere geselecteerde sprints zijn onderdelen nog niet volledig afgerond volgens de specificaties:")}
            </p>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {exportIssues.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-zinc-950 border border-white/5 space-y-1.5 text-xs">
                  <div className="font-bold text-zinc-200 flex items-center gap-2">
                    <span className="font-mono text-zinc-400">[{item.sprintNumber}]</span>
                    <span>{item.sprintName}</span>
                  </div>
                  <ul className="space-y-1 text-zinc-400 pl-2">
                    {item.issues.map((issue, iIdx) => (
                      <li key={iIdx} className="flex items-start gap-1.5">
                        <span className="text-amber-400 mt-0.5">•</span>
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row justify-end gap-2 shrink-0 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setExportIssues([]);
                  setPendingExcelSprints(null);
                }}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium cursor-pointer text-center"
              >
                {t("Annuleren")}
              </button>
              <button
                type="button"
                onClick={handleConfirmIgnoreIssues}
                className="px-4 py-2 rounded-lg bg-brand text-zinc-950 font-semibold text-xs hover:bg-brand-hover transition-all cursor-pointer text-center"
              >
                {t("Negeren en downloaden")}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
