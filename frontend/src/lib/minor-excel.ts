import * as XLSX from "xlsx";
import type { MinorSprintFull } from "@/lib/api";

type CellValue = string | number | boolean | null | undefined;

function buildSprintWorksheetData(sprint: MinorSprintFull): CellValue[][] {
  const rows: CellValue[][] = [];

  // Header
  rows.push([sprint.name.toUpperCase(), `Sprintnummer: ${sprint.sprintNumber}`]);
  rows.push([`Periode: ${sprint.startDate} t/m ${sprint.endDate}`, `Show & Grow Datum: ${sprint.showAndGrowDate}`]);
  if (sprint.extendedDays > 0) {
    rows.push([`Vakantieverlenging: +${sprint.extendedDays} dagen (${sprint.extensionReason})`, `Status: ${sprint.status}`]);
  } else {
    rows.push([`Status: ${sprint.status}`]);
  }
  rows.push([]);

  // 1. PLANNING
  rows.push(["1. PLANNING"]);
  rows.push([
    "Type",
    "Story Nr",
    "Titel",
    "Als...",
    "Wil ik...",
    "Zodat...",
    "Leeruitkomsten",
    "Acceptatiecriteria",
    "Kwaliteitscriteria",
    "Bewijslast / Links",
    "Status",
  ]);

  if (sprint.stories.length === 0) {
    rows.push(["Geen stories opgenomen in deze sprint."]);
  } else {
    for (const story of sprint.stories) {
      const acceptanceStr = (story.criteria?.filter((c) => c.type === "acceptance") || [])
        .map((c) => ((c.indent ?? 0) > 0 ? `   ↳ ${c.isCompleted ? "[x]" : "[ ]"} ${c.text}` : `${c.isCompleted ? "[x]" : "[ ]"} ${c.orderIndex}. ${c.text}`))
        .join("\n");

      const qualityStr = (story.criteria?.filter((c) => c.type === "quality") || [])
        .map((c) => ((c.indent ?? 0) > 0 ? `   ↳ ${c.isCompleted ? "[x]" : "[ ]"} ${c.text}` : `${c.isCompleted ? "[x]" : "[ ]"} ${c.orderIndex}. ${c.text}`))
        .join("\n");

      const evidenceStr = (story.evidence || [])
        .map((e) => `(${e.type}) ${e.title}: ${e.url}`)
        .join("\n");

      rows.push([
        story.storyTypeCode,
        story.storyNumber || "-",
        story.title,
        story.asA || "-",
        story.iWant || "-",
        story.soThat || "-",
        story.learningOutcomes.map((l) => `LU ${l}`).join(", "),
        acceptanceStr || "-",
        qualityStr || "-",
        evidenceStr || "-",
        story.status,
      ]);
    }
  }

  rows.push([]);

  // 2. FEEDBACK
  rows.push(["2. FEEDBACK"]);
  rows.push(["Datum", "Van wie", "Feedback", "Jouw actie"]);
  if (sprint.feedback.length === 0) {
    rows.push(["Geen feedbackregels geregistreerd."]);
  } else {
    for (const fb of sprint.feedback) {
      rows.push([fb.date, fb.fromWhom, fb.feedback, fb.action]);
    }
  }

  rows.push([]);

  // 3. ZELFEVALUATIE & BEOORDELING
  rows.push(["3. ZELFEVALUATIE & BEOORDELING"]);
  rows.push(["Leeruitkomst", "Zelfevaluatie (Niveau)", "Argumentatie en bewijs", "Docentoordeel", "Docent Notities"]);
  for (let lu = 1; lu <= 5; lu++) {
    const evalItem = sprint.selfEvaluations.find((e) => e.learningOutcome === lu);
    const assessItem = sprint.teacherAssessments.find((a) => a.learningOutcome === lu);
    rows.push([
      `LU ${lu}`,
      evalItem?.level ?? "-",
      evalItem?.argumentation ?? "-",
      assessItem?.assessment ?? "-",
      assessItem?.notes ?? "-",
    ]);
  }

  rows.push([]);

  // 4. REFLECTIE
  rows.push(["4. REFLECTIE"]);
  rows.push(["Vraag", "Inhoud"]);
  rows.push(["Datum", sprint.reflection?.date || "-"]);
  rows.push(["Wat heb je geleerd?", sprint.reflection?.whatLearned || "-"]);
  rows.push(["Wat behoud je?", sprint.reflection?.whatRetained || "-"]);
  rows.push(["Wat ga je anders doen?", sprint.reflection?.whatChange || "-"]);

  return rows;
}

function sanitizeSheetName(name: string, index: number): string {
  const clean = name.replace(/[\\/*?:[\]]/g, "_").trim();
  return clean.slice(0, 30) || `Sprint_${index + 1}`;
}

export function downloadSprintExcel(sprint: MinorSprintFull) {
  const wb = XLSX.utils.book_new();
  const data = buildSprintWorksheetData(sprint);
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  ws["!cols"] = [
    { wch: 12 },
    { wch: 15 },
    { wch: 30 },
    { wch: 20 },
    { wch: 25 },
    { wch: 25 },
    { wch: 16 },
    { wch: 35 },
    { wch: 35 },
    { wch: 35 },
    { wch: 12 },
  ];

  const sheetName = sanitizeSheetName(sprint.name, 0);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `Minor_${sprint.name.replace(/\s+/g, "_")}.xlsx`);
}

export function downloadAllSprintsExcel(sprints: MinorSprintFull[]) {
  const wb = XLSX.utils.book_new();
  const usedNames = new Set<string>();

  sprints.forEach((sprint, idx) => {
    const data = buildSprintWorksheetData(sprint);
    const ws = XLSX.utils.aoa_to_sheet(data);

    ws["!cols"] = [
      { wch: 12 },
      { wch: 15 },
      { wch: 30 },
      { wch: 20 },
      { wch: 25 },
      { wch: 25 },
      { wch: 16 },
      { wch: 35 },
      { wch: 35 },
      { wch: 35 },
      { wch: 12 },
    ];

    const baseName = sanitizeSheetName(sprint.name, idx);
    let finalName = baseName;
    let count = 1;
    while (usedNames.has(finalName)) {
      finalName = `${baseName.slice(0, 27)}_${count++}`;
    }
    usedNames.add(finalName);

    XLSX.utils.book_append_sheet(wb, ws, finalName);
  });

  XLSX.writeFile(wb, `Minor_Portfolio_Alle_Sprints.xlsx`);
}
