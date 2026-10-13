"use client";

import { api } from "@/lib/api";
import { useState } from "react";
import { downloadSprintPDF } from "@/components/minor-pdf";
import { downloadSprintExcel, validateSprintForExport } from "@/lib/minor-excel";
import { copySprintJsonToClipboard } from "@/lib/minor-sprint-export";
import type { MinorSprintFull, MinorSelfEvaluation } from "@/lib/api";

export function useSprintExport(sprint: MinorSprintFull, selfEvals: MinorSelfEvaluation[], getCurrentFullSprint: () => MinorSprintFull) {
  const [copiedSprintExport, setCopiedSprintExport] = useState(false);

  const [pendingExportType, setPendingExportType] = useState<"pdf" | "excel" | null>(null);
  const [exportValidationIssues, setExportValidationIssues] = useState<string[]>([]);

  function handleExportSprintJson() {
    copySprintJsonToClipboard(sprint);
    setCopiedSprintExport(true);
    setTimeout(() => setCopiedSprintExport(false), 2500);
  }

  // Export with Pre-check (US 6.2)
  function handleTriggerExport(type: "pdf" | "excel") {
    // Auto-save evaluations to backend in background if exporting
    api.minor.sprints.saveSelfEvaluations(
      sprint.id,
      selfEvals.map((e) => ({
        learningOutcome: e.learningOutcome,
        level: e.level,
        argumentation: e.argumentation || "",
      }))
    ).catch(() => {});

    const currentData = getCurrentFullSprint();
    const issues = validateSprintForExport(currentData);
    if (issues.length > 0) {
      setExportValidationIssues(issues);
      setPendingExportType(type);
    } else {
      setExportValidationIssues([]);
      if (type === "pdf") downloadSprintPDF(currentData);
      else downloadSprintExcel(currentData);
    }
  }

  function handleConfirmExportIgnore() {
    const currentData = getCurrentFullSprint();
    if (pendingExportType === "pdf") {
      downloadSprintPDF(currentData);
    } else if (pendingExportType === "excel") {
      downloadSprintExcel(currentData);
    }
    setPendingExportType(null);
    setExportValidationIssues([]);
  }

  return {
    copiedSprintExport,
    setCopiedSprintExport,
    pendingExportType,
    setPendingExportType,
    exportValidationIssues,
    setExportValidationIssues,
    handleExportSprintJson,
    handleTriggerExport,
    handleConfirmExportIgnore,
  };
}
