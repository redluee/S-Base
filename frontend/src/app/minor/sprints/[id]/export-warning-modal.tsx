"use client";

import { AlertTriangle } from "lucide-react";
import { t } from "@/lib/lang";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import type { useSprintExport } from "./use-sprint-export";

import type { Tab } from "./sprint-detail-types";

interface ExportWarningModalProps {
  setActiveTab: (tab: Tab) => void;
  exporter: ReturnType<typeof useSprintExport>;
}

export function ExportWarningModal({ setActiveTab, exporter }: ExportWarningModalProps) {
  const { setPendingExportType, exportValidationIssues, setExportValidationIssues, handleConfirmExportIgnore } = exporter;
  return (
    <ModalOverlay
      open
      onClose={() => setPendingExportType(null)}
      label={t("Controleer sprint voor export")}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
        <div className="flex items-center gap-2.5 text-amber-400 font-bold">
          <AlertTriangle className="size-5 shrink-0" />
          <h3 className="text-base text-white">{t("Controleer sprint voor export")}</h3>
        </div>
        
        <p className="text-xs text-zinc-300 leading-relaxed">
          {t("De volgende aandachtspunten zijn gevonden voor deze sprint:")}
        </p>

        <ul className="space-y-1.5 p-3 rounded-xl bg-zinc-950 border border-white/5 text-xs text-zinc-300">
          {exportValidationIssues.map((issue, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-amber-400 mt-0.5">•</span>
              <span>{issue}</span>
            </li>
          ))}
        </ul>

        <div className="pt-2 flex flex-col sm:flex-row justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              const hasStoryIssue = exportValidationIssues.some((i) => i.toLowerCase().includes("stories"));
              const hasFeedbackIssue = exportValidationIssues.some((i) => i.toLowerCase().includes("feedback"));
              const hasEvalIssue = exportValidationIssues.some((i) => i.toLowerCase().includes("zelfevaluatie"));
              const hasRefIssue = exportValidationIssues.some((i) => i.toLowerCase().includes("reflectie"));

              if (hasStoryIssue) setActiveTab("planning");
              else if (hasFeedbackIssue) setActiveTab("feedback");
              else if (hasEvalIssue) setActiveTab("self_eval");
              else if (hasRefIssue) setActiveTab("reflection");

              setPendingExportType(null);
              setExportValidationIssues([]);
            }}
            className="px-4 py-2 rounded-lg bg-brand text-zinc-950 font-semibold text-xs hover:bg-brand-hover transition-all cursor-pointer text-center"
          >
            {t("Sprint bewerken")}
          </button>
          <button
            type="button"
            onClick={handleConfirmExportIgnore}
            className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium cursor-pointer text-center"
          >
            {t("Negeren en downloaden")}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
