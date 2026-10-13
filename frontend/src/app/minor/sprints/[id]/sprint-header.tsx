"use client";

import { ArrowLeft, Presentation, FileSpreadsheet, FileText, Copy, Check } from "lucide-react";
import Link from "next/link";
import { t } from "@/lib/lang";
import type { useSprintData } from "./use-sprint-data";
import type { useSprintExport } from "./use-sprint-export";

interface SprintHeaderProps {
  setIsPresentationOpen: (open: boolean) => void;
  data: ReturnType<typeof useSprintData>;
  exporter: ReturnType<typeof useSprintExport>;
}

export function SprintHeader({ setIsPresentationOpen, data, exporter }: SprintHeaderProps) {
  const { sprint } = data;
  const { copiedSprintExport, handleExportSprintJson, handleTriggerExport } = exporter;
  return (
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

      {/* Export & Presentation Toolbar */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
        <button
          type="button"
          onClick={() => setIsPresentationOpen(true)}
          className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-brand text-zinc-950 hover:bg-brand-hover hover:shadow-[0_0_1.5rem_rgba(0,227,164,0.3)] transition-all cursor-pointer shrink-0"
          title={t("Start Show & Tell presentatie")}
          aria-label={t("Presentatie")}
        >
          <Presentation className="size-3.5" />
          <span>{t("Presentatie")}</span>
        </button>
        <button
          onClick={() => handleTriggerExport("pdf")}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10 transition-all cursor-pointer shrink-0"
          title={t("Exporteer deze sprint als PDF")}
          aria-label="PDF"
        >
          <FileText className="size-3.5 text-brand" />
          <span>PDF</span>
        </button>
        <button
          onClick={() => handleTriggerExport("excel")}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10 transition-all cursor-pointer shrink-0"
          title={t("Exporteer deze sprint als Excel")}
          aria-label="Excel"
        >
          <FileSpreadsheet className="size-3.5 text-emerald-400" />
          <span>Excel</span>
        </button>
        <button
          type="button"
          onClick={handleExportSprintJson}
          className="p-2 rounded-lg text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-white/10 transition-all cursor-pointer flex items-center justify-center shrink-0"
          title={copiedSprintExport ? t("Gekopieerd naar klembord!") : t("Sprint kopiëren naar klembord")}
          aria-label={t("Sprint kopiëren naar klembord")}
        >
          {copiedSprintExport ? (
            <Check className="size-3.5 text-brand" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
