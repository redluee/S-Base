import type { MinorSprintFull, MinorSprintExportData } from "@/lib/api";

function formatCleanSprint(sprint: MinorSprintFull | MinorSprintExportData): MinorSprintExportData {
  if ("version" in sprint && Array.isArray(sprint.stories)) {
    return sprint as MinorSprintExportData;
  }

  const full = sprint as MinorSprintFull;
  return {
    version: 1,
    sprintNumber: full.sprintNumber,
    name: full.name,
    startDate: full.startDate,
    endDate: full.endDate,
    durationDays: full.durationDays,
    showAndGrowDate: full.showAndGrowDate,
    extendedDays: full.extendedDays,
    extensionReason: full.extensionReason,
    status: full.status,
    stories: (full.stories || []).map((s) => ({
      storyTypeCode: s.storyTypeCode,
      storyNumber: s.storyNumber || undefined,
      title: s.title,
      asA: s.asA || undefined,
      iWant: s.iWant || undefined,
      soThat: s.soThat || undefined,
      learningOutcomes: s.learningOutcomes,
      status: s.status,
      orderIndex: s.orderIndex,
      presentationData: s.presentationData || undefined,
      acceptanceCriteria: (s.criteria || [])
        .filter((c) => c.type === "acceptance")
        .map((c) => ({
          text: c.text,
          isCompleted: c.isCompleted,
          indent: c.indent ?? 0,
        })),
      qualityCriteria: (s.criteria || [])
        .filter((c) => c.type === "quality")
        .map((c) => ({
          text: c.text,
          isCompleted: c.isCompleted,
          indent: c.indent ?? 0,
        })),
      evidence: (s.evidence || []).map((e) => ({
        type: e.type,
        title: e.title,
        url: e.url,
      })),
    })),
    feedback: (full.feedback || []).map((f) => ({
      date: f.date,
      fromWhom: f.fromWhom,
      feedback: f.feedback,
      action: f.action,
      orderIndex: f.orderIndex,
    })),
    selfEvaluations: (full.selfEvaluations || []).map((se) => ({
      learningOutcome: se.learningOutcome,
      level: se.level,
      argumentation: se.argumentation || null,
    })),
    teacherAssessments: (full.teacherAssessments || []).map((ta) => ({
      learningOutcome: ta.learningOutcome,
      assessment: ta.assessment,
      notes: ta.notes || null,
      evaluatedAt: ta.evaluatedAt || null,
    })),
    reflection: full.reflection
      ? {
          date: full.reflection.date,
          whatLearned: full.reflection.whatLearned || null,
          whatRetained: full.reflection.whatRetained || null,
          whatChange: full.reflection.whatChange || null,
        }
      : null,
  };
}

export function copySprintJsonToClipboard(
  sprint: MinorSprintFull | MinorSprintExportData
): boolean {
  const clean = formatCleanSprint(sprint);
  const json = JSON.stringify(clean, null, 2);

  if (typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText(json).catch((err) => {
      console.warn("Clipboard write failed:", err);
    });
    return true;
  }
  return false;
}

export function downloadSprintJson(
  sprint: MinorSprintFull | MinorSprintExportData,
  customFilename?: string
): boolean {
  const clean = formatCleanSprint(sprint);
  const json = JSON.stringify(clean, null, 2);

  if (typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText(json).catch((err) => {
      console.warn("Clipboard write failed:", err);
    });
  }

  if (typeof window !== "undefined") {
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const rawName = customFilename || `sprint_${clean.sprintNumber || "export"}.json`;
    a.download = rawName.toLowerCase().replace(/[^a-z0-9_.-]/g, "_");
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return true;
}

export function downloadMultipleSprintsJson(
  sprints: (MinorSprintFull | MinorSprintExportData)[],
  customFilename: string = "sprints_portfolio_export.json"
): boolean {
  const cleanSprints = sprints.map(formatCleanSprint);
  const json = JSON.stringify(cleanSprints, null, 2);

  if (typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText(json).catch((err) => {
      console.warn("Clipboard write failed:", err);
    });
  }

  if (typeof window !== "undefined") {
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = customFilename.toLowerCase().replace(/[^a-z0-9_.-]/g, "_");
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return true;
}
