import type { MinorStoryPresentationData } from "../../types/shared";
import { formatDate } from "./minor-helpers";
import type { EvidenceInput, StoryInput } from "./minor-stories";

export type JsonRecord = Record<string, unknown>;

const EVIDENCE_TYPES = ["link", "github", "document", "app"] as const;
const STORY_STATUSES = ["todo", "in_progress", "done"] as const;

export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function optionalText(value: unknown): string | undefined {
  return value != null ? String(value).trim() : undefined;
}

function isLearningOutcome(n: number): boolean {
  return !Number.isNaN(n) && n >= 1 && n <= 5;
}

function parseLearningOutcomes(raw: unknown): number[] {
  if (Array.isArray(raw)) return raw.map((n) => Number(n)).filter(isLearningOutcome);
  if (typeof raw === "number" || typeof raw === "string") {
    const parsed = Number(raw);
    return isLearningOutcome(parsed) ? [parsed] : [];
  }
  return [];
}

type ParsedCriterion = { text: string; isCompleted: boolean; indent: number };

function parseCriterion(item: unknown): ParsedCriterion | null {
  if (typeof item === "string") return { text: item.trim(), isCompleted: false, indent: 0 };
  if (!isRecord(item)) return null;
  return { text: text(item.text ?? item.title), isCompleted: Boolean(item.isCompleted), indent: item.indent ? 1 : 0 };
}

function parseCriteria(raw: unknown): ParsedCriterion[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(parseCriterion).filter((c): c is ParsedCriterion => Boolean(c?.text));
}

function parseEvidence(raw: unknown): EvidenceInput[] {
  if (!Array.isArray(raw)) return [];
  const result: EvidenceInput[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const title = text(item.title);
    const url = text(item.url);
    const rawType = String(item.type ?? "link");
    const type = EVIDENCE_TYPES.find((t) => t === rawType) ?? "link";
    if (title && url) result.push({ type, title, url });
  }
  return result;
}

export function parseStory(raw: unknown, index: number): StoryInput & { title: string } | null {
  if (!isRecord(raw)) return null;
  const title = text(raw.title ?? raw.name);
  if (!title) return null;

  const rawStatus = String(raw.status || "todo");
  const acceptance = parseCriteria(raw.acceptanceCriteria ?? raw.acceptance_criteria);
  const quality = parseCriteria(raw.qualityCriteria ?? raw.quality_criteria);

  if (Array.isArray(raw.criteria)) {
    for (const c of raw.criteria) {
      if (!isRecord(c)) continue;
      const criterionText = text(c.text ?? c.title);
      if (!criterionText) continue;
      const criterion = { text: criterionText, isCompleted: Boolean(c.isCompleted), indent: c.indent ? 1 : 0 };
      (c.type === "quality" ? quality : acceptance).push(criterion);
    }
  }

  return {
    storyTypeCode: text(raw.storyTypeCode ?? raw.type ?? raw.storyType ?? "US").toUpperCase(),
    storyNumber: optionalText(raw.storyNumber),
    title,
    asA: optionalText(raw.asA ?? raw.as_a ?? raw.role),
    iWant: optionalText(raw.iWant ?? raw.i_want ?? raw.want),
    soThat: optionalText(raw.soThat ?? raw.so_that ?? raw.purpose),
    learningOutcomes: parseLearningOutcomes(raw.learningOutcomes ?? raw.learning_outcomes ?? raw.lus ?? raw.lu),
    status: STORY_STATUSES.find((s) => s === rawStatus) ?? "todo",
    orderIndex: typeof raw.orderIndex === "number" ? raw.orderIndex : index + 1,
    presentationData: isRecord(raw.presentationData) ? (raw.presentationData as MinorStoryPresentationData) : null,
    acceptanceCriteria: acceptance,
    qualityCriteria: quality,
    evidence: parseEvidence(raw.evidence ?? raw.evidenceList),
  };
}

export function parseFeedback(raw: unknown, index: number) {
  if (!isRecord(raw)) return null;
  const fromWhom = text(raw.fromWhom ?? raw.from_whom);
  const feedback = text(raw.feedback);
  const action = text(raw.action);
  if (!fromWhom || (!feedback && !action)) return null;
  return {
    date: raw.date ? String(raw.date).trim() : formatDate(new Date()),
    fromWhom,
    feedback,
    action,
    orderIndex: typeof raw.orderIndex === "number" ? raw.orderIndex : index + 1,
  };
}

export function parseSelfEvaluations(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  const levels = ["V", "NV", "-"] as const;
  return raw
    .filter((e): e is JsonRecord & { learningOutcome: number } => isRecord(e) && typeof e.learningOutcome === "number" && e.learningOutcome >= 1 && e.learningOutcome <= 5)
    .map((e) => ({
      learningOutcome: e.learningOutcome,
      level: levels.find((l) => l === e.level) ?? "-",
      argumentation: e.argumentation ? String(e.argumentation) : "",
    }));
}

export function parseTeacherAssessments(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  const values = ["V", "O", "-"] as const;
  return raw
    .filter((a): a is JsonRecord & { learningOutcome: number } => isRecord(a) && typeof a.learningOutcome === "number" && a.learningOutcome >= 1 && a.learningOutcome <= 5)
    .map((a) => ({
      learningOutcome: a.learningOutcome,
      assessment: values.find((v) => v === a.assessment) ?? "-",
      notes: a.notes ? String(a.notes) : "",
      evaluatedAt: a.evaluatedAt ? String(a.evaluatedAt) : undefined,
    }));
}

export function parseReflection(raw: unknown) {
  if (!isRecord(raw)) return null;
  return {
    date: raw.date ? String(raw.date) : formatDate(new Date()),
    whatLearned: raw.whatLearned ? String(raw.whatLearned) : "",
    whatRetained: raw.whatRetained ? String(raw.whatRetained) : "",
    whatChange: raw.whatChange ? String(raw.whatChange) : "",
  };
}
