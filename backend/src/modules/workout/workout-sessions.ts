import { eq, and, desc, sql } from "drizzle-orm";
import db from "../../db/client";
import { workoutTemplates, templateExercises, workoutSessions, sessionExercises, sessionSets } from "../../db/schema";
import { normalizeSearchString } from "../../utils/search";
import { ConflictError, ValidationError, optionalInteger, optionalText, requireDateTime, requireObject, requireText } from "../../utils/validation";
import { MAX_SETS_PER_EXERCISE, MAX_EXERCISES, validateSetParams, parseDateString, exerciseKey, activeSeconds, formatDutchDate } from "./workout-helpers";
import { WorkoutTemplateService } from "./workout-templates";

export class WorkoutSessionService extends WorkoutTemplateService {
  listSessions(userId: number, status?: string, q?: string) {
    const conditions = [eq(workoutSessions.userId, userId)];

    if (status === "active") {
      conditions.push(sql`completed_at IS NULL`);
    } else if (status === "completed") {
      conditions.push(sql`completed_at IS NOT NULL`);
    }

    const sessions = db.select({
      sessionId: workoutSessions.sessionId,
      templateId: workoutSessions.templateId,
      userId: workoutSessions.userId,
      startedAt: workoutSessions.startedAt,
      completedAt: workoutSessions.completedAt,
      notes: workoutSessions.notes,
      name: workoutSessions.name,
      exerciseCount: sql<number>`(SELECT COUNT(*) FROM session_exercises WHERE session_exercises.session_id = workout_sessions.session_id)`,
      completedSetsCount: sql<number>`(SELECT COUNT(*) FROM session_sets INNER JOIN session_exercises ON session_sets.session_exercise_id = session_exercises.session_exercise_id WHERE session_exercises.session_id = workout_sessions.session_id AND session_sets.completed = 1)`,
      totalSetsCount: sql<number>`(SELECT COUNT(*) FROM session_sets INNER JOIN session_exercises ON session_sets.session_exercise_id = session_exercises.session_exercise_id WHERE session_exercises.session_id = workout_sessions.session_id)`
    })
    .from(workoutSessions)
    .where(and(...conditions))
    .orderBy(desc(workoutSessions.startedAt))
    .all();

    if (!q) return sessions;

    const normalizedQ = normalizeSearchString(q);
    return sessions.filter((session) => {
      const nameNorm = normalizeSearchString(session.name || "");
      const notesNorm = normalizeSearchString(session.notes || "");
      
      const dateObj = parseDateString(session.startedAt);
      const formattedDate = formatDutchDate(dateObj, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const dateNorm = normalizeSearchString(formattedDate);

      const dateLong = formatDutchDate(dateObj, {
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const dateLongNorm = normalizeSearchString(dateLong);

      const dayStr = String(dateObj.getDate()).padStart(2, "0");
      const monthStr = String(dateObj.getMonth() + 1).padStart(2, "0");
      const yearStr = String(dateObj.getFullYear());
      const dayRaw = String(dateObj.getDate());
      const monthRaw = String(dateObj.getMonth() + 1);

      const datePadded = `${dayStr}${monthStr}${yearStr}`;
      const datePaddedShort = `${dayStr}${monthStr}`;
      const dateUnpadded = `${dayRaw}${monthRaw}${yearStr}`;
      const dateUnpaddedShort = `${dayRaw}${monthRaw}`;

      return (
        nameNorm.includes(normalizedQ) ||
        notesNorm.includes(normalizedQ) ||
        dateNorm.includes(normalizedQ) ||
        dateLongNorm.includes(normalizedQ) ||
        datePadded.includes(normalizedQ) ||
        datePaddedShort.includes(normalizedQ) ||
        dateUnpadded.includes(normalizedQ) ||
        dateUnpaddedShort.includes(normalizedQ)
      );
    });
  }

  getSession(id: number, userId?: number) {
    const conditions = [eq(workoutSessions.sessionId, id)];
    if (userId !== undefined) {
      conditions.push(eq(workoutSessions.userId, userId));
    }
    const session = db.select().from(workoutSessions).where(and(...conditions)).get();
    if (!session) return null;

    const exercises = db.select()
      .from(sessionExercises)
      .where(eq(sessionExercises.sessionId, id))
      .orderBy(sessionExercises.sortOrder, sessionExercises.sessionExerciseId)
      .all();

    const templateByName = new Map<string, any[]>();
    if (session.templateId) {
      const templateExs = db.select()
        .from(templateExercises)
        .where(eq(templateExercises.templateId, session.templateId))
        .orderBy(templateExercises.sortOrder, templateExercises.templateExerciseId)
        .all();
      for (const te of templateExs) {
        const key = exerciseKey(te.exerciseName);
        if (!templateByName.has(key)) templateByName.set(key, []);
        templateByName.get(key)!.push(te);
      }
    }

    const occurrences = new Map<string, number>();
    const sessionWithSets = exercises.map((ex) => {
      const sets = db.select()
        .from(sessionSets)
        .where(eq(sessionSets.sessionExerciseId, ex.sessionExerciseId))
        .orderBy(sessionSets.setNumber)
        .all();

      const key = exerciseKey(ex.exerciseName);
      const occurrence = occurrences.get(key) ?? 0;
      occurrences.set(key, occurrence + 1);
      const candidates = templateByName.get(key);
      let templateEx: any = candidates ? (candidates[occurrence] ?? candidates[0]) : undefined;

      if (!templateEx) {
        const query = db.select({
          defaultReps: templateExercises.defaultReps,
          defaultWeight: templateExercises.defaultWeight,
          defaultDistance: templateExercises.defaultDistance,
          defaultDuration: templateExercises.defaultDuration,
          defaultRpe: templateExercises.defaultRpe,
          defaultHeartRate: templateExercises.defaultHeartRate,
          defaultRestTime: templateExercises.defaultRestTime,
          equipment: templateExercises.equipment,
          perSide: templateExercises.perSide,
          isAssisted: templateExercises.isAssisted,
        })
          .from(templateExercises);

        if (userId !== undefined) {
          templateEx = query
            .innerJoin(workoutTemplates, eq(templateExercises.templateId, workoutTemplates.templateId))
            .where(and(sql`LOWER(${templateExercises.exerciseName}) = LOWER(${ex.exerciseName})`, eq(workoutTemplates.userId, userId)))
            .limit(1)
            .get();
        } else {
          templateEx = db.select()
            .from(templateExercises)
            .where(sql`LOWER(${templateExercises.exerciseName}) = LOWER(${ex.exerciseName})`)
            .limit(1)
            .get();
        }
      }

      return {
        ...ex,
        sets,
        templateExercise: templateEx ? {
          defaultReps: templateEx.defaultReps,
          defaultWeight: templateEx.defaultWeight,
          defaultDistance: templateEx.defaultDistance,
          defaultDuration: templateEx.defaultDuration,
          defaultRpe: templateEx.defaultRpe,
          defaultHeartRate: templateEx.defaultHeartRate,
          defaultRestTime: templateEx.defaultRestTime,
          equipment: templateEx.equipment,
          perSide: templateEx.perSide,
          isAssisted: templateEx.isAssisted,
        } : null
      };
    });

    return { ...session, exercises: sessionWithSets };
  }

  createSession(userId: number, templateId?: number, force = false) {
    if (templateId !== undefined && (!Number.isInteger(templateId) || templateId < 1)) {
      throw new ValidationError("Template id must be a valid id");
    }
    this.cleanupEmptySessions(userId);
    if (!force) {
      const running = db.select({
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
      if (running) {
        throw new ConflictError("A workout session is already running", { activeSession: running });
      }
    }
    let sessionName = "Vrije training";
    let validTemplateId = templateId;
    if (templateId) {
      const template = db.select().from(workoutTemplates).where(and(eq(workoutTemplates.templateId, templateId), eq(workoutTemplates.userId, userId))).get();
      if (template) {
        sessionName = template.name;
      } else {
        validTemplateId = undefined;
      }
    }

    const session = db.transaction((tx) => {
      const session = tx.insert(workoutSessions).values({
        userId,
        templateId: validTemplateId ?? null,
        name: sessionName,
        startedAt: new Date().toISOString(),
      }).returning().get();

      if (validTemplateId) {
        const template = this.getTemplate(validTemplateId, userId);
        if (template?.exercises) {
          for (const tex of template.exercises) {
            const se = tx.insert(sessionExercises).values({
              sessionId: session.sessionId,
              exerciseName: tex.exerciseName,
              sortOrder: tex.sortOrder,
              category: tex.category ?? "Free Weights",
              equipment: tex.equipment,
              perSide: tex.perSide ?? 0,
              isAssisted: tex.isAssisted ?? 0,
              restTime: tex.defaultRestTime ?? null,
            }).returning().get();

            for (let s = 1; s <= tex.defaultSets; s++) {
              tx.insert(sessionSets).values({
                sessionExerciseId: se.sessionExerciseId,
                setNumber: s,
                reps: tex.defaultReps ?? null,
                weight: tex.defaultWeight ?? null,
                distance: tex.defaultDistance ?? null,
                duration: tex.defaultDuration ?? null,
                rpe: tex.defaultRpe ?? null,
                heartRate: tex.defaultHeartRate ?? null,
              }).run();
            }
          }
        }
      }
      return session;
    });

    return this.getSession(session.sessionId, userId);
  }

  updateSession(id: number, userId: number, data: {
    name?: string;
    notes?: string;
    completedAt?: string;
    pausedAt?: string | null;
    pausedSeconds?: number;
    exercises?: {
      sessionExerciseId?: number;
      exerciseName: string;
      sortOrder: number;
      category?: string;
      equipment?: string;
      perSide?: number;
      isAssisted?: number;
      restTime?: number | null;
      sets?: {
        setId?: number;
        setNumber: number;
        reps?: number;
        weight?: number;
        distance?: number;
        duration?: number;
        rpe?: number;
        heartRate?: number;
        completed?: number;
      }[];
    }[];
  }) {
    const existing = db.select().from(workoutSessions).where(and(eq(workoutSessions.sessionId, id), eq(workoutSessions.userId, userId))).get();
    if (!existing) return null;

    const input = requireObject(data);
    if (input.name !== undefined && input.name !== null) requireText(input.name, "Name");
    optionalText(input.notes, "Notes", 20000);
    if (input.completedAt !== undefined && input.completedAt !== null) requireDateTime(input.completedAt, "Completed at");
    if (input.pausedAt !== undefined && input.pausedAt !== null) requireDateTime(input.pausedAt, "Paused at");
    optionalInteger(input.pausedSeconds, "Paused seconds");
    if (typeof input.pausedSeconds === "number" && input.pausedSeconds < 0) {
      throw new ValidationError("Paused seconds cannot be negative");
    }
    if (input.exercises !== undefined && !Array.isArray(input.exercises)) {
      throw new ValidationError("Exercises must be a list");
    }
    if (Array.isArray(input.exercises) && input.exercises.length > MAX_EXERCISES) {
      throw new ValidationError(`A session can have at most ${MAX_EXERCISES} exercises`);
    }

    const ownedExerciseIds = new Set(
      db.select({ id: sessionExercises.sessionExerciseId })
        .from(sessionExercises)
        .where(eq(sessionExercises.sessionId, id))
        .all()
        .map((r) => r.id)
    );

    for (const raw of data.exercises ?? []) {
      const ex = requireObject(raw, "Exercise");
      requireText(ex.exerciseName, "Exercise name");
      optionalText(ex.category, "Category", 100);
      optionalText(ex.equipment, "Equipment", 100);
      optionalInteger(ex.sortOrder, "Sort order");
      optionalInteger(ex.perSide, "Per side");
      optionalInteger(ex.isAssisted, "Assisted");
      optionalInteger(ex.restTime, "Rest time");
      if (typeof ex.restTime === "number" && ex.restTime < 0) throw new ValidationError("Rest time cannot be negative");
      if (ex.sessionExerciseId !== undefined && ex.sessionExerciseId !== null) {
        if (!Number.isInteger(ex.sessionExerciseId) || !ownedExerciseIds.has(ex.sessionExerciseId)) {
          throw new ValidationError("Exercise does not belong to this session", {
            code: "unknown_session_exercise",
            sessionExerciseId: ex.sessionExerciseId,
          });
        }
      }
      if (ex.sets !== undefined && ex.sets !== null && !Array.isArray(ex.sets)) {
        throw new ValidationError("Sets must be a list");
      }
      if (Array.isArray(ex.sets) && ex.sets.length > MAX_SETS_PER_EXERCISE) {
        throw new ValidationError(`Exercise "${ex.exerciseName}" can have at most ${MAX_SETS_PER_EXERCISE} sets`);
      }
      for (const rawSet of ex.sets ?? []) {
        const set = requireObject(rawSet, "Set");
        if (typeof set.setNumber !== "number" || !Number.isInteger(set.setNumber) || set.setNumber < 1) {
          throw new ValidationError("Set number must be a positive whole number");
        }
        optionalInteger(set.completed, "Completed");
        validateSetParams(set, undefined, Boolean(ex.isAssisted));
      }
    }

    db.transaction((tx) => {
      const updateFields: any = {};
      if (data.name !== undefined && data.name !== null) updateFields.name = data.name;
      if (data.notes !== undefined) updateFields.notes = data.notes;
      if (data.completedAt !== undefined && data.completedAt !== null) updateFields.completedAt = data.completedAt;
      if (data.pausedAt !== undefined) updateFields.pausedAt = data.pausedAt;
      if (typeof data.pausedSeconds === "number") updateFields.pausedSeconds = data.pausedSeconds;

      if (Object.keys(updateFields).length > 0) {
        tx.update(workoutSessions).set(updateFields).where(and(eq(workoutSessions.sessionId, id), eq(workoutSessions.userId, userId))).run();
      }

      if (data.exercises) {
        const currentExerciseIds = tx.select({ id: sessionExercises.sessionExerciseId })
          .from(sessionExercises)
          .where(eq(sessionExercises.sessionId, id))
          .all()
          .map((r) => r.id);

        const incomingIds = data.exercises
          .filter((e) => e.sessionExerciseId)
          .map((e) => e.sessionExerciseId!);

        const toRemove = currentExerciseIds.filter((ci) => !incomingIds.includes(ci));
        for (const removeId of toRemove) {
          tx.delete(sessionSets).where(eq(sessionSets.sessionExerciseId, removeId)).run();
          tx.delete(sessionExercises).where(eq(sessionExercises.sessionExerciseId, removeId)).run();
        }

        for (const ex of data.exercises) {
          if (ex.sessionExerciseId) {
            tx.update(sessionExercises).set({
              exerciseName: ex.exerciseName,
              sortOrder: ex.sortOrder,
              category: ex.category ?? "Free Weights",
              equipment: ex.equipment,
              perSide: ex.perSide ?? 0,
              isAssisted: ex.isAssisted ?? 0,
              ...(ex.restTime !== undefined ? { restTime: ex.restTime } : {}),
            }).where(and(eq(sessionExercises.sessionExerciseId, ex.sessionExerciseId), eq(sessionExercises.sessionId, id))).run();

            if (ex.sets) {
              tx.delete(sessionSets).where(eq(sessionSets.sessionExerciseId, ex.sessionExerciseId)).run();

              for (const set of ex.sets) {
                tx.insert(sessionSets).values({
                  sessionExerciseId: ex.sessionExerciseId,
                  setNumber: set.setNumber,
                  reps: set.reps,
                  weight: set.weight,
                  distance: set.distance,
                  duration: set.duration,
                  rpe: set.rpe,
                  heartRate: set.heartRate,
                  completed: set.completed ?? 0,
                }).run();
              }
            }
          } else {
            const se = tx.insert(sessionExercises).values({
              sessionId: id,
              exerciseName: ex.exerciseName,
              sortOrder: ex.sortOrder,
              category: ex.category ?? "Free Weights",
              equipment: ex.equipment,
              perSide: ex.perSide ?? 0,
              isAssisted: ex.isAssisted ?? 0,
              restTime: ex.restTime ?? null,
            }).returning().get();

            if (ex.sets) {
              for (const set of ex.sets) {
                tx.insert(sessionSets).values({
                  sessionExerciseId: se.sessionExerciseId,
                  setNumber: set.setNumber,
                  reps: set.reps,
                  weight: set.weight,
                  distance: set.distance,
                  duration: set.duration,
                  rpe: set.rpe,
                  heartRate: set.heartRate,
                  completed: set.completed ?? 0,
                }).run();
              }
            }
          }
        }
      }
    });

    return this.getSession(id, userId);
  }

  completeSession(id: number, userId: number, completedAt?: string) {
    const existing = db.select().from(workoutSessions).where(and(eq(workoutSessions.sessionId, id), eq(workoutSessions.userId, userId))).get();
    if (!existing) return null;
    if (completedAt !== undefined && completedAt !== null) requireDateTime(completedAt, "Completed at");

    const nowMs = Date.now();
    const hadPause = Boolean(existing.pausedAt) || (existing.pausedSeconds ?? 0) > 0;
    const finalCompletedAt = completedAt
      ?? (hadPause
        ? new Date(parseDateString(existing.startedAt).getTime() + activeSeconds(existing, nowMs) * 1000).toISOString()
        : new Date(nowMs).toISOString());

    db.update(workoutSessions).set({
      completedAt: finalCompletedAt,
      pausedAt: null,
    }).where(and(eq(workoutSessions.sessionId, id), eq(workoutSessions.userId, userId))).run();

    return this.getSession(id, userId);
  }

  deleteSession(id: number, userId: number) {
    const existing = db.select().from(workoutSessions).where(and(eq(workoutSessions.sessionId, id), eq(workoutSessions.userId, userId))).get();
    if (!existing) return null;
    db.delete(workoutSessions).where(and(eq(workoutSessions.sessionId, id), eq(workoutSessions.userId, userId))).run();
    return { deleted: true };
  }
}
