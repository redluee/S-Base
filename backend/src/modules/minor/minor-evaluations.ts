import {
  eq,
  and,
  asc,
  sql,
} from "drizzle-orm";
import db from "../../db/client";
import {
  minorSprints,
  minorSelfEvaluations,
  minorTeacherAssessments,
  minorFeedbackEntries,
  minorReflections,
} from "../../db/schema";
import type {
  MinorStory,
  MinorSelfEvaluation,
  MinorTeacherAssessment,
  MinorFeedbackEntry,
  MinorReflection,
} from "../../types/shared";
import {
  formatDate,
} from "./minor-helpers";
import {
  MinorScheduleService,
} from "./minor-schedule";

export class MinorEvaluationService extends MinorScheduleService {
  protected initSelfEvaluationsAndAssessments(sprintId: number) {
    for (let lu = 1; lu <= 5; lu++) {
      const existingEval = db.select().from(minorSelfEvaluations).where(and(eq(minorSelfEvaluations.sprintId, sprintId), eq(minorSelfEvaluations.learningOutcome, lu))).get();
      if (!existingEval) {
        db.insert(minorSelfEvaluations).values({
          sprintId,
          learningOutcome: lu,
          level: "-",
          argumentation: "",
        }).run();
      }

      const existingAssess = db.select().from(minorTeacherAssessments).where(and(eq(minorTeacherAssessments.sprintId, sprintId), eq(minorTeacherAssessments.learningOutcome, lu))).get();
      if (!existingAssess) {
        db.insert(minorTeacherAssessments).values({
          sprintId,
          learningOutcome: lu,
          assessment: "-",
          notes: "",
        }).run();
      }
    }

    const existingReflect = db.select().from(minorReflections).where(eq(minorReflections.sprintId, sprintId)).get();
    if (!existingReflect) {
      db.insert(minorReflections).values({
        sprintId,
        date: formatDate(new Date()),
        whatLearned: "",
        whatRetained: "",
        whatChange: "",
      }).run();
    }
  }

  syncSprintSelfEvaluations(_sprintId: number, _existingStories?: MinorStory[]) {
    // Intentionally no-op: self-evaluations should not be automatically populated or overwritten.
    // Explicit generation is handled via autoGenerateSelfEvaluations.
  }

