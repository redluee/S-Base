import { eq, and, desc, asc, sql } from "drizzle-orm";
import db from "../../db/client";
import { workoutTemplates, templateExercises, workoutSessions, sessionExercises, sessionSets } from "../../db/schema";
import { ValidationError } from "../../utils/validation";
import { type TemplateExerciseInput, validateTemplateInput, templateExerciseValues, parseDateString } from "./workout-helpers";

export class WorkoutTemplateService {
  listTemplates(userId: number) {
    return db.select({
      templateId: workoutTemplates.templateId,
      userId: workoutTemplates.userId,
      name: workoutTemplates.name,
      description: workoutTemplates.description,
      targetMuscleGroups: workoutTemplates.targetMuscleGroups,
      estimatedTime: workoutTemplates.estimatedTime,
      createdAt: workoutTemplates.createdAt,
      exerciseCount: sql<number>`(SELECT COUNT(*) FROM template_exercises WHERE template_exercises.template_id = workout_templates.template_id)`
    })
    .from(workoutTemplates)
    .where(eq(workoutTemplates.userId, userId))
    .orderBy(asc(workoutTemplates.sortOrder), desc(workoutTemplates.createdAt))
    .all();
  }

  reorderTemplates(userId: number, orderedIds: number[]) {
    const owned = db.select({ templateId: workoutTemplates.templateId })
      .from(workoutTemplates)
      .where(eq(workoutTemplates.userId, userId))
      .all();
    const ownedIds = new Set(owned.map((o) => o.templateId));

    if (!Array.isArray(orderedIds) || orderedIds.length !== ownedIds.size || new Set(orderedIds).size !== orderedIds.length || orderedIds.some((id) => !ownedIds.has(id))) {
      throw new ValidationError("Template order must include exactly the current templates");
    }

    db.transaction((tx) => {
      orderedIds.forEach((templateId, index) => {
        tx.update(workoutTemplates)
          .set({ sortOrder: index })
          .where(and(eq(workoutTemplates.templateId, templateId), eq(workoutTemplates.userId, userId)))
          .run();
      });
    });

    return this.listTemplates(userId);
  }

  getTemplate(id: number, userId?: number) {
    const conditions = [eq(workoutTemplates.templateId, id)];
    if (userId !== undefined) {
      conditions.push(eq(workoutTemplates.userId, userId));
    }
    const template = db.select().from(workoutTemplates).where(and(...conditions)).get();
    if (!template) return null;

    const exercises = db.select()
      .from(templateExercises)
      .where(eq(templateExercises.templateId, id))
      .orderBy(templateExercises.sortOrder)
      .all();

    return { ...template, exercises };
  }

  createTemplate(userId: number, data: {
    name: string;
    description?: string;
    targetMuscleGroups?: string;
    estimatedTime?: number;
    exercises?: TemplateExerciseInput[];
  }) {
    validateTemplateInput(data, true);

    const templateId = db.transaction((tx) => {
      const nextSortOrder = tx.select({
        nextSortOrder: sql<number>`COALESCE(MAX(${workoutTemplates.sortOrder}), -1) + 1`
      }).from(workoutTemplates).where(eq(workoutTemplates.userId, userId)).get()!.nextSortOrder;

      const template = tx.insert(workoutTemplates).values({
        userId,
        name: data.name,
        description: data.description,
        targetMuscleGroups: data.targetMuscleGroups,
        estimatedTime: data.estimatedTime,
        sortOrder: nextSortOrder,
      }).returning().get();

      (data.exercises ?? []).forEach((ex, i) => {
        tx.insert(templateExercises).values(templateExerciseValues(template.templateId, ex, i)).run();
      });

      return template.templateId;
    });

    return this.getTemplate(templateId, userId);
  }

  updateTemplate(id: number, userId: number, data: {
    name?: string;
    description?: string | null;
    targetMuscleGroups?: string | null;
    estimatedTime?: number | null;
    exercises?: TemplateExerciseInput[];
  }) {
    const existing = db.select().from(workoutTemplates).where(and(eq(workoutTemplates.templateId, id), eq(workoutTemplates.userId, userId))).get();
    if (!existing) return null;

    validateTemplateInput(data, false);

    db.transaction((tx) => {
      tx.update(workoutTemplates).set({
        name: data.name ?? existing.name,
        description: data.description !== undefined ? (data.description || null) : existing.description,
        targetMuscleGroups: data.targetMuscleGroups !== undefined ? (data.targetMuscleGroups || null) : existing.targetMuscleGroups,
        estimatedTime: data.estimatedTime !== undefined ? data.estimatedTime : existing.estimatedTime,
      }).where(and(eq(workoutTemplates.templateId, id), eq(workoutTemplates.userId, userId))).run();

      if (data.exercises) {
        tx.delete(templateExercises).where(eq(templateExercises.templateId, id)).run();
        data.exercises.forEach((ex, i) => {
          tx.insert(templateExercises).values(templateExerciseValues(id, ex, i)).run();
        });
      }
    });

    return this.getTemplate(id, userId);
  }

  deleteTemplate(id: number, userId: number) {
    const existing = db.select().from(workoutTemplates).where(and(eq(workoutTemplates.templateId, id), eq(workoutTemplates.userId, userId))).get();
    if (!existing) return null;
    db.delete(workoutTemplates).where(and(eq(workoutTemplates.templateId, id), eq(workoutTemplates.userId, userId))).run();
    return { deleted: true };
  }

  cleanupEmptySessions(userId: number, minAgeSeconds: number = 12 * 3600) {
    const activeSessions = db.select({
      sessionId: workoutSessions.sessionId,
      startedAt: workoutSessions.startedAt,
    })
      .from(workoutSessions)
      .where(and(
        eq(workoutSessions.userId, userId),
        sql`completed_at IS NULL`
      ))
      .all();

    for (const s of activeSessions) {
      if (minAgeSeconds > 0) {
        const startedTime = parseDateString(s.startedAt).getTime();
        const ageSeconds = (Date.now() - startedTime) / 1000;
        if (ageSeconds < minAgeSeconds) {
          continue;
        }
      }

      const completedSetsCount = db.select({
        count: sql<number>`count(*)`
      })
        .from(sessionSets)
        .innerJoin(sessionExercises, eq(sessionSets.sessionExerciseId, sessionExercises.sessionExerciseId))
        .where(and(
          eq(sessionExercises.sessionId, s.sessionId),
          eq(sessionSets.completed, 1)
        ))
        .get();

      if (!completedSetsCount || completedSetsCount.count === 0) {
        db.delete(workoutSessions).where(eq(workoutSessions.sessionId, s.sessionId)).run();
      }
    }
  }
}
