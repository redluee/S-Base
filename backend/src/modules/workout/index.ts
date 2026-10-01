import { eq, and, or, like, desc, asc, sql, ne } from "drizzle-orm";
import db from "../../db/client";
import {
  workoutTemplates,
  templateExercises,
  workoutSessions,
  sessionExercises,
  sessionSets,
} from "../../db/schema";
import { normalizeSearchString, sqlNormalize } from "../../utils/search";
import {
  ConflictError,
  ValidationError,
  optionalInteger,
  optionalNumber,
  optionalText,
  requireDateTime,
  requireObject,
  requireText,
} from "../../utils/validation";
import type { PersonalRecord } from "../../types/shared";

const MAX_SETS_PER_EXERCISE = 50;
const MAX_EXERCISES = 100;

function validateSetParams(params: {
  reps?: number;
  weight?: number;
  distance?: number;
  duration?: number;
  rpe?: number;
  heartRate?: number;
  defaultRestTime?: number;
}, prefix: string = "", allowNegativeWeight: boolean = false) {
  const fields: [string, unknown][] = [
    ["reps", params.reps], ["weight", params.weight], ["distance", params.distance], ["duration", params.duration],
    ["rpe", params.rpe], ["heart rate", params.heartRate], ["rest time", params.defaultRestTime],
  ];
  for (const [field, value] of fields) {
    if (value !== undefined && value !== null && (typeof value !== "number" || !Number.isFinite(value))) {
      throw new ValidationError(`${prefix ? prefix + " " : ""}${field} must be a number`);
    }
  }
  const getMsg = (field: string, suffix: string) => {
    if (prefix) {
      return `${prefix} ${field} ${suffix}`;
    }
    return `${field.charAt(0).toUpperCase() + field.slice(1)} ${suffix}`;
  };

  if (params.reps !== undefined && params.reps < 0) throw new ValidationError(getMsg("reps", "cannot be negative"));
  if (params.weight !== undefined && params.weight < 0 && !allowNegativeWeight) throw new ValidationError(getMsg("weight", "cannot be negative"));
  if (params.distance !== undefined && params.distance < 0) throw new ValidationError(getMsg("distance", "cannot be negative"));
  if (params.duration !== undefined && params.duration < 0) throw new ValidationError(getMsg("duration", "cannot be negative"));
  if (params.rpe !== undefined && (params.rpe < 0 || params.rpe > 10)) throw new ValidationError(getMsg("RPE", "must be 0-10"));
  if (params.heartRate !== undefined && params.heartRate < 0) throw new ValidationError(getMsg("heart rate", "cannot be negative"));
  if (params.defaultRestTime !== undefined && params.defaultRestTime < 0) throw new ValidationError(getMsg("rest time", "cannot be negative"));
}

type TemplateExerciseInput = {
  exerciseName: string;
  category?: string;
  sets?: number;
  reps?: number;
  weight?: number;
  distance?: number;
  duration?: number;
  rpe?: number;
  heartRate?: number;
  defaultRestTime?: number;
  equipment?: string;
  perSide?: number;
  isAssisted?: number;
};

function validateTemplateInput(data: any, requireName: boolean) {
  const input = requireObject(data);
  if (requireName || input.name !== undefined) requireText(input.name, "Name");
  optionalText(input.description, "Description");
  optionalText(input.targetMuscleGroups, "Target muscle groups");
  optionalInteger(input.estimatedTime, "Estimated time");
  if (input.estimatedTime !== undefined && input.estimatedTime !== null && input.estimatedTime < 0) {
    throw new ValidationError("Estimated time cannot be negative");
  }
  if (input.exercises !== undefined && input.exercises !== null && !Array.isArray(input.exercises)) {
    throw new ValidationError("Exercises must be a list");
  }
  if (Array.isArray(input.exercises) && input.exercises.length > MAX_EXERCISES) {
    throw new ValidationError(`A template can have at most ${MAX_EXERCISES} exercises`);
  }
  for (const raw of input.exercises ?? []) {
    const ex = requireObject(raw, "Exercise");
    requireText(ex.exerciseName, "Exercise name");
    optionalText(ex.category, "Category", 100);
    optionalText(ex.equipment, "Equipment", 100);
    if (ex.sets !== undefined && (typeof ex.sets !== "number" || !Number.isInteger(ex.sets) || ex.sets < 1)) {
      throw new ValidationError(`Exercise "${ex.exerciseName}" must have at least 1 set`);
    }
    if (ex.sets !== undefined && ex.sets > MAX_SETS_PER_EXERCISE) {
      throw new ValidationError(`Exercise "${ex.exerciseName}" can have at most ${MAX_SETS_PER_EXERCISE} sets`);
    }
    if (ex.reps !== undefined && ex.reps !== null && (typeof ex.reps !== "number" || !Number.isFinite(ex.reps))) {
      throw new ValidationError(`Exercise "${ex.exerciseName}" reps must be a number`);
    }
    optionalInteger(ex.perSide, "Per side");
    optionalInteger(ex.isAssisted, "Assisted");
    validateSetParams(ex, `Exercise "${ex.exerciseName}"`, Boolean(ex.isAssisted));
  }
}

