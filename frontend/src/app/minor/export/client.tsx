"use client";

import { useState } from "react";
import {
  FileText,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Download,
  Layers,
} from "lucide-react";
import { t } from "@/lib/lang";
import { api, type MinorSprint, type MinorSprintFull } from "@/lib/api";
import { downloadAllSprintsPDF } from "@/components/minor-pdf";
import { downloadAllSprintsExcel } from "@/lib/minor-excel";

interface MinorExportClientProps {
  initialSprints: MinorSprint[];
}

export function MinorExportClient({ initialSprints }: MinorExportClientProps) {
  const [sprints] = useState<MinorSprint[]>(initialSprints);
  const [selectedSprintIds, setSelectedSprintIds] = useState<number[]>(
    initialSprints.map((s) => s.id)
  );
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

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
      downloadAllSprintsExcel(fullSprints);
    } catch (err) {
      console.error("Batch Excel export failed:", err);
    } finally {
      setExportingExcel(false);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <Download className="size-4" />
            <span>{exportingPdf ? t("PDF genereren...") : t("Download Verzameling PDF")}</span>
          </button>
        </div>

        {/* Excel Card */}
        <div className="p-6 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="size-5" />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">
              {t("Verzamel Excel Werkmap")}
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {t("Genereert één Excel-werkbestand met een apart tabblad per sprint ('Sprint 1', 'Sprint 2', etc.). Bevat alle verhalen, criteria, feedback, beoordelingen en reflecties.")}
            </p>
          </div>

          <button
            onClick={handleExportExcel}
            disabled={exportingExcel || selectedSprintIds.length === 0}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 font-semibold text-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="size-4 text-emerald-400" />
            <span>{exportingExcel ? t("Excel genereren...") : t("Download Verzameling Excel")}</span>
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
                  className="p-4 flex items-center justify-between hover:bg-zinc-900/80 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    {isSelected ? (
                      <CheckSquare className="size-4 text-brand shrink-0" />
                    ) : (
                      <Square className="size-4 text-zinc-600 shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-zinc-400 font-bold">[{s.sprintNumber}]</span>
                        <h3 className="font-bold text-white">{s.name}</h3>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {s.startDate} t/m {s.endDate} · Show & Grow: {s.showAndGrowDate}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded ${
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
    </div>
  );
}
