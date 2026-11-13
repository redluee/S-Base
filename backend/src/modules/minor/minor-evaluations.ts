import { and, asc, eq, sql } from "drizzle-orm";
import db from "../../db/client";
import { requireOwnedSprint } from "./minor-ownership";
import { minorReflections, minorSelfEvaluations, minorTeacherAssessments } from "../../db/schema";
import type { MinorSelfEvaluation, MinorTeacherAssessment } from "../../types/shared";
import { today } from "../../shared/dates";
import { LEARNING_OUTCOMES, type SelfEvaluationLevel, type TeacherAssessment } from "../../shared/minor";
import type { PublishNotifier } from "./publish-notifier";

export interface SelfEvaluationInput {
  learningOutcome: number;
  level: SelfEvaluationLevel;
  argumentation?: string | null;
}

export interface TeacherAssessmentInput {
  learningOutcome: number;
  assessment: TeacherAssessment;
  notes?: string | null;
  evaluatedAt?: string | null;
}

export class MinorEvaluations {
  constructor(private readonly notifier: PublishNotifier) {}

  initDefaults(sprintId: number) {
    for (const lu of LEARNING_OUTCOMES) {
      const existingEval = db
        .select()
        .from(minorSelfEvaluations)
        .where(and(eq(minorSelfEvaluations.sprintId, sprintId), eq(minorSelfEvaluations.learningOutcome, lu)))
        .get();
      if (!existingEval) {
        db.insert(minorSelfEvaluations).values({ sprintId, learningOutcome: lu, level: "-", argumentation: "" }).run();
      }

      const existingAssess = db
        .select()
        .from(minorTeacherAssessments)
        .where(and(eq(minorTeacherAssessments.sprintId, sprintId), eq(minorTeacherAssessments.learningOutcome, lu)))
        .get();
      if (!existingAssess) {
        db.insert(minorTeacherAssessments).values({ sprintId, learningOutcome: lu, assessment: "-", notes: "" }).run();
      }
    }

    const existingReflect = db.select().from(minorReflections).where(eq(minorReflections.sprintId, sprintId)).get();
    if (!existingReflect) {
      db.insert(minorReflections)
        .values({
          sprintId,
          date: today(),
          whatLearned: "",
          whatRetained: "",
          whatChange: "",
        })
        .run();
    }
  }

  markLearningOutcomesSufficient(sprintId: number, learningOutcomes: number[]): boolean {
    let changed = false;
    for (const lu of new Set(learningOutcomes)) {
      if (!Number.isInteger(lu) || lu < 1 || lu > 5) continue;
      const existing = db
        .select()
        .from(minorSelfEvaluations)
        .where(and(eq(minorSelfEvaluations.sprintId, sprintId), eq(minorSelfEvaluations.learningOutcome, lu)))
        .get();
      if (existing) {
        if (existing.level === "V") continue;
        db.update(minorSelfEvaluations)
          .set({ level: "V", updatedAt: sql`CURRENT_TIMESTAMP` })
          .where(eq(minorSelfEvaluations.id, existing.id))
          .run();
      } else {
        db.insert(minorSelfEvaluations).values({ sprintId, learningOutcome: lu, level: "V", argumentation: "" }).run();
      }
      changed = true;
    }
    return changed;
  }

  saveSelfEvaluations(sprintId: number, userId: number, items: SelfEvaluationInput[]): MinorSelfEvaluation[] {
    requireOwnedSprint(sprintId, userId);

    for (const item of items) {
      const existing = db
        .select()
        .from(minorSelfEvaluations)
        .where(
          and(
            eq(minorSelfEvaluations.sprintId, sprintId),
            eq(minorSelfEvaluations.learningOutcome, item.learningOutcome),
          ),
        )
        .get();
      if (existing) {
        db.update(minorSelfEvaluations)
          .set({
            level: item.level,
            argumentation: item.argumentation ?? existing.argumentation,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          })
          .where(eq(minorSelfEvaluations.id, existing.id))
          .run();
      } else {
        db.insert(minorSelfEvaluations)
          .values({
            sprintId,
            learningOutcome: item.learningOutcome,
            level: item.level,
            argumentation: item.argumentation || "",
          })
          .run();
      }
    }

    const saved = db
      .select()
      .from(minorSelfEvaluations)
      .where(eq(minorSelfEvaluations.sprintId, sprintId))
      .orderBy(asc(minorSelfEvaluations.learningOutcome))
      .all() as MinorSelfEvaluation[];
    this.notifier.notify(userId, { event: "self_evaluations_saved", sprintId });
    return saved;
  }

  saveTeacherAssessments(sprintId: number, userId: number, items: TeacherAssessmentInput[]): MinorTeacherAssessment[] {
    requireOwnedSprint(sprintId, userId);

    for (const item of items) {
      const existing = db
        .select()
        .from(minorTeacherAssessments)
        .where(
          and(
            eq(minorTeacherAssessments.sprintId, sprintId),
            eq(minorTeacherAssessments.learningOutcome, item.learningOutcome),
          ),
        )
        .get();
      if (existing) {
        db.update(minorTeacherAssessments)
          .set({
            assessment: item.assessment,
            notes: item.notes !== undefined ? item.notes : existing.notes,
            evaluatedAt: item.evaluatedAt ?? existing.evaluatedAt ?? today(),
          })
          .where(eq(minorTeacherAssessments.id, existing.id))
          .run();
      } else {
        db.insert(minorTeacherAssessments)
          .values({
            sprintId,
            learningOutcome: item.learningOutcome,
            assessment: item.assessment,
            notes: item.notes || "",
            evaluatedAt: item.evaluatedAt || today(),
          })
          .run();
      }
    }

    return db
      .select()
      .from(minorTeacherAssessments)
      .where(eq(minorTeacherAssessments.sprintId, sprintId))
      .orderBy(asc(minorTeacherAssessments.learningOutcome))
      .all() as MinorTeacherAssessment[];
  }
}