function templateExerciseValues(templateId: number, ex: TemplateExerciseInput, index: number) {
  return {
    templateId,
    exerciseName: ex.exerciseName,
    sortOrder: index,
    category: ex.category ?? "Free Weights",
    defaultSets: ex.sets,
    defaultReps: ex.reps ?? undefined,
    defaultWeight: ex.weight,
    defaultDistance: ex.distance,
    defaultDuration: ex.duration,
    defaultRpe: ex.rpe,
    defaultHeartRate: ex.heartRate,
    defaultRestTime: ex.defaultRestTime,
    equipment: ex.equipment,
    perSide: ex.perSide ?? 0,
    isAssisted: ex.isAssisted ?? 0,
  };
}

function parseDateString(dateStr: string): Date {
  return new Date(dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T") + "Z");
}

function exerciseKey(name: string): string {
  return name.trim().toLowerCase();
}

function signedWeight(weight: number | null | undefined, assisted: number | null | undefined): number | null {
  if (weight == null) return null;
  return assisted ? -Math.abs(weight) : weight;
}

function effectiveVolume(weight: number | null | undefined, reps: number | null | undefined): number {
  return Math.max(0, weight ?? 0) * (reps ?? 0);
}

function activeSeconds(session: { startedAt: string; completedAt: string | null; pausedAt: string | null; pausedSeconds: number }, nowMs: number): number {
  const startMs = parseDateString(session.startedAt).getTime();
  if (session.completedAt) {
    return Math.max(0, (parseDateString(session.completedAt).getTime() - startMs) / 1000);
  }
  let paused = session.pausedSeconds ?? 0;
  if (session.pausedAt) {
    paused += Math.max(0, (nowMs - parseDateString(session.pausedAt).getTime()) / 1000);
  }
  return Math.max(0, (nowMs - startMs) / 1000 - paused);
}

function formatDutchDate(date: Date, options: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString("nl-NL", options);
}


export class WorkoutService {
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

  suggestExercises(userId: number, q: string) {
    const normalizedQ = normalizeSearchString(q);
    if (!normalizedQ) return [];

    const fromSessions = db.select({
      sessionExerciseId: sessionExercises.sessionExerciseId,
      name: sessionExercises.exerciseName,
      category: sessionExercises.category,
      equipment: sessionExercises.equipment,
      perSide: sessionExercises.perSide,
      isAssisted: sessionExercises.isAssisted,
      completedAt: workoutSessions.completedAt,
      startedAt: workoutSessions.startedAt,
      sessionId: workoutSessions.sessionId,
    })
      .from(sessionExercises)
      .innerJoin(workoutSessions, eq(sessionExercises.sessionId, workoutSessions.sessionId))
      .where(and(
        like(sqlNormalize(sessionExercises.exerciseName), `%${normalizedQ}%`),
        eq(workoutSessions.userId, userId),
        sql`${workoutSessions.completedAt} IS NOT NULL`
      ))
      .orderBy(sql`${workoutSessions.completedAt} DESC`, sql`${workoutSessions.startedAt} DESC`, sql`${workoutSessions.sessionId} DESC`)
      .all();

    const fromTemplates = db.select({
      name: templateExercises.exerciseName,
      category: templateExercises.category,
      defaultSets: templateExercises.defaultSets,
      defaultReps: templateExercises.defaultReps,
      defaultWeight: templateExercises.defaultWeight,
      defaultDistance: templateExercises.defaultDistance,
      defaultDuration: templateExercises.defaultDuration,
      defaultRestTime: templateExercises.defaultRestTime,
      equipment: templateExercises.equipment,
      perSide: templateExercises.perSide,
      isAssisted: templateExercises.isAssisted,
    })
      .from(templateExercises)
      .innerJoin(workoutTemplates, eq(templateExercises.templateId, workoutTemplates.templateId))
      .where(and(
        like(sqlNormalize(templateExercises.exerciseName), `%${normalizedQ}%`),
        eq(workoutTemplates.userId, userId)
      ))
      .all();

    const uniqueExercisesMap = new Map<
      string,
      {
        name: string;
        category: string;
        equipment: string | null;
        perSide: number;
        isAssisted: number;
        defaultSets: number;
        defaultReps: number | null;
        defaultWeight: number | null;
        defaultDistance: number | null;
        defaultDuration: number | null;
        defaultRestTime: number | null;
        lastSets: Array<{
          setNumber: number;
          reps: number | null;
          weight: number | null;
          distance: number | null;
          duration: number | null;
          rpe: number | null;
          heartRate: number | null;
        }>;
      }
    >();

    for (const r of fromSessions) {
      const key = r.name.trim().toLowerCase();
      if (!uniqueExercisesMap.has(key)) {
        const sets = db.select({
          setNumber: sessionSets.setNumber,
          reps: sessionSets.reps,
          weight: sessionSets.weight,
          distance: sessionSets.distance,
          duration: sessionSets.duration,
          rpe: sessionSets.rpe,
          heartRate: sessionSets.heartRate,
        })
          .from(sessionSets)
          .where(eq(sessionSets.sessionExerciseId, r.sessionExerciseId))
          .orderBy(sessionSets.setNumber)
          .all();

        const lastSetWithValues = sets.slice().reverse().find(s => s.reps != null || s.weight != null || s.distance != null || s.duration != null) ?? sets[sets.length - 1];
        const eqNorm = r.equipment && r.equipment !== "none" ? r.equipment : null;

        uniqueExercisesMap.set(key, {
          name: r.name,
          category: r.category ?? "Free Weights",
          equipment: eqNorm,
          perSide: r.perSide ?? 0,
          isAssisted: r.isAssisted ?? 0,
          defaultSets: sets.length > 0 ? sets.length : 3,
          defaultReps: lastSetWithValues?.reps ?? (sets[0]?.reps ?? 10),
          defaultWeight: lastSetWithValues?.weight ?? (sets[0]?.weight ?? null),
          defaultDistance: lastSetWithValues?.distance ?? (sets[0]?.distance ?? null),
          defaultDuration: lastSetWithValues?.duration ?? (sets[0]?.duration ?? null),
          defaultRestTime: null,
          lastSets: sets.map((s, idx) => ({
            setNumber: s.setNumber || idx + 1,
            reps: s.reps ?? null,
            weight: s.weight ?? null,
            distance: s.distance ?? null,
            duration: s.duration ?? null,
            rpe: s.rpe ?? null,
            heartRate: s.heartRate ?? null,
          })),
        });
      }
    }

    for (const r of fromTemplates) {
      const key = r.name.trim().toLowerCase();
      const eqNorm = r.equipment && r.equipment !== "none" ? r.equipment : null;

      if (uniqueExercisesMap.has(key)) {
        const existing = uniqueExercisesMap.get(key)!;
        if (existing.defaultRestTime == null && r.defaultRestTime != null) {
          existing.defaultRestTime = r.defaultRestTime;
        }
        if (!existing.isAssisted && r.isAssisted) {
          existing.isAssisted = r.isAssisted;
        }
      } else {
        const numSets = r.defaultSets || 3;
        const numReps = r.defaultReps ?? 10;
        const templateSets = [];
        for (let i = 1; i <= numSets; i++) {
          templateSets.push({
            setNumber: i,
            reps: numReps,
            weight: r.defaultWeight ?? null,
            distance: r.defaultDistance ?? null,
            duration: r.defaultDuration ?? null,
            rpe: null,
            heartRate: null,
          });
        }

        uniqueExercisesMap.set(key, {
          name: r.name,
          category: r.category ?? "Free Weights",
          equipment: eqNorm,
          perSide: r.perSide ?? 0,
          isAssisted: r.isAssisted ?? 0,
          defaultSets: numSets,
          defaultReps: numReps,
          defaultWeight: r.defaultWeight ?? null,
          defaultDistance: r.defaultDistance ?? null,
          defaultDuration: r.defaultDuration ?? null,
          defaultRestTime: r.defaultRestTime ?? null,
          lastSets: templateSets,
        });
      }
    }

    return Array.from(uniqueExercisesMap.values()).slice(0, 10).map((data) => ({
      type: "exercise" as const,
      value: data.name,
      category: data.category,
      defaultSets: data.defaultSets,
      defaultReps: data.defaultReps,
      defaultWeight: data.defaultWeight,
      defaultDistance: data.defaultDistance,
      defaultDuration: data.defaultDuration,
      defaultRestTime: data.defaultRestTime,
      equipment: data.equipment,
      perSide: data.perSide,
      isAssisted: data.isAssisted,
      lastSets: data.lastSets,
    }));
  }

  suggestWorkoutSearch(userId: number, q: string) {
    const normalizedQ = normalizeSearchString(q);

    const exercises = this.suggestExercises(userId, q).slice(0, 5);

    const templates = db.select({
      templateId: workoutTemplates.templateId,
      name: workoutTemplates.name,
      description: workoutTemplates.description,
      targetMuscleGroups: workoutTemplates.targetMuscleGroups
    })
      .from(workoutTemplates)
      .where(and(
        eq(workoutTemplates.userId, userId),
        or(
          like(sqlNormalize(workoutTemplates.name), `%${normalizedQ}%`),
          like(sqlNormalize(workoutTemplates.description), `%${normalizedQ}%`),
          like(sqlNormalize(workoutTemplates.targetMuscleGroups), `%${normalizedQ}%`)
        )
      ))
      .limit(5)
      .all();

    const templateSuggestions = templates.map(t => ({
      type: "template" as const,
      value: t.name,
      id: t.templateId
    }));

    const sessions = db.select({
      sessionId: workoutSessions.sessionId,
      name: workoutSessions.name,
      notes: workoutSessions.notes,
      startedAt: workoutSessions.startedAt
    })
      .from(workoutSessions)
      .where(and(
        eq(workoutSessions.userId, userId),
        sql`completed_at IS NOT NULL`
      ))
      .orderBy(desc(workoutSessions.startedAt))
      .all();

    const historySuggestions = sessions
      .map(session => {
        const dateObj = parseDateString(session.startedAt);
        const formattedDate = formatDutchDate(dateObj, {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        
        const nameNorm = normalizeSearchString(session.name || "");
        const notesNorm = normalizeSearchString(session.notes || "");
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

        const isMatch =
          nameNorm.includes(normalizedQ) ||
          notesNorm.includes(normalizedQ) ||
          dateNorm.includes(normalizedQ) ||
          dateLongNorm.includes(normalizedQ) ||
          datePadded.includes(normalizedQ) ||
          datePaddedShort.includes(normalizedQ) ||
          dateUnpadded.includes(normalizedQ) ||
          dateUnpaddedShort.includes(normalizedQ);

        return {
          isMatch,
          type: "history" as const,
          value: `${session.name || "Training"} - ${formattedDate}`,
          id: session.sessionId
        };
      })
      .filter(s => s.isMatch)
      .slice(0, 5)
      .map(({ type, value, id }) => ({ type, value, id }));

    return [
      ...exercises,
      ...templateSuggestions,
      ...historySuggestions
    ];
  }

  exerciseProgress(userId: number, name: string, equipment?: string) {
    const trimmedName = name.trim();
    const availableEqRows = db.select({ equipment: sessionExercises.equipment })
      .from(sessionExercises)
      .innerJoin(workoutSessions, eq(sessionExercises.sessionId, workoutSessions.sessionId))
      .where(and(
        sql`LOWER(${sessionExercises.exerciseName}) = LOWER(${trimmedName})`,
        eq(workoutSessions.userId, userId),
        sql`${workoutSessions.completedAt} IS NOT NULL`
      ))
      .all();

    const availableEquipmentsSet = new Set<string>();
    for (const row of availableEqRows) {
      if (row.equipment && row.equipment !== "none" && row.equipment !== "null" && row.equipment !== "undefined") {
        availableEquipmentsSet.add(row.equipment);
      }
    }
    const availableEquipments = Array.from(availableEquipmentsSet).sort();

    const conditions = [
      sql`LOWER(${sessionExercises.exerciseName}) = LOWER(${trimmedName})`,
      sql`${workoutSessions.completedAt} IS NOT NULL`,
      eq(workoutSessions.userId, userId),
    ];
    if (equipment && equipment !== "all" && equipment !== "null" && equipment !== "undefined") {
      if (equipment === "none") {
        conditions.push(sql`(${sessionExercises.equipment} IS NULL OR ${sessionExercises.equipment} = '' OR ${sessionExercises.equipment} = 'none')`);
      } else {
        conditions.push(eq(sessionExercises.equipment, equipment));
      }
    }

    const rows = db.select({
      sessionId: workoutSessions.sessionId,
      startedAt: workoutSessions.startedAt,
      exerciseName: sessionExercises.exerciseName,
      category: sessionExercises.category,
      equipment: sessionExercises.equipment,
      setNumber: sessionSets.setNumber,
      reps: sessionSets.reps,
      weight: sessionSets.weight,
      distance: sessionSets.distance,
      duration: sessionSets.duration,
      rpe: sessionSets.rpe,
      heartRate: sessionSets.heartRate,
      completed: sessionSets.completed,
    })
      .from(sessionSets)
      .innerJoin(sessionExercises, eq(sessionSets.sessionExerciseId, sessionExercises.sessionExerciseId))
      .innerJoin(workoutSessions, eq(sessionExercises.sessionId, workoutSessions.sessionId))
      .where(and(...conditions))
      .orderBy(sql`${workoutSessions.startedAt} ASC`, sql`${workoutSessions.sessionId} ASC`, sessionExercises.sortOrder, sessionSets.setNumber)
      .all();

    const sessionsMap = new Map<number, { sessionId: number; startedAt: string; equipment: string | null; sets: typeof rows }>();
    for (const row of rows) {
      if (!sessionsMap.has(row.sessionId)) {
        sessionsMap.set(row.sessionId, { sessionId: row.sessionId, startedAt: row.startedAt, equipment: row.equipment ?? null, sets: [] });
      }
      sessionsMap.get(row.sessionId)!.sets.push(row);
    }

    return {
      exerciseName: rows[0]?.exerciseName ?? trimmedName,
      category: rows[0]?.category ?? "Free Weights",
      equipment: equipment && equipment !== "all" ? equipment : null,
      availableEquipments,
      sessions: Array.from(sessionsMap.values()),
    };
  }

  mergeExercises(userId: number, sourceName: string, targetName: string) {
    const sName = typeof sourceName === "string" ? sourceName.trim() : "";
    const tName = typeof targetName === "string" ? targetName.trim() : "";

    if (!sName || !tName) {
      throw new ValidationError("Source and target exercise names are required");
    }
    if (sName === tName) {
      throw new ValidationError("Source and target exercise names must be different");
    }

    const sameExercise = exerciseKey(sName) === exerciseKey(tName);

    db.transaction((tx) => {
      const userTemplateIds = tx.select({ templateId: workoutTemplates.templateId })
        .from(workoutTemplates)
        .where(eq(workoutTemplates.userId, userId))
        .all()
        .map((t) => t.templateId);

      for (const tid of userTemplateIds) {
        const rows = tx.select().from(templateExercises).where(eq(templateExercises.templateId, tid)).all();
        const sources = rows.filter((r) => exerciseKey(r.exerciseName) === exerciseKey(sName));
        const targets = rows.filter((r) => exerciseKey(r.exerciseName) === exerciseKey(tName));
        for (const row of sources) {
          tx.update(templateExercises).set({ exerciseName: tName }).where(eq(templateExercises.templateExerciseId, row.templateExerciseId)).run();
        }
        if (!sameExercise && sources.length === 1 && targets.length === 1) {
          tx.delete(templateExercises).where(eq(templateExercises.templateExerciseId, sources[0].templateExerciseId)).run();
        }
      }

      const userSessionIds = tx.select({ sessionId: workoutSessions.sessionId })
        .from(workoutSessions)
        .where(eq(workoutSessions.userId, userId))
        .all()
        .map((r) => r.sessionId);

      for (const sid of userSessionIds) {
        const rows = tx.select().from(sessionExercises).where(eq(sessionExercises.sessionId, sid)).orderBy(sessionExercises.sessionExerciseId).all();
        const sources = rows.filter((r) => exerciseKey(r.exerciseName) === exerciseKey(sName));
        const targets = rows.filter((r) => exerciseKey(r.exerciseName) === exerciseKey(tName));
        for (const row of sources) {
          tx.update(sessionExercises).set({ exerciseName: tName }).where(eq(sessionExercises.sessionExerciseId, row.sessionExerciseId)).run();
        }
        if (sameExercise || sources.length !== 1 || targets.length !== 1) continue;

        const source = sources[0];
        const target = targets[0];
        const targetSets = tx.select().from(sessionSets).where(eq(sessionSets.sessionExerciseId, target.sessionExerciseId)).all();
        const offset = targetSets.length > 0 ? Math.max(...targetSets.map((x) => x.setNumber)) : 0;
        const sourceSets = tx.select().from(sessionSets).where(eq(sessionSets.sessionExerciseId, source.sessionExerciseId)).orderBy(sessionSets.setNumber).all();
        sourceSets.forEach((setItem, j) => {
          tx.update(sessionSets)
            .set({ sessionExerciseId: target.sessionExerciseId, setNumber: offset + j + 1 })
            .where(eq(sessionSets.setId, setItem.setId))
            .run();
        });
        tx.delete(sessionExercises).where(eq(sessionExercises.sessionExerciseId, source.sessionExerciseId)).run();
      }
    });

    return {
      success: true,
      sourceName: sName,
      targetName: tName,
    };
  }

  listUniqueExercises(userId: number) {
    const fromTemplates = db.select({
      name: templateExercises.exerciseName,
      equipment: templateExercises.equipment,
      category: templateExercises.category,
    })
      .from(templateExercises)
      .innerJoin(workoutTemplates, eq(templateExercises.templateId, workoutTemplates.templateId))
      .where(eq(workoutTemplates.userId, userId))
      .all();
    const fromSessions = db.select({
      name: sessionExercises.exerciseName,
      equipment: sessionExercises.equipment,
      category: sessionExercises.category,
    })
      .from(sessionExercises)
      .innerJoin(workoutSessions, eq(sessionExercises.sessionId, workoutSessions.sessionId))
      .where(and(
        eq(workoutSessions.userId, userId),
        sql`${workoutSessions.completedAt} IS NOT NULL`
      ))
      .all();

    const map = new Map<string, { eqSet: Set<string>; catSet: Set<string> }>();

    for (const r of [...fromTemplates, ...fromSessions]) {
      if (r.name) {
        if (!map.has(r.name)) {
          map.set(r.name, { eqSet: new Set(), catSet: new Set() });
        }
        const entry = map.get(r.name)!;
        if (r.equipment && r.equipment !== "none" && r.equipment !== "null" && r.equipment !== "undefined") {
          entry.eqSet.add(r.equipment);
        }
        if (r.category && r.category !== "null" && r.category !== "undefined") {
          entry.catSet.add(r.category);
        }
      }
    }

    const list: { name: string; equipment: string | null; equipments: string[]; category: string | null; categories: string[] }[] = [];
    for (const [name, { eqSet, catSet }] of map.entries()) {
      const eqArray = Array.from(eqSet).sort();
      const catArray = Array.from(catSet).sort();
      list.push({
        name,
        equipment: eqArray[0] ?? null,
        equipments: eqArray,
        category: catArray[0] ?? "Free Weights",
        categories: catArray.length > 0 ? catArray : ["Free Weights"],
      });
    }

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }

  getStats(userId: number) {
    const lastSession = db.select()
      .from(workoutSessions)
      .where(and(eq(workoutSessions.userId, userId), sql`${workoutSessions.completedAt} IS NOT NULL`))
      .orderBy(desc(workoutSessions.completedAt))
      .limit(1)
      .get();

    let daysAgo: number | null = null;
    if (lastSession && lastSession.completedAt) {
      const completedDate = parseDateString(lastSession.completedAt);
      const today = new Date();
      const date1 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
      const date2 = Date.UTC(completedDate.getFullYear(), completedDate.getMonth(), completedDate.getDate());
      daysAgo = Math.floor((date1 - date2) / (1000 * 60 * 60 * 24));
    }

    const workoutCountRes = db.select({
      count: sql<number>`count(${workoutSessions.sessionId})`
    })
      .from(workoutSessions)
      .where(and(
        eq(workoutSessions.userId, userId),
        sql`${workoutSessions.completedAt} IS NOT NULL`
      ))
      .get();

    const totalWorkouts = workoutCountRes?.count ?? 0;

    const volumeRes = db.select({
      volume: sql<number>`sum(max(coalesce(${sessionSets.weight}, 0), 0) * coalesce(${sessionSets.reps}, 0))`
    })
      .from(sessionSets)
      .innerJoin(sessionExercises, eq(sessionSets.sessionExerciseId, sessionExercises.sessionExerciseId))
      .innerJoin(workoutSessions, eq(sessionExercises.sessionId, workoutSessions.sessionId))
      .where(and(
        eq(workoutSessions.userId, userId),
        sql`${workoutSessions.completedAt} IS NOT NULL`,
        eq(sessionSets.completed, 1)
      ))
      .get();

    const totalVolume = volumeRes?.volume ?? 0;

    return {
      daysAgo,
      totalWorkouts,
      totalVolume,
    };
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

  getSessionPRs(sessionId: number, userId: number, currentDurationSeconds?: number): PersonalRecord[] {
    const currentSession = db.select()
      .from(workoutSessions)
      .where(and(eq(workoutSessions.sessionId, sessionId), eq(workoutSessions.userId, userId)))
      .get();
    if (!currentSession) return [];

    const currentSets = db.select({
      exerciseName: sessionExercises.exerciseName,
      isAssisted: sessionExercises.isAssisted,
      reps: sessionSets.reps,
      weight: sessionSets.weight,
      distance: sessionSets.distance,
      duration: sessionSets.duration,
      completed: sessionSets.completed,
    })
      .from(sessionSets)
      .innerJoin(sessionExercises, eq(sessionSets.sessionExerciseId, sessionExercises.sessionExerciseId))
      .where(and(
        eq(sessionExercises.sessionId, sessionId),
        eq(sessionSets.completed, 1)
      ))
      .all();

    const previousSessions = db.select({
      sessionId: workoutSessions.sessionId,
      startedAt: workoutSessions.startedAt,
      completedAt: workoutSessions.completedAt,
      pausedAt: workoutSessions.pausedAt,
      pausedSeconds: workoutSessions.pausedSeconds,
    })
      .from(workoutSessions)
      .where(and(
        eq(workoutSessions.userId, userId),
        sql`${workoutSessions.completedAt} IS NOT NULL`,
        ne(workoutSessions.sessionId, sessionId)
      ))
      .all();

    const previousSets = db.select({
      exerciseName: sessionExercises.exerciseName,
      isAssisted: sessionExercises.isAssisted,
      sessionId: sessionExercises.sessionId,
      reps: sessionSets.reps,
      weight: sessionSets.weight,
      distance: sessionSets.distance,
      duration: sessionSets.duration,
    })
      .from(sessionSets)
      .innerJoin(sessionExercises, eq(sessionSets.sessionExerciseId, sessionExercises.sessionExerciseId))
      .innerJoin(workoutSessions, eq(sessionExercises.sessionId, workoutSessions.sessionId))
      .where(and(
        eq(workoutSessions.userId, userId),
        sql`${workoutSessions.completedAt} IS NOT NULL`,
        ne(workoutSessions.sessionId, sessionId),
        eq(sessionSets.completed, 1)
      ))
      .all();

    const prs: PersonalRecord[] = [];

    const currentByExercise = new Map<string, { displayName: string; sets: typeof currentSets }>();
    for (const s of currentSets) {
      const key = exerciseKey(s.exerciseName);
      if (!currentByExercise.has(key)) currentByExercise.set(key, { displayName: s.exerciseName.trim(), sets: [] });
      currentByExercise.get(key)!.sets.push(s);
    }

    const previousByExercise = new Map<string, typeof previousSets>();
    for (const s of previousSets) {
      const key = exerciseKey(s.exerciseName);
      if (!previousByExercise.has(key)) previousByExercise.set(key, []);
      previousByExercise.get(key)!.push(s);
    }

    const maxOf = (values: number[]) => (values.length > 0 ? Math.max(...values) : 0);
    const sumBySession = (sets: typeof previousSets, fn: (s: (typeof previousSets)[number]) => number) => {
      const totals = new Map<number, number>();
      for (const s of sets) totals.set(s.sessionId, (totals.get(s.sessionId) ?? 0) + fn(s));
      return Array.from(totals.values());
    };

    for (const [key, { displayName: exerciseName, sets: cSets }] of currentByExercise) {
      const pSets = previousByExercise.get(key) ?? [];
      if (pSets.length === 0) continue;

      const cWeighted = cSets.filter((s) => s.weight != null);
      const pWeighted = pSets.filter((s) => s.weight != null);
      if (cWeighted.length > 0 && pWeighted.length > 0) {
        const cMaxWeight = Math.max(...cWeighted.map((s) => signedWeight(s.weight, s.isAssisted)!));
        const pMaxWeight = Math.max(...pWeighted.map((s) => signedWeight(s.weight, s.isAssisted)!));
        const assisted = cWeighted.every((s) => s.isAssisted) && pWeighted.every((s) => s.isAssisted);
        if (assisted) {
          if (cMaxWeight > pMaxWeight) {
            prs.push({ type: "weight", exerciseName, prevValue: Math.abs(pMaxWeight), newValue: Math.abs(cMaxWeight), unit: "kg", assisted: true });
          }
        } else if (cMaxWeight !== 0 && cMaxWeight > pMaxWeight) {
          prs.push({ type: "weight", exerciseName, prevValue: pMaxWeight, newValue: cMaxWeight, unit: "kg" });
        }
      }

      const cMaxReps = maxOf(cSets.map(s => s.reps ?? 0));
      const pMaxReps = maxOf(pSets.map(s => s.reps ?? 0));
      if (pMaxReps > 0 && cMaxReps > pMaxReps) {
        prs.push({ type: "reps", exerciseName, prevValue: pMaxReps, newValue: cMaxReps, unit: "reps" });
      }

      const cSetsCount = cSets.length;
      const pMaxSetsCount = maxOf(sumBySession(pSets, () => 1));
      if (cSetsCount > pMaxSetsCount) {
        prs.push({ type: "sets", exerciseName, prevValue: pMaxSetsCount, newValue: cSetsCount, unit: "sets" });
      }

      const cVolume = cSets.reduce((sum, s) => sum + effectiveVolume(s.weight, s.reps), 0);
      const pMaxVolume = maxOf(sumBySession(pSets, (s) => effectiveVolume(s.weight, s.reps)));
      if (pMaxVolume > 0 && cVolume > pMaxVolume) {
        prs.push({ type: "volume", exerciseName, prevValue: pMaxVolume, newValue: cVolume, unit: "kg" });
      }

      const cMaxDistance = maxOf(cSets.map(s => s.distance ?? 0));
      const pMaxDistance = maxOf(pSets.map(s => s.distance ?? 0));
      if (pMaxDistance > 0 && cMaxDistance > pMaxDistance) {
        prs.push({ type: "distance", exerciseName, prevValue: pMaxDistance, newValue: cMaxDistance, unit: "km" });
      }

      const cMaxDuration = maxOf(cSets.map(s => s.duration ?? 0));
      const pMaxDuration = maxOf(pSets.map(s => s.duration ?? 0));
      if (pMaxDuration > 0 && cMaxDuration > pMaxDuration) {
        prs.push({ type: "duration", exerciseName, prevValue: pMaxDuration, newValue: cMaxDuration, unit: "sec" });
      }
    }

    if (previousSessions.length === 0) return prs;

    const cSessionVolume = currentSets.reduce((sum, s) => sum + effectiveVolume(s.weight, s.reps), 0);
    const pMaxSessionVolume = maxOf(sumBySession(previousSets, (s) => effectiveVolume(s.weight, s.reps)));
    if (pMaxSessionVolume > 0 && cSessionVolume > pMaxSessionVolume) {
      prs.push({ type: "session_volume", prevValue: pMaxSessionVolume, newValue: cSessionVolume, unit: "kg" });
    }

    const cSessionDuration = currentDurationSeconds !== undefined
      ? currentDurationSeconds
      : activeSeconds(currentSession, Date.now());
    const pMaxSessionDuration = maxOf(previousSessions.map(s => activeSeconds(s, 0)));
    if (pMaxSessionDuration > 0 && cSessionDuration > pMaxSessionDuration) {
      prs.push({ type: "session_duration", prevValue: Math.round(pMaxSessionDuration), newValue: Math.round(cSessionDuration), unit: "sec" });
    }

    const cSessionExerciseCount = currentByExercise.size;
    const pExercisesBySession = new Map<number, Set<string>>();
    for (const s of previousSets) {
      if (!pExercisesBySession.has(s.sessionId)) pExercisesBySession.set(s.sessionId, new Set());
      pExercisesBySession.get(s.sessionId)!.add(exerciseKey(s.exerciseName));
    }
    const pMaxSessionExercisesCount = maxOf(Array.from(pExercisesBySession.values()).map(set => set.size));
    if (pMaxSessionExercisesCount > 0 && cSessionExerciseCount > pMaxSessionExercisesCount) {
      prs.push({ type: "session_exercises", prevValue: pMaxSessionExercisesCount, newValue: cSessionExerciseCount, unit: "exercises" });
    }

    return prs;
  }
}
