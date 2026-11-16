import { today } from "./dates";

export const LEARNING_OUTCOMES = [1, 2, 3, 4, 5] as const;
export type LearningOutcome = (typeof LEARNING_OUTCOMES)[number];

export const SPRINT_STATUSES = ["planned", "active", "completed"] as const;
export type SprintStatus = (typeof SPRINT_STATUSES)[number];
export const STORY_STATUSES = ["todo", "in_progress", "done"] as const;
export type StoryStatus = (typeof STORY_STATUSES)[number];
export const CRITERION_TYPES = ["acceptance", "quality"] as const;
export type CriterionType = (typeof CRITERION_TYPES)[number];
export const EVIDENCE_TYPES = ["link", "github", "document", "app"] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];
export const SELF_EVALUATION_LEVELS = ["V", "NV", "-"] as const;
export type SelfEvaluationLevel = (typeof SELF_EVALUATION_LEVELS)[number];
export const TEACHER_ASSESSMENTS = ["V", "O", "-"] as const;
export type TeacherAssessment = (typeof TEACHER_ASSESSMENTS)[number];

export const DEFAULT_SPRINT_DAYS = 14;
export const FEW_LEARNING_OUTCOMES = 3;

export function isLearningOutcome(value: unknown): value is LearningOutcome {
  return typeof value === "number" && (LEARNING_OUTCOMES as readonly number[]).includes(value);
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function calculateSprintStatus(
  startDate: string,
  endDate: string,
  onDate: string = today(),
  currentStatus?: SprintStatus,
): SprintStatus {
  if (startDate > onDate) return "planned";
  if (endDate < onDate) return "completed";
  if (currentStatus === "completed") return "completed";
  return "active";
}

export function isSprintFinished(sprint: { status: SprintStatus; endDate: string }, onDate: string = today()) {
  return sprint.status === "completed" || sprint.endDate < onDate;
}

export type LearningOutcomeLevel = TeacherAssessment;

export const LEARNING_OUTCOME_TARGETS: Record<LearningOutcome, number> = { 1: 2, 2: 4, 3: 2, 4: 4, 5: 6 };
export const TOTAL_REQUIRED_PASSES = 24;

export function passProgress(officialPasses: Record<number, number>) {
  const total = Object.values(officialPasses).reduce((sum, count) => sum + count, 0);
  return {
    total,
    allMinimumsMet: LEARNING_OUTCOMES.every((lu) => (officialPasses[lu] || 0) >= LEARNING_OUTCOME_TARGETS[lu]),
    totalTargetMet: total >= TOTAL_REQUIRED_PASSES,
  };
}

export function isOfficialPass(teacherAssessment: string | null | undefined): boolean {
  return teacherAssessment === "V";
}

export function isProjectedPass(
  selfLevel: string | null | undefined,
  teacherAssessment: string | null | undefined,
): boolean {
  return isOfficialPass(teacherAssessment) || (teacherAssessment !== "O" && selfLevel === "V");
}

export function isPrognosisPass(
  selfLevel: string | null | undefined,
  teacherAssessment: string | null | undefined,
  plan: { sprintFinished: boolean; coveredByStory: boolean },
): boolean {
  if (isProjectedPass(selfLevel, teacherAssessment)) return true;
  if (plan.sprintFinished || !plan.coveredByStory) return false;
  return teacherAssessment !== "O" && selfLevel !== "NV";
}

export function learningOutcomeLevel(
  selfLevel: string | null | undefined,
  teacherAssessment: string | null | undefined,
): LearningOutcomeLevel {
  if (isProjectedPass(selfLevel, teacherAssessment)) return "V";
  if (teacherAssessment === "O" || selfLevel === "NV") return "O";
  return "-";
}

export interface DraftStory {
  storyNumber: string | null;
  title: string;
  status: StoryStatus;
  learningOutcomes: number[];
  evidence?: { type: string; title: string; url: string }[];
}

export function draftArgumentation(lu: number, stories: DraftStory[]): string | null {
  const linked = stories.filter((s) => s.learningOutcomes.includes(lu));
  if (linked.length === 0) return null;
  const label = (s: DraftStory) => `• ${s.storyNumber ? `[${s.storyNumber}] ` : ""}${s.title}`;
  const done = linked.filter((s) => s.status === "done");
  const open = linked.filter((s) => s.status !== "done");
  const sections: string[] = [];
  if (done.length > 0) {
    const lines = [`Voltooide stories voor LU ${lu}:`];
    for (const story of done) {
      lines.push(label(story));
      for (const ev of story.evidence ?? []) lines.push(`   - Bewijs (${ev.type}): ${ev.title} (${ev.url})`);
    }
    sections.push(lines.join("\n"));
  }
  if (open.length > 0) sections.push(["In uitvoering:", ...open.map(label)].join("\n"));
  return sections.join("\n\n");
}

export function noStoriesArgumentation(lu: number): string {
  return `Geen stories gekoppeld aan LU ${lu} in deze sprint.`;
}
