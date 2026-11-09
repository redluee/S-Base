import { and, desc, eq, sql } from "drizzle-orm";
import db from "../../db/client";
import { sessionExercises, sessionSets, workoutSessions, workoutTemplates } from "../../db/schema";
import { ConflictError, orNotFound } from "../../utils/errors";
import { lastExerciseWeight } from "./workout-history";
import { activeSeconds, parseDateString } from "./workout-helpers";
import { WorkoutSessionReader } from "./workout-session-reader";
import type { SessionSetInput, SessionUpdateInput } from "./workout-schemas";
import type { WorkoutTemplates } from "./workout-templates";
import { requireDateTime, requireId, requireObject, validateSessionInput } from "./workout-validation";

export class WorkoutSessions {
  readonly reader = new WorkoutSessionReader();

  constructor(private readonly templates: WorkoutTemplates) {}

  list(userId: number, status?: string, q?: string) {
    return this.reader.list(userId, status, q);
  }

  get(id: number, userId: number) {
    return this.reader.get(id, userId);
  }

  create(userId: number, templateId?: number, force = false) {
    if (templateId !== undefined) requireId(templateId);
    this.cleanupEmpty(userId);
    if (!force) {
      const running = db
        .select({
          sessionId: workoutSessions.sessionId,
          templateId: workoutSessions.templateId,
          name: workoutSessions.name,
          startedAt: workoutSessions.startedAt,
          exerciseCount: sql<number>`(SELECT COUNT(*) FROM session_exercises WHERE session_exercises.session_id = workout_sessions.session_id)`,
          completedSetsCount: sql<number>`(SELECT COUNT(*) FROM session_sets INNER JOIN session_exercises ON session_sets.session_exercise_id = session_exercises.session_exercise_id WHERE session_exercises.session_id = workout_sessions.session_id AND session_sets.completed = 1)`,
        })
        .from(workoutSessions)
        .where(and(eq(workoutSessions.userId, userId), sql`completed_at IS NULL`))
        .orderBy(desc(workoutSessions.startedAt))
        .limit(1)
        .get();
      if (running) throw new ConflictError("workout.activeSessionExists", { activeSession: running });
    }
    let sessionName = "Vrije training";
    let validTemplateId = templateId;
    if (templateId) {
      const template = db
        .select()
        .from(workoutTemplates)
        .where(and(eq(workoutTemplates.templateId, templateId), eq(workoutTemplates.userId, userId)))
        .get();
      if (template) {
        sessionName = template.name;
      } else {
        validTemplateId = undefined;
      }
    }

    const session = db.transaction((tx) => {
      const session = tx
        .insert(workoutSessions)
        .values({
          userId,
          templateId: validTemplateId ?? null,
          name: sessionName,
          startedAt: new Date().toISOString(),
        })
        .returning()
        .get();

      if (validTemplateId) {
        const template = this.templates.get(validTemplateId, userId);
        for (const tex of template.exercises) {
          const se = tx
            .insert(sessionExercises)
            .values({
              sessionId: session.sessionId,
              exerciseName: tex.exerciseName,
              sortOrder: tex.sortOrder,
              category: tex.category ?? "Free Weights",
              equipment: tex.equipment,
              perSide: tex.perSide ?? 0,
              isAssisted: tex.isAssisted ?? 0,
              restTime: tex.defaultRestTime ?? null,
            })
            .returning()
            .get();

          const previousWeight = lastExerciseWeight(userId, tex.exerciseName, tex.defaultWeight);

          for (let s = 1; s <= tex.defaultSets; s++) {
            tx.insert(sessionSets)
              .values({
                sessionExerciseId: se.sessionExerciseId,
                setNumber: s,
                reps: tex.defaultReps ?? null,
                weight: tex.defaultWeight == null ? null : previousWeight,
                editedFields: "",
                distance: tex.defaultDistance ?? null,
                duration: tex.defaultDuration ?? null,
                rpe: tex.defaultRpe ?? null,
                heartRate: tex.defaultHeartRate ?? null,
              })
              .run();
          }
        }
      }
      return session;
    });

    return this.get(session.sessionId, userId);
  }

