import { eq, sql } from "drizzle-orm";
import db from "../../db/client";
import { minorFeedbackEntries, minorSprints, minorStories } from "../../db/schema";
import type { MinorSprint, MinorSprintExportData, MinorSprintExportStory, MinorSprintFull } from "../../types/shared";
import { NotFoundError } from "../../utils/errors";
import type { MinorEvaluations } from "./minor-evaluations";
import type { MinorFeedback } from "./minor-feedback";
import { calculateSprintStatus, formatDate } from "./minor-helpers";
import {
  isRecord,
  type JsonRecord,
  parseFeedback,
  parseReflection,
  parseSelfEvaluations,
  parseStory,
  parseTeacherAssessments,
} from "./minor-import-parse";
import type { MinorSchedule } from "./minor-schedule";
import type { MinorSprints } from "./minor-sprints";
import type { MinorStories } from "./minor-stories";

function pickText(...values: unknown[]): string | undefined {
  const found = values.find((v) => v !== undefined && v !== null);
  return found === undefined ? undefined : String(found).trim();
}

export class MinorTransfer {
  constructor(
    private readonly sprints: MinorSprints,
    private readonly stories: MinorStories,
    private readonly schedule: MinorSchedule,
    private readonly evaluations: MinorEvaluations,
    private readonly feedback: MinorFeedback,
  ) {}

  exportSprint(sprintId: number, userId: number): MinorSprintExportData {
    const sprint = this.sprints.getById(sprintId, userId);

    const stories: MinorSprintExportStory[] = sprint.stories.map((s) => ({
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
        .map((c) => ({ text: c.text, isCompleted: c.isCompleted, indent: c.indent ?? 0 })),
      qualityCriteria: (s.criteria || [])
        .filter((c) => c.type === "quality")
        .map((c) => ({ text: c.text, isCompleted: c.isCompleted, indent: c.indent ?? 0 })),
      evidence: (s.evidence || []).map((e) => ({ type: e.type, title: e.title, url: e.url })),
    }));

    return {
      version: 1,
      sprintNumber: sprint.sprintNumber,
      name: sprint.name,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      durationDays: sprint.durationDays,
      showAndGrowDate: sprint.showAndGrowDate,
      extendedDays: sprint.extendedDays,
      extensionReason: sprint.extensionReason,
      status: sprint.status,
      stories,
      feedback: sprint.feedback.map((f) => ({
        date: f.date,
        fromWhom: f.fromWhom,
        feedback: f.feedback,
        action: f.action,
        orderIndex: f.orderIndex,
      })),
      selfEvaluations: sprint.selfEvaluations.map((se) => ({
        learningOutcome: se.learningOutcome,
        level: se.level,
        argumentation: se.argumentation || null,
      })),
      teacherAssessments: sprint.teacherAssessments.map((ta) => ({
        learningOutcome: ta.learningOutcome,
        assessment: ta.assessment,
        notes: ta.notes || null,
        evaluatedAt: ta.evaluatedAt || null,
      })),
      reflection: sprint.reflection
        ? {
            date: sprint.reflection.date,
            whatLearned: sprint.reflection.whatLearned || null,
            whatRetained: sprint.reflection.whatRetained || null,
            whatChange: sprint.reflection.whatChange || null,
          }
        : null,
    };
  }

  importSprint(userId: number, rawData: JsonRecord, targetSprintId?: number, overwrite?: boolean): MinorSprintFull {
    const data: JsonRecord = isRecord(rawData.sprint) ? rawData.sprint : rawData;
    const shouldOverwrite = Boolean(overwrite ?? rawData.overwrite ?? data.overwrite);
    const customName = pickText(rawData.customName, data.customName, data.name) ?? "";
    const customNumber = pickText(rawData.customSprintNumber, data.customSprintNumber, data.sprintNumber) ?? "";
    const resolvedTargetId = Number(targetSprintId ?? rawData.targetSprintId ?? data.targetSprintId);

    let sprintId: number;
    if (resolvedTargetId > 0) {
      const existing = this.requireTarget(resolvedTargetId, userId);
      sprintId = existing.id;
      if (shouldOverwrite) this.overwriteSprint(userId, existing, data, customName, customNumber);
    } else {
      sprintId = this.createImportedSprint(userId, data, customName, customNumber).id;
    }

    this.importChildren(userId, sprintId, data);
    return this.sprints.getById(sprintId, userId);
  }

