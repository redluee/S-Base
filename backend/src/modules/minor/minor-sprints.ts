import {
  eq,
  and,
  asc,
  inArray,
  sql,
} from "drizzle-orm";
import db from "../../db/client";
import {
  minorSprints,
  minorStories,
  minorStoryCriteria,
  minorStoryEvidence,
  minorSelfEvaluations,
  minorTeacherAssessments,
  minorFeedbackEntries,
  minorReflections,
} from "../../db/schema";
import type {
  MinorSprint,
  MinorSprintFull,
  MinorStory,
  MinorSelfEvaluation,
  MinorTeacherAssessment,
  MinorFeedbackEntry,
  MinorReflection,
} from "../../types/shared";
import {
  formatDate,
  calculateSprintStatus,
} from "./minor-helpers";
import {
  MinorStoryService,
} from "./minor-stories";

export class MinorSprintService extends MinorStoryService {
  // --- Sprints ---

  getNextSprintNumber(userId: number): { nextNumber: string; nextName: string } {
    const sprints = db.select().from(minorSprints).where(eq(minorSprints.userId, userId)).all();
    if (sprints.length === 0) {
      return { nextNumber: "1", nextName: "Sprint 1" };
    }

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

  listSprints(userId: number): MinorSprint[] {
    const sprints = db.select().from(minorSprints).where(eq(minorSprints.userId, userId)).orderBy(asc(minorSprints.startDate), asc(minorSprints.id)).all();
    const today = formatDate(new Date());

    return sprints.map((s) => {
      const computedStatus = calculateSprintStatus(s.startDate, s.endDate, today, s.status as any);
      if (s.status !== computedStatus) {
        db.update(minorSprints)
          .set({ status: computedStatus, updatedAt: sql`CURRENT_TIMESTAMP` })
          .where(eq(minorSprints.id, s.id))
          .run();
        return { ...s, status: computedStatus };
      }
      return { ...s, status: computedStatus };
    }) as MinorSprint[];
  }

  getSprintById(id: number, userId: number): MinorSprintFull | null {
    const sprintRaw = db.select().from(minorSprints).where(and(eq(minorSprints.id, id), eq(minorSprints.userId, userId))).get();
    if (!sprintRaw) return null;

    const today = formatDate(new Date());
    const computedStatus = calculateSprintStatus(sprintRaw.startDate, sprintRaw.endDate, today, sprintRaw.status as any);
    if (sprintRaw.status !== computedStatus) {
      db.update(minorSprints)
        .set({ status: computedStatus, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(minorSprints.id, sprintRaw.id))
        .run();
    }
    const sprint: MinorSprint = { ...sprintRaw, status: computedStatus } as MinorSprint;

    const storiesRaw = db.select().from(minorStories).where(eq(minorStories.sprintId, id)).orderBy(asc(minorStories.orderIndex), asc(minorStories.id)).all();
    const storyIds = storiesRaw.map((s) => s.id);

    const criteria = storyIds.length > 0
      ? db.select().from(minorStoryCriteria).where(inArray(minorStoryCriteria.storyId, storyIds)).orderBy(asc(minorStoryCriteria.orderIndex)).all()
      : [];

    const evidence = storyIds.length > 0
      ? db.select().from(minorStoryEvidence).where(inArray(minorStoryEvidence.storyId, storyIds)).orderBy(asc(minorStoryEvidence.id)).all()
      : [];

    const stories: MinorStory[] = storiesRaw.map((s) => {
      let outcomes: number[] = [];
      try {
        outcomes = JSON.parse(s.learningOutcomes);
      } catch {
        outcomes = [];
      }
      return {
        id: s.id,
        sprintId: s.sprintId,
        userId: s.userId,
        storyTypeCode: s.storyTypeCode,
        storyNumber: s.storyNumber,
        title: s.title,
        asA: s.asA,
        iWant: s.iWant,
        soThat: s.soThat,
        learningOutcomes: outcomes,
        status: s.status as "todo" | "in_progress" | "done",
        orderIndex: s.orderIndex,
        presentationData: s.presentationData ? (() => {
          try { return JSON.parse(s.presentationData); } catch { return null; }
        })() : null,
        createdAt: s.createdAt,
        criteria: criteria.filter((c) => c.storyId === s.id).map((c) => ({
          id: c.id,
          storyId: c.storyId,
          type: c.type as "acceptance" | "quality",
          orderIndex: c.orderIndex,
          indent: c.indent ?? 0,
          text: c.text,
          isCompleted: Boolean(c.isCompleted),
        })),
        evidence: evidence.filter((e) => e.storyId === s.id).map((e) => ({
          id: e.id,
          storyId: e.storyId,
          type: e.type as "link" | "github" | "document" | "app",
          title: e.title,
          url: e.url,
          createdAt: e.createdAt,
        })),
      };
    });

    let selfEvaluations = db.select().from(minorSelfEvaluations).where(eq(minorSelfEvaluations.sprintId, id)).orderBy(asc(minorSelfEvaluations.learningOutcome)).all() as MinorSelfEvaluation[];
    if (selfEvaluations.length === 0) {
      this.initSelfEvaluationsAndAssessments(id);
    }
    this.syncSprintSelfEvaluations(id, stories);
    selfEvaluations = db.select().from(minorSelfEvaluations).where(eq(minorSelfEvaluations.sprintId, id)).orderBy(asc(minorSelfEvaluations.learningOutcome)).all() as MinorSelfEvaluation[];

    let teacherAssessments = db.select().from(minorTeacherAssessments).where(eq(minorTeacherAssessments.sprintId, id)).orderBy(asc(minorTeacherAssessments.learningOutcome)).all() as MinorTeacherAssessment[];
    if (teacherAssessments.length === 0) {
      this.initSelfEvaluationsAndAssessments(id);
      teacherAssessments = db.select().from(minorTeacherAssessments).where(eq(minorTeacherAssessments.sprintId, id)).orderBy(asc(minorTeacherAssessments.learningOutcome)).all() as MinorTeacherAssessment[];
    }

    const feedback = db.select().from(minorFeedbackEntries).where(eq(minorFeedbackEntries.sprintId, id)).orderBy(asc(minorFeedbackEntries.orderIndex), asc(minorFeedbackEntries.date)).all() as MinorFeedbackEntry[];
    const reflection = db.select().from(minorReflections).where(eq(minorReflections.sprintId, id)).get() as MinorReflection | null;

    return {
      ...sprint,
      stories,
      selfEvaluations,
      teacherAssessments,
      feedback,
      reflection,
    };
  }

  createSprint(userId: number, data: {
    sprintNumber?: string;
    name?: string;
    startDate: string;
    endDate?: string;
    durationDays?: number;
    showAndGrowDate?: string;
    status?: "planned" | "active" | "completed";
  }): MinorSprint {
    const calc = this.calculateSprintDates(userId, data.startDate, data.durationDays ?? 14);
    const nextInfo = this.getNextSprintNumber(userId);

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

    this.initSelfEvaluationsAndAssessments(sprint.id);

    return sprint;
  }

  updateSprint(id: number, userId: number, data: Partial<{
    sprintNumber: string;
    name: string;
    startDate: string;
    endDate: string;
    durationDays: number;
    showAndGrowDate: string;
    extendedDays: number;
    extensionReason: string | null;
    status: "planned" | "active" | "completed";
  }>): MinorSprint | null {
    const existing = db.select().from(minorSprints).where(and(eq(minorSprints.id, id), eq(minorSprints.userId, userId))).get();
    if (!existing) return null;

    let extendedDays = data.extendedDays ?? existing.extendedDays;
    let extensionReason = data.extensionReason !== undefined ? data.extensionReason : existing.extensionReason;
    let endDate = data.endDate ?? existing.endDate;
    let showAndGrowDate = data.showAndGrowDate ?? existing.showAndGrowDate;
    const startDate = data.startDate ?? existing.startDate;

    // Recalculate if startDate or duration changed and not explicitly overridden
    if (data.startDate && data.startDate !== existing.startDate && !data.endDate) {
      const calc = this.calculateSprintDates(userId, data.startDate, data.durationDays ?? existing.durationDays);
      endDate = calc.endDate;
      showAndGrowDate = calc.showAndGrowDate;
      extendedDays = calc.extendedDays;
      extensionReason = calc.extensionReason;
    }

    const computedStatus = data.status || calculateSprintStatus(startDate, endDate);

    const updated = db.update(minorSprints).set({
      sprintNumber: data.sprintNumber?.trim() ?? existing.sprintNumber,
      name: data.name?.trim() ?? existing.name,
      startDate,
      endDate,
      durationDays: data.durationDays ?? existing.durationDays,
      showAndGrowDate,
      extendedDays,
      extensionReason,
      status: computedStatus,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    }).where(eq(minorSprints.id, id)).returning().get();

    return updated as MinorSprint;
  }

  deleteSprint(id: number, userId: number) {
    const existing = db.select().from(minorSprints).where(and(eq(minorSprints.id, id), eq(minorSprints.userId, userId))).get();
    if (!existing) return null;
    db.delete(minorSprints).where(eq(minorSprints.id, id)).run();
    return { success: true };
  }
}
