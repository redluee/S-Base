import { and, asc, eq, sql } from "drizzle-orm";
import db from "../../db/client";
import {
  minorFeedbackEntries,
  minorReflections,
  minorSelfEvaluations,
  minorSprints,
  minorStories,
  minorTeacherAssessments,
} from "../../db/schema";
import type {
  MinorFeedbackEntry,
  MinorReflection,
  MinorSelfEvaluation,
  MinorSprint,
  MinorSprintFull,
  MinorTeacherAssessment,
} from "../../types/shared";
import { orNotFound } from "../../utils/errors";
import type { MinorEvaluations } from "./minor-evaluations";
import { calculateSprintStatus, formatDate } from "./minor-helpers";
import type { MinorSchedule } from "./minor-schedule";
import { loadStoryChildren, toStory } from "./minor-story-mapper";

type SprintStatus = "planned" | "active" | "completed";

export interface SprintInput {
  sprintNumber?: string | null;
  name?: string | null;
  startDate?: string;
  endDate?: string | null;
  durationDays?: number | null;
  showAndGrowDate?: string | null;
  extendedDays?: number | null;
  extensionReason?: string | null;
  status?: SprintStatus | null;
}

type SprintRow = typeof minorSprints.$inferSelect;

export class MinorSprints {
  constructor(
    private readonly schedule: MinorSchedule,
    private readonly evaluations: MinorEvaluations,
  ) {}

  getNextNumber(userId: number): { nextNumber: string; nextName: string } {
    const sprints = db.select().from(minorSprints).where(eq(minorSprints.userId, userId)).all();
    if (sprints.length === 0) return { nextNumber: "1", nextName: "Sprint 1" };

    let maxNum = 0;
    for (const s of sprints) {
      const match = s.sprintNumber.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    const next = maxNum + 1;
    return { nextNumber: String(next), nextName: `Sprint ${next}` };
  }

  list(userId: number): MinorSprint[] {
    const rows = db.select().from(minorSprints).where(eq(minorSprints.userId, userId)).orderBy(asc(minorSprints.startDate), asc(minorSprints.id)).all();
    return rows.map((row) => this.withComputedStatus(row));
  }

  getById(id: number, userId: number): MinorSprintFull {
    const sprint = this.withComputedStatus(this.requireOwned(id, userId));

    const storiesRaw = db.select().from(minorStories).where(eq(minorStories.sprintId, id)).orderBy(asc(minorStories.orderIndex), asc(minorStories.id)).all();
    const { criteria, evidence } = loadStoryChildren(storiesRaw.map((s) => s.id));
    const stories = storiesRaw.map((s) => toStory(s, criteria, evidence));

    const selfEvaluations = this.loadSelfEvaluations(id);
    if (selfEvaluations.length === 0) this.evaluations.initDefaults(id);

    let teacherAssessments = this.loadTeacherAssessments(id);
    if (teacherAssessments.length === 0) {
      this.evaluations.initDefaults(id);
      teacherAssessments = this.loadTeacherAssessments(id);
    }

    const feedback = db.select().from(minorFeedbackEntries).where(eq(minorFeedbackEntries.sprintId, id)).orderBy(asc(minorFeedbackEntries.orderIndex), asc(minorFeedbackEntries.date)).all() as MinorFeedbackEntry[];
    const reflection = db.select().from(minorReflections).where(eq(minorReflections.sprintId, id)).get() as MinorReflection | null;

    return {
      ...sprint,
      stories,
      selfEvaluations: this.loadSelfEvaluations(id),
      teacherAssessments,
      feedback,
      reflection,
    };
  }

  create(userId: number, data: SprintInput & { startDate: string }): MinorSprint {
    const calc = this.schedule.calculateSprintDates(userId, data.startDate, data.durationDays ?? 14);
    const nextInfo = this.getNextNumber(userId);

    const sprintNumber = data.sprintNumber?.trim() || nextInfo.nextNumber;
    const name = data.name?.trim() || `Sprint ${sprintNumber}`;
    const endDate = data.endDate || calc.endDate;
    const status = data.status || calculateSprintStatus(data.startDate, endDate);

    const sprint = db.insert(minorSprints).values({
      userId,
      sprintNumber,
      name,
      startDate: data.startDate,
      endDate,
      durationDays: data.durationDays ?? calc.durationDays,
      showAndGrowDate: data.showAndGrowDate || calc.showAndGrowDate,
      extendedDays: calc.extendedDays,
      extensionReason: calc.extensionReason,
      status,
    }).returning().get() as MinorSprint;

    this.evaluations.initDefaults(sprint.id);
    return sprint;
  }

  update(id: number, userId: number, data: SprintInput): MinorSprint {
    const existing = this.requireOwned(id, userId);

    let extendedDays = data.extendedDays ?? existing.extendedDays;
    let extensionReason = data.extensionReason !== undefined ? data.extensionReason : existing.extensionReason;
    let endDate = data.endDate ?? existing.endDate;
    let showAndGrowDate = data.showAndGrowDate ?? existing.showAndGrowDate;
    const startDate = data.startDate ?? existing.startDate;

    if (data.startDate && data.startDate !== existing.startDate && !data.endDate) {
      const calc = this.schedule.calculateSprintDates(userId, data.startDate, data.durationDays ?? existing.durationDays);
      endDate = calc.endDate;
      showAndGrowDate = calc.showAndGrowDate;
      extendedDays = calc.extendedDays;
      extensionReason = calc.extensionReason;
    }

    const status = data.status || calculateSprintStatus(startDate, endDate);

    return db.update(minorSprints).set({
      sprintNumber: data.sprintNumber?.trim() ?? existing.sprintNumber,
      name: data.name?.trim() ?? existing.name,
      startDate,
      endDate,
      durationDays: data.durationDays ?? existing.durationDays,
      showAndGrowDate,
      extendedDays,
      extensionReason,
      status,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    }).where(eq(minorSprints.id, id)).returning().get() as MinorSprint;
  }

  remove(id: number, userId: number) {
    this.requireOwned(id, userId);
    db.delete(minorSprints).where(eq(minorSprints.id, id)).run();
    return { success: true };
  }

  requireOwned(id: number, userId: number): SprintRow {
    return orNotFound(
      db.select().from(minorSprints).where(and(eq(minorSprints.id, id), eq(minorSprints.userId, userId))).get(),
      "minor.sprintNotFound",
    );
  }

  private withComputedStatus(row: SprintRow): MinorSprint {
    const status = calculateSprintStatus(row.startDate, row.endDate, formatDate(new Date()), row.status as SprintStatus);
    if (row.status !== status) {
      db.update(minorSprints).set({ status, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(minorSprints.id, row.id)).run();
    }
    return { ...row, status } as MinorSprint;
  }

  private loadSelfEvaluations(sprintId: number): MinorSelfEvaluation[] {
    return db.select().from(minorSelfEvaluations).where(eq(minorSelfEvaluations.sprintId, sprintId)).orderBy(asc(minorSelfEvaluations.learningOutcome)).all() as MinorSelfEvaluation[];
  }

  private loadTeacherAssessments(sprintId: number): MinorTeacherAssessment[] {
    return db.select().from(minorTeacherAssessments).where(eq(minorTeacherAssessments.sprintId, sprintId)).orderBy(asc(minorTeacherAssessments.learningOutcome)).all() as MinorTeacherAssessment[];
  }
}
