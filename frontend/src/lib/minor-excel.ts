import ExcelJS from "exceljs";
import { api, type MinorSprintFull } from "@/lib/api";
import { findSprintByNumber, resolveSprintLuLevel } from "./minor-excel-lu";
import { addDashboardSheet } from "./minor-excel-dashboard";
import { addListsSheet, addLogboekSheet } from "./minor-excel-logboek";

export {
  LU_MASTER_DEFINITIONS,
  findSprintByNumber,
  isLuRealizedInSprint,
  isLuSelectedInSprint,
  resolveSprintLuLevel,
  resolveSprintLuArgumentation,
} from "./minor-excel-lu";

export function buildIntegraalSprintLogboekWorkbook(sprints: MinorSprintFull[] = [], portfolioUrl?: string | null): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "S-Base Minor Module";
  wb.created = new Date();

  // Pre-calculate evaluation levels across all 8 sprints for dashboard formula results
  const sprintLuLevels: Record<number, Record<number, string>> = {}; // sprintNum -> lu -> level
  for (let sNum = 1; sNum <= 8; sNum++) {
    sprintLuLevels[sNum] = {};
    const sp = findSprintByNumber(sprints, sNum);
    for (let lu = 1; lu <= 5; lu++) {
      sprintLuLevels[sNum][lu] = resolveSprintLuLevel(sp, lu);
    }
  }

  addDashboardSheet(wb, sprintLuLevels, portfolioUrl);
  addLogboekSheet(wb, sprints);
  addListsSheet(wb);

  return wb;
}

export async function generateIntegraalSprintLogboekBlob(sprints: MinorSprintFull[] = [], portfolioUrl?: string | null): Promise<Blob> {
  const wb = buildIntegraalSprintLogboekWorkbook(sprints, portfolioUrl);
  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export async function downloadIntegraalSprintLogboek(
  providedSprints?: MinorSprintFull[],
  studentName?: string,
  customFilename?: string
): Promise<void> {
  // Only the sprints explicitly provided are treated as "selected" and get their data filled in;
  // any of Sprint 1 t/m 8 not present here renders as a blank placeholder block.
  const sprintsToUse: MinorSprintFull[] = providedSprints || [];

  // Bepaal de bestandsnaam en portfolio link
  let name = studentName;
  let portfolioUrl: string | null = null;
  try {
    const [me, settings] = await Promise.all([
      api.me().catch(() => null),
      api.minor.settings.get().catch(() => null),
    ]);
    if (!name) {
      if (me?.user?.username) {
        name = settings?.lastName ? `${me.user.username}_${settings.lastName}` : me.user.username;
      } else if (settings?.lastName) {
        name = settings.lastName;
      }
    }
    if (settings?.portfolioUrl) {
      portfolioUrl = settings.portfolioUrl;
    }
  } catch {
    // ignore
  }

  const baseFilename = (customFilename?.trim() || (name ? `Integraal_Sprint_Logboek_${name}` : "Integraal_Sprint_Logboek_v5")).replace(/\.xlsx$/i, "");
  const filename = `${baseFilename}.xlsx`;

  const blob = await generateIntegraalSprintLogboekBlob(sprintsToUse, portfolioUrl);

  if (typeof window !== "undefined") {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}

export function validateSprintForExport(sprint: MinorSprintFull, todayStr?: string): string[] {
  const issues: string[] = [];
  const today = todayStr || new Date().toISOString().slice(0, 10);

  // 1. Stories check: all stories completed (status === 'done') and at least 1 story
  const stories = sprint.stories || [];
  if (stories.length === 0) {
    issues.push("Geen user stories aanwezig in deze sprint");
  } else {
    const uncompleted = stories.filter((s) => s.status !== "done");
    if (uncompleted.length > 0) {
      issues.push(`Niet alle stories zijn voltooid (${uncompleted.length} story/stories staan nog niet op status done)`);
    }
  }

  // 2. Peer feedback check: at least 1 peer feedback point added (feedback text + fromWhom)
  const feedbackList = sprint.feedback || [];
  const validPeerFeedback = feedbackList.filter(
    (f) => f.feedback && f.feedback.trim().length > 0 && f.fromWhom && f.fromWhom.trim().length > 0
  );
  if (validPeerFeedback.length === 0) {
    issues.push("Minimaal 1 feedbackpunt van een medeleerling ontbreekt");
  }

  // 3. Self-evaluations check: all 5 self-evaluation fields filled in (level not '-' and argumentation not empty)
  const evals = sprint.selfEvaluations || [];
  const missingEvals: number[] = [];
  for (let lu = 1; lu <= 5; lu++) {
    const evalItem = evals.find((e) => e.learningOutcome === lu);
    const hasLevel = evalItem && evalItem.level && evalItem.level !== "-";
    const hasArg = evalItem && evalItem.argumentation && evalItem.argumentation.trim().length > 0;
    if (!hasLevel || !hasArg) {
      missingEvals.push(lu);
    }
  }
  if (missingEvals.length > 0) {
    issues.push(`Niet alle zelfevaluatievelden (niveau en toelichting) zijn ingevuld voor LU ${missingEvals.join(", ")}`);
  }

  // 4. Sprint reflection check: if sprint is completed or past end date, all reflection fields must be filled
  const isFinished = sprint.status === "completed" || sprint.endDate < today;
  if (isFinished) {
    const ref = sprint.reflection;
    const hasLearned = Boolean(ref?.whatLearned && ref.whatLearned.trim().length > 0);
    const hasRetained = Boolean(ref?.whatRetained && ref.whatRetained.trim().length > 0);
    const hasChange = Boolean(ref?.whatChange && ref.whatChange.trim().length > 0);
    if (!hasLearned || !hasRetained || !hasChange) {
      issues.push("Sprintreflectie is nog niet volledig ingevuld (wat geleerd, wat vasthouden, wat veranderen)");
    }
  }

  return issues;
}

// Backwards compatibility aliases
export async function downloadSprintExcel(sprint: MinorSprintFull): Promise<void> {
  await downloadIntegraalSprintLogboek([sprint]);
}

export async function downloadAllSprintsExcel(sprints: MinorSprintFull[], customFilename?: string): Promise<void> {
  await downloadIntegraalSprintLogboek(sprints, undefined, customFilename);
}
