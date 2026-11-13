"use client";

import { api } from "@/lib/api";
import { useState } from "react";
import { copySprintJson, downloadLogboek } from "@/app/minor/export-files";
import { validateSprintForExport } from "@/app/minor/export-validation";
import type { MinorSprintFull, MinorSelfEvaluation } from "@/lib/api";

export function useSprintExport(
  sprint: MinorSprintFull,
  selfEvals: MinorSelfEvaluation[],
  getCurrentFullSprint: () => MinorSprintFull,
  report: (err: unknown, fallbackKey: string) => void,
) {
  const [copiedSprintExport, setCopiedSprintExport] = useState(false);

  const [pendingExportType, setPendingExportType] = useState<"pdf" | "excel" | null>(null);
  const [exportValidationIssues, setExportValidationIssues] = useState<string[]>([]);

  function handleExportSprintJson() {
    copySprintJson(sprint.id)
      .then(() => {
        setCopiedSprintExport(true);
        setTimeout(() => setCopiedSprintExport(false), 2500);
      })
      .catch((err) => report(err, "minor.exportFailed"));
  }

  function download(type: "pdf" | "excel", data: MinorSprintFull) {
    downloadLogboek(type === "pdf" ? "pdf" : "xlsx", [data]).catch((err) => report(err, "minor.exportFailed"));
  }

  function handleTriggerExport(type: "pdf" | "excel") {
    api.minor.sprints.saveSelfEvaluations(
      sprint.id,
      selfEvals.map((e) => ({
        learningOutcome: e.learningOutcome,
        level: e.level,
        argumentation: e.argumentation || "",
      }))
    ).catch((err) => report(err, "minor.saveFailed"));

    const currentData = getCurrentFullSprint();
    const issues = validateSprintForExport(currentData);
    if (issues.length > 0) {
      setExportValidationIssues(issues);
      setPendingExportType(type);
    } else {
      setExportValidationIssues([]);
      download(type, currentData);
    }
  }

  function handleConfirmExportIgnore() {
    const currentData = getCurrentFullSprint();
    if (pendingExportType) download(pendingExportType, currentData);
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