  private requireTarget(id: number, userId: number) {
    try {
      return this.sprints.requireOwned(id, userId);
    } catch (error) {
      if (error instanceof NotFoundError) throw new NotFoundError("minor.targetSprintNotFound");
      throw error;
    }
  }

  private resolveDates(userId: number, data: JsonRecord, fallbackStart: string, fallbackDuration: number) {
    const startDate = data.startDate ? String(data.startDate).trim() : fallbackStart;
    const durationDays =
      typeof data.durationDays === "number" && data.durationDays > 0 ? data.durationDays : fallbackDuration;
    const calc = this.schedule.calculateSprintDates(userId, startDate, durationDays);
    const endDate = data.endDate ? String(data.endDate).trim() : calc.endDate;
    return {
      startDate,
      durationDays,
      endDate,
      showAndGrowDate: data.showAndGrowDate ? String(data.showAndGrowDate).trim() : calc.showAndGrowDate,
      extendedDays: typeof data.extendedDays === "number" ? data.extendedDays : calc.extendedDays,
      extensionReason:
        data.extensionReason !== undefined ? (data.extensionReason as string | null) : calc.extensionReason,
      status: calculateSprintStatus(startDate, endDate),
    };
  }

  private overwriteSprint(
    userId: number,
    existing: typeof minorSprints.$inferSelect,
    data: JsonRecord,
    name: string,
    number: string,
  ) {
    const dates = this.resolveDates(userId, data, existing.startDate, existing.durationDays);
    db.update(minorSprints)
      .set({
        sprintNumber: number || existing.sprintNumber,
        name: name || existing.name,
        ...dates,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(minorSprints.id, existing.id))
      .run();

    db.delete(minorStories).where(eq(minorStories.sprintId, existing.id)).run();
    db.delete(minorFeedbackEntries).where(eq(minorFeedbackEntries.sprintId, existing.id)).run();
  }

  private createImportedSprint(userId: number, data: JsonRecord, name: string, number: string): MinorSprint {
    const next = this.sprints.getNextNumber(userId);
    const dates = this.resolveDates(userId, data, formatDate(new Date()), 14);
    const created = db
      .insert(minorSprints)
      .values({
        userId,
        sprintNumber: number || (data.sprintNumber != null ? String(data.sprintNumber).trim() : next.nextNumber),
        name:
          name ||
          (data.name != null
            ? String(data.name).trim()
            : data.sprintNumber
              ? `Sprint ${data.sprintNumber}`
              : next.nextName),
        ...dates,
      })
      .returning()
      .get() as MinorSprint;
    this.evaluations.initDefaults(created.id);
    return created;
  }

  private importChildren(userId: number, sprintId: number, data: JsonRecord) {
    if (Array.isArray(data.stories)) {
      data.stories.forEach((raw, index) => {
        const story = parseStory(raw, index);
        if (story) this.stories.create(userId, sprintId, story);
      });
    }

    if (Array.isArray(data.feedback)) {
      data.feedback.forEach((raw, index) => {
        const entry = parseFeedback(raw, index);
        if (entry) this.feedback.add(sprintId, entry);
      });
    }

    const selfEvaluations = parseSelfEvaluations(data.selfEvaluations);
    if (selfEvaluations.length > 0) this.evaluations.saveSelfEvaluations(sprintId, userId, selfEvaluations);

    const assessments = parseTeacherAssessments(data.teacherAssessments);
    if (assessments.length > 0) this.evaluations.saveTeacherAssessments(sprintId, userId, assessments);

    const reflection = parseReflection(data.reflection);
    if (reflection) this.feedback.saveReflection(sprintId, reflection);
  }
}