  protected markLearningOutcomesSufficient(sprintId: number, learningOutcomes: number[]) {
    let changed = false;
    for (const lu of new Set(learningOutcomes)) {
      if (!Number.isInteger(lu) || lu < 1 || lu > 5) continue;
      const existing = db.select().from(minorSelfEvaluations).where(and(eq(minorSelfEvaluations.sprintId, sprintId), eq(minorSelfEvaluations.learningOutcome, lu))).get();
      if (existing) {
        if (existing.level === "V") continue;
        db.update(minorSelfEvaluations).set({ level: "V", updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(minorSelfEvaluations.id, existing.id)).run();
      } else {
        db.insert(minorSelfEvaluations).values({ sprintId, learningOutcome: lu, level: "V", argumentation: "" }).run();
      }
      changed = true;
    }
    return changed;
  }

  saveSelfEvaluations(sprintId: number, userId: number, items: { learningOutcome: number; level: "V" | "NV" | "-"; argumentation?: string }[]): MinorSelfEvaluation[] {
    const sprint = db.select().from(minorSprints).where(and(eq(minorSprints.id, sprintId), eq(minorSprints.userId, userId))).get();
    if (!sprint) throw new Error("Sprint not found");

    for (const item of items) {
      const existing = db.select().from(minorSelfEvaluations).where(and(eq(minorSelfEvaluations.sprintId, sprintId), eq(minorSelfEvaluations.learningOutcome, item.learningOutcome))).get();
      if (existing) {
        db.update(minorSelfEvaluations).set({
          level: item.level,
          argumentation: item.argumentation ?? existing.argumentation,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        }).where(eq(minorSelfEvaluations.id, existing.id)).run();
      } else {
        db.insert(minorSelfEvaluations).values({
          sprintId,
          learningOutcome: item.learningOutcome,
          level: item.level,
          argumentation: item.argumentation || "",
        }).run();
      }
    }

    const saved = db.select().from(minorSelfEvaluations).where(eq(minorSelfEvaluations.sprintId, sprintId)).orderBy(asc(minorSelfEvaluations.learningOutcome)).all() as MinorSelfEvaluation[];
    this.notifier.notify(userId, { event: "self_evaluations_saved", sprintId });
    return saved;
  }

  saveTeacherAssessments(sprintId: number, userId: number, items: { learningOutcome: number; assessment: "V" | "O" | "-"; notes?: string; evaluatedAt?: string }[]): MinorTeacherAssessment[] {
    const sprint = db.select().from(minorSprints).where(and(eq(minorSprints.id, sprintId), eq(minorSprints.userId, userId))).get();
    if (!sprint) throw new Error("Sprint not found");

    for (const item of items) {
      const existing = db.select().from(minorTeacherAssessments).where(and(eq(minorTeacherAssessments.sprintId, sprintId), eq(minorTeacherAssessments.learningOutcome, item.learningOutcome))).get();
      if (existing) {
        db.update(minorTeacherAssessments).set({
          assessment: item.assessment,
          notes: item.notes !== undefined ? item.notes : existing.notes,
          evaluatedAt: item.evaluatedAt ?? existing.evaluatedAt ?? formatDate(new Date()),
        }).where(eq(minorTeacherAssessments.id, existing.id)).run();
      } else {
        db.insert(minorTeacherAssessments).values({
          sprintId,
          learningOutcome: item.learningOutcome,
          assessment: item.assessment,
          notes: item.notes || "",
          evaluatedAt: item.evaluatedAt || formatDate(new Date()),
        }).run();
      }
    }

    return db.select().from(minorTeacherAssessments).where(eq(minorTeacherAssessments.sprintId, sprintId)).orderBy(asc(minorTeacherAssessments.learningOutcome)).all() as MinorTeacherAssessment[];
  }

  // --- Feedback Entries ---

  listFeedback(sprintId: number): MinorFeedbackEntry[] {
    return db.select().from(minorFeedbackEntries).where(eq(minorFeedbackEntries.sprintId, sprintId)).orderBy(asc(minorFeedbackEntries.orderIndex), asc(minorFeedbackEntries.id)).all() as MinorFeedbackEntry[];
  }

  addFeedback(sprintId: number, data: { date: string; fromWhom: string; feedback: string; action: string; orderIndex?: number }) {
    if (!data.fromWhom?.trim() || !data.feedback?.trim() || !data.action?.trim()) {
      throw new Error("All feedback fields are required");
    }
    return db.insert(minorFeedbackEntries).values({
      sprintId,
      date: data.date || formatDate(new Date()),
      fromWhom: data.fromWhom.trim(),
      feedback: data.feedback.trim(),
      action: data.action.trim(),
      orderIndex: data.orderIndex ?? 0,
    }).returning().get() as MinorFeedbackEntry;
  }

  updateFeedback(id: number, data: { date?: string; fromWhom?: string; feedback?: string; action?: string; orderIndex?: number }) {
    const existing = db.select().from(minorFeedbackEntries).where(eq(minorFeedbackEntries.id, id)).get();
    if (!existing) return null;
    return db.update(minorFeedbackEntries).set({
      date: data.date ?? existing.date,
      fromWhom: data.fromWhom?.trim() ?? existing.fromWhom,
      feedback: data.feedback?.trim() ?? existing.feedback,
      action: data.action?.trim() ?? existing.action,
      orderIndex: data.orderIndex ?? existing.orderIndex,
    }).where(eq(minorFeedbackEntries.id, id)).returning().get() as MinorFeedbackEntry;
  }

  deleteFeedback(id: number) {
    const existing = db.select().from(minorFeedbackEntries).where(eq(minorFeedbackEntries.id, id)).get();
    if (!existing) return null;
    db.delete(minorFeedbackEntries).where(eq(minorFeedbackEntries.id, id)).run();
    return { success: true };
  }

  // --- Reflection ---

  getReflection(sprintId: number): MinorReflection | null {
    return db.select().from(minorReflections).where(eq(minorReflections.sprintId, sprintId)).get() as MinorReflection | null;
  }

  saveReflection(sprintId: number, data: { date?: string; whatLearned?: string; whatRetained?: string; whatChange?: string }): MinorReflection {
    const saved = this.upsertReflection(sprintId, data);
    const sprint = db.select({ userId: minorSprints.userId }).from(minorSprints).where(eq(minorSprints.id, sprintId)).get();
    if (sprint) this.notifier.notify(sprint.userId, { event: "self_evaluations_saved", sprintId });
    return saved;
  }

  protected upsertReflection(sprintId: number, data: { date?: string; whatLearned?: string; whatRetained?: string; whatChange?: string }): MinorReflection {
    const existing = db.select().from(minorReflections).where(eq(minorReflections.sprintId, sprintId)).get();
    if (existing) {
      return db.update(minorReflections).set({
        date: data.date ?? existing.date,
        whatLearned: data.whatLearned !== undefined ? data.whatLearned : existing.whatLearned,
        whatRetained: data.whatRetained !== undefined ? data.whatRetained : existing.whatRetained,
        whatChange: data.whatChange !== undefined ? data.whatChange : existing.whatChange,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      }).where(eq(minorReflections.id, existing.id)).returning().get() as MinorReflection;
    } else {
      return db.insert(minorReflections).values({
        sprintId,
        date: data.date || formatDate(new Date()),
        whatLearned: data.whatLearned || "",
        whatRetained: data.whatRetained || "",
        whatChange: data.whatChange || "",
      }).returning().get() as MinorReflection;
    }
  }
}