  update(id: number, userId: number, data: SessionUpdateInput) {
    this.requireOwned(id, userId);

    const input = requireObject(data);
    const ownedExerciseIds = new Set(
      db
        .select({ id: sessionExercises.sessionExerciseId })
        .from(sessionExercises)
        .where(eq(sessionExercises.sessionId, id))
        .all()
        .map((r) => r.id),
    );
    validateSessionInput(input, ownedExerciseIds);

    db.transaction((tx) => {
      const updateFields: Partial<typeof workoutSessions.$inferInsert> = {};
      if (data.name !== undefined && data.name !== null) updateFields.name = data.name;
      if (data.notes !== undefined) updateFields.notes = data.notes;
      if (data.completedAt !== undefined && data.completedAt !== null) updateFields.completedAt = data.completedAt;
      if (data.pausedAt !== undefined) updateFields.pausedAt = data.pausedAt;
      if (typeof data.pausedSeconds === "number") updateFields.pausedSeconds = data.pausedSeconds;

      if (Object.keys(updateFields).length > 0) {
        tx.update(workoutSessions)
          .set(updateFields)
          .where(and(eq(workoutSessions.sessionId, id), eq(workoutSessions.userId, userId)))
          .run();
      }

      if (!data.exercises) return;

      const insertSets = (sessionExerciseId: number, sets: SessionSetInput[]) => {
        for (const set of sets) {
          tx.insert(sessionSets)
            .values({
              sessionExerciseId,
              setNumber: set.setNumber,
              reps: set.reps,
              weight: set.weight,
              distance: set.distance,
              duration: set.duration,
              rpe: set.rpe,
              heartRate: set.heartRate,
              completed: set.completed ?? 0,
              editedFields: set.editedFields ?? null,
            })
            .run();
        }
      };

      const incomingIds = data.exercises.filter((e) => e.sessionExerciseId).map((e) => e.sessionExerciseId!);

      for (const removeId of ownedExerciseIds) {
        if (incomingIds.includes(removeId)) continue;
        tx.delete(sessionSets).where(eq(sessionSets.sessionExerciseId, removeId)).run();
        tx.delete(sessionExercises).where(eq(sessionExercises.sessionExerciseId, removeId)).run();
      }

      for (const ex of data.exercises) {
        if (ex.sessionExerciseId) {
          tx.update(sessionExercises)
            .set({
              exerciseName: ex.exerciseName,
              sortOrder: ex.sortOrder,
              category: ex.category ?? "Free Weights",
              equipment: ex.equipment,
              perSide: ex.perSide ?? 0,
              isAssisted: ex.isAssisted ?? 0,
              ...(ex.restTime !== undefined ? { restTime: ex.restTime } : {}),
            })
            .where(
              and(eq(sessionExercises.sessionExerciseId, ex.sessionExerciseId), eq(sessionExercises.sessionId, id)),
            )
            .run();

          if (ex.sets) {
            tx.delete(sessionSets).where(eq(sessionSets.sessionExerciseId, ex.sessionExerciseId)).run();
            insertSets(ex.sessionExerciseId, ex.sets);
          }
        } else {
          const se = tx
            .insert(sessionExercises)
            .values({
              sessionId: id,
              exerciseName: ex.exerciseName,
              sortOrder: ex.sortOrder,
              category: ex.category ?? "Free Weights",
              equipment: ex.equipment,
              perSide: ex.perSide ?? 0,
              isAssisted: ex.isAssisted ?? 0,
              restTime: ex.restTime ?? null,
            })
            .returning()
            .get();

          if (ex.sets) insertSets(se.sessionExerciseId, ex.sets);
        }
      }
    });

    return this.get(id, userId);
  }

  complete(id: number, userId: number, completedAt?: string | null) {
    const existing = this.requireOwned(id, userId);
    if (completedAt !== undefined && completedAt !== null) requireDateTime(completedAt);

    const nowMs = Date.now();
    const hadPause = Boolean(existing.pausedAt) || (existing.pausedSeconds ?? 0) > 0;
    const finalCompletedAt =
      completedAt ??
      (hadPause
        ? new Date(parseDateString(existing.startedAt).getTime() + activeSeconds(existing, nowMs) * 1000).toISOString()
        : new Date(nowMs).toISOString());

    db.update(workoutSessions)
      .set({
        completedAt: finalCompletedAt,
        pausedAt: null,
      })
      .where(and(eq(workoutSessions.sessionId, id), eq(workoutSessions.userId, userId)))
      .run();

    return this.get(id, userId);
  }

  remove(id: number, userId: number) {
    this.requireOwned(id, userId);
    db.delete(workoutSessions)
      .where(and(eq(workoutSessions.sessionId, id), eq(workoutSessions.userId, userId)))
      .run();
    return { deleted: true };
  }

  cleanupEmpty(userId: number, minAgeSeconds: number = 12 * 3600) {
    const activeSessions = db
      .select({
        sessionId: workoutSessions.sessionId,
        startedAt: workoutSessions.startedAt,
      })
      .from(workoutSessions)
      .where(and(eq(workoutSessions.userId, userId), sql`completed_at IS NULL`))
      .all();

    for (const s of activeSessions) {
      if (minAgeSeconds > 0) {
        const startedTime = parseDateString(s.startedAt).getTime();
        const ageSeconds = (Date.now() - startedTime) / 1000;
        if (ageSeconds < minAgeSeconds) {
          continue;
        }
      }

      const completedSetsCount = db
        .select({
          count: sql<number>`count(*)`,
        })
        .from(sessionSets)
        .innerJoin(sessionExercises, eq(sessionSets.sessionExerciseId, sessionExercises.sessionExerciseId))
        .where(and(eq(sessionExercises.sessionId, s.sessionId), eq(sessionSets.completed, 1)))
        .get();

      if (!completedSetsCount || completedSetsCount.count === 0) {
        db.delete(workoutSessions).where(eq(workoutSessions.sessionId, s.sessionId)).run();
      }
    }
  }

  private requireOwned(id: number, userId: number) {
    return orNotFound(
      db
        .select()
        .from(workoutSessions)
        .where(and(eq(workoutSessions.sessionId, id), eq(workoutSessions.userId, userId)))
        .get(),
      "workout.sessionNotFound",
    );
  }
}
