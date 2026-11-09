import { eq, and, desc, asc, sql } from "drizzle-orm";
import db from "../../db/client";
import { workoutTemplates, templateExercises } from "../../db/schema";
import { ValidationError, orNotFound } from "../../utils/errors";
import { templateExerciseValues } from "./workout-helpers";
import type { TemplateCreateInput, TemplateUpdateInput } from "./workout-schemas";
import { validateTemplateInput } from "./workout-validation";

export class WorkoutTemplates {
  list(userId: number) {
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

  reorder(userId: number, orderedIds: number[]) {
    const owned = db.select({ templateId: workoutTemplates.templateId })
      .from(workoutTemplates)
      .where(eq(workoutTemplates.userId, userId))
      .all();
    const ownedIds = new Set(owned.map((o) => o.templateId));

    if (!Array.isArray(orderedIds) || orderedIds.length !== ownedIds.size || new Set(orderedIds).size !== orderedIds.length || orderedIds.some((id) => !ownedIds.has(id))) {
      throw new ValidationError("workout.templateOrderInvalid");
    }

    db.transaction((tx) => {
      orderedIds.forEach((templateId, index) => {
        tx.update(workoutTemplates)
          .set({ sortOrder: index })
          .where(and(eq(workoutTemplates.templateId, templateId), eq(workoutTemplates.userId, userId)))
          .run();
      });
    });

    return this.list(userId);
  }

  get(id: number, userId: number) {
    const template = orNotFound(
      db.select().from(workoutTemplates)
        .where(and(eq(workoutTemplates.templateId, id), eq(workoutTemplates.userId, userId)))
        .get(),
      "workout.templateNotFound",
    );
    const exercises = db.select()
      .from(templateExercises)
      .where(eq(templateExercises.templateId, id))
      .orderBy(templateExercises.sortOrder)
      .all();

    return { ...template, exercises };
  }

  create(userId: number, data: TemplateCreateInput) {
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

    return this.get(templateId, userId);
  }

  update(id: number, userId: number, data: TemplateUpdateInput) {
    const existing = this.requireOwned(id, userId);
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

    return this.get(id, userId);
  }

  remove(id: number, userId: number) {
    this.requireOwned(id, userId);
    db.delete(workoutTemplates).where(and(eq(workoutTemplates.templateId, id), eq(workoutTemplates.userId, userId))).run();
    return { deleted: true };
  }

  private requireOwned(id: number, userId: number) {
    return orNotFound(
      db.select().from(workoutTemplates)
        .where(and(eq(workoutTemplates.templateId, id), eq(workoutTemplates.userId, userId)))
        .get(),
      "workout.templateNotFound",
    );
  }
}
