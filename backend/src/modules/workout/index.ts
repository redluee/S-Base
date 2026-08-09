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

function validateSetParams(params: {
  reps?: number;
  weight?: number;
  distance?: number;
  duration?: number;
  rpe?: number;
  heartRate?: number;
  defaultRestTime?: number;
}, prefix: string = "") {
  const getMsg = (field: string, suffix: string) => {
    if (prefix) {
      return `${prefix} ${field} ${suffix}`;
    }
    return `${field.charAt(0).toUpperCase() + field.slice(1)} ${suffix}`;
  };

  if (params.reps !== undefined && params.reps < 0) throw new Error(getMsg("reps", "cannot be negative"));
  if (params.weight !== undefined && params.weight < 0) throw new Error(getMsg("weight", "cannot be negative"));
  if (params.distance !== undefined && params.distance < 0) throw new Error(getMsg("distance", "cannot be negative"));
  if (params.duration !== undefined && params.duration < 0) throw new Error(getMsg("duration", "cannot be negative"));
  if (params.rpe !== undefined && (params.rpe < 0 || params.rpe > 10)) throw new Error(getMsg("RPE", "must be 0-10"));
  if (params.heartRate !== undefined && params.heartRate < 0) throw new Error(getMsg("heart rate", "cannot be negative"));
  if (params.defaultRestTime !== undefined && params.defaultRestTime < 0) throw new Error(getMsg("rest time", "cannot be negative"));
}

function parseDateString(dateStr: string): Date {
  return new Date(dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T") + "Z");
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
    .orderBy(desc(workoutTemplates.createdAt))
    .all();
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
    exercises?: {
      exerciseName: string;
      category?: string;
      sets: number;
      reps: number;
      weight?: number;
      distance?: number;
      duration?: number;
      rpe?: number;
      heartRate?: number;
      defaultRestTime?: number;
      equipment?: string;
      perSide?: number;
    }[];
  }) {
    if (data.estimatedTime !== undefined && data.estimatedTime < 0) {
      throw new Error("Estimated time cannot be negative");
    }
    if (data.exercises?.length) {
      for (let i = 0; i < data.exercises.length; i++) {
        const ex = data.exercises[i];
        if (ex.sets < 1) throw new Error(`Exercise "${ex.exerciseName}" must have at least 1 set`);
        validateSetParams(ex, `Exercise "${ex.exerciseName}"`);
      }
    }
    const template = db.insert(workoutTemplates).values({
      userId,
      name: data.name,
      description: data.description,
      targetMuscleGroups: data.targetMuscleGroups,
      estimatedTime: data.estimatedTime,
    }).returning().get();

    if (data.exercises?.length) {
      for (let i = 0; i < data.exercises.length; i++) {
        const ex = data.exercises[i];
        db.insert(templateExercises).values({
          templateId: template.templateId,
          exerciseName: ex.exerciseName,
          sortOrder: i,
          category: ex.category ?? "Free Weights",
          defaultSets: ex.sets,
          defaultReps: ex.reps,
          defaultWeight: ex.weight,
          defaultDistance: ex.distance,
          defaultDuration: ex.duration,
          defaultRpe: ex.rpe,
          defaultHeartRate: ex.heartRate,
          defaultRestTime: ex.defaultRestTime,
          equipment: ex.equipment,
          perSide: ex.perSide ?? 0,
        }).run();
      }
    }

    return this.getTemplate(template.templateId, userId);
  }

  updateTemplate(id: number, userId: number, data: {
    name?: string;
    description?: string;
    targetMuscleGroups?: string;
    estimatedTime?: number;
    exercises?: {
      exerciseName: string;
      category?: string;
      sets: number;
      reps: number;
      weight?: number;
      distance?: number;
      duration?: number;
      rpe?: number;
      heartRate?: number;
      defaultRestTime?: number;
      equipment?: string;
      perSide?: number;
    }[];
  }) {
    const existing = db.select().from(workoutTemplates).where(and(eq(workoutTemplates.templateId, id), eq(workoutTemplates.userId, userId))).get();
    if (!existing) return null;

    if (data.estimatedTime !== undefined && data.estimatedTime < 0) {
      throw new Error("Estimated time cannot be negative");
    }
    if (data.exercises?.length) {
      for (let i = 0; i < data.exercises.length; i++) {
        const ex = data.exercises[i];
        if (ex.sets < 1) throw new Error(`Exercise "${ex.exerciseName}" must have at least 1 set`);
        validateSetParams(ex, `Exercise "${ex.exerciseName}"`);
      }
    }

    db.update(workoutTemplates).set({
      name: data.name ?? existing.name,
      description: data.description ?? existing.description,
      targetMuscleGroups: data.targetMuscleGroups !== undefined ? data.targetMuscleGroups : existing.targetMuscleGroups,
      estimatedTime: data.estimatedTime !== undefined ? data.estimatedTime : existing.estimatedTime,
    }).where(and(eq(workoutTemplates.templateId, id), eq(workoutTemplates.userId, userId))).run();

    if (data.exercises) {
      db.delete(templateExercises).where(eq(templateExercises.templateId, id)).run();

      for (let i = 0; i < data.exercises.length; i++) {
        const ex = data.exercises[i];
        db.insert(templateExercises).values({
          templateId: id,
          exerciseName: ex.exerciseName,
          sortOrder: i,
          category: ex.category ?? "Free Weights",
          defaultSets: ex.sets,
          defaultReps: ex.reps,
          defaultWeight: ex.weight,
          defaultDistance: ex.distance,
          defaultDuration: ex.duration,
          defaultRpe: ex.rpe,
          defaultHeartRate: ex.heartRate,
          defaultRestTime: ex.defaultRestTime,
          equipment: ex.equipment,
          perSide: ex.perSide ?? 0,
        }).run();
      }
    }

    return this.getTemplate(id, userId);
  }

  deleteTemplate(id: number, userId: number) {
    const existing = db.select().from(workoutTemplates).where(and(eq(workoutTemplates.templateId, id), eq(workoutTemplates.userId, userId))).get();
    if (!existing) return null;
    db.delete(workoutTemplates).where(and(eq(workoutTemplates.templateId, id), eq(workoutTemplates.userId, userId))).run();
    return { deleted: true };
  }

  listSessions(userId: number, status?: string, q?: string) {
    this.cleanupEmptySessions(userId, 0);
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
      exerciseCount: sql<number>`(SELECT COUNT(*) FROM session_exercises WHERE session_exercises.session_id = workout_sessions.session_id)`
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
      .orderBy(sessionExercises.sortOrder)
      .all();

    let templateExs: any[] = [];
    if (session.templateId) {
      templateExs = db.select()
        .from(templateExercises)
        .where(eq(templateExercises.templateId, session.templateId))
        .all();
    }

    const sessionWithSets = exercises.map((ex) => {
      const sets = db.select()
        .from(sessionSets)
        .where(eq(sessionSets.sessionExerciseId, ex.sessionExerciseId))
        .orderBy(sessionSets.setNumber)
        .all();

      let templateEx = templateExs.find((te) => te.sortOrder === ex.sortOrder) || templateExs.find((te) => te.exerciseName === ex.exerciseName);

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
        })
          .from(templateExercises);

        if (userId !== undefined) {
          templateEx = query
            .innerJoin(workoutTemplates, eq(templateExercises.templateId, workoutTemplates.templateId))
            .where(and(eq(templateExercises.exerciseName, ex.exerciseName), eq(workoutTemplates.userId, userId)))
            .limit(1)
            .get();
        } else {
          templateEx = db.select()
            .from(templateExercises)
            .where(eq(templateExercises.exerciseName, ex.exerciseName))
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
        } : null
      };
    });

    return { ...session, exercises: sessionWithSets };
  }

  createSession(userId: number, templateId?: number) {
    this.cleanupEmptySessions(userId, 0);
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

    const session = db.insert(workoutSessions).values({
      userId,
      templateId: validTemplateId ?? null,
      name: sessionName,
      startedAt: new Date().toISOString(),
    }).returning().get();

    if (validTemplateId) {
      const template = this.getTemplate(validTemplateId, userId);
      if (template?.exercises) {
        for (const tex of template.exercises) {
          const se = db.insert(sessionExercises).values({
            sessionId: session.sessionId,
            exerciseName: tex.exerciseName,
            sortOrder: tex.sortOrder,
            category: tex.category ?? "Free Weights",
            equipment: tex.equipment,
            perSide: tex.perSide ?? 0,
          }).returning().get();

          for (let s = 1; s <= tex.defaultSets; s++) {
            db.insert(sessionSets).values({
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

    return this.getSession(session.sessionId, userId);
  }

  updateSession(id: number, userId: number, data: {
    name?: string;
    notes?: string;
    completedAt?: string;
    exercises?: {
      sessionExerciseId?: number;
      exerciseName: string;
      sortOrder: number;
      category?: string;
      equipment?: string;
      perSide?: number;
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

    if (data.exercises?.length) {
      for (let i = 0; i < data.exercises.length; i++) {
        const ex = data.exercises[i];
        if (ex.sets?.length) {
          for (let j = 0; j < ex.sets.length; j++) {
            validateSetParams(ex.sets[j]);
          }
        }
      }
    }

    const updateFields: any = {};
    if (data.name !== undefined) updateFields.name = data.name;
    if (data.notes !== undefined) updateFields.notes = data.notes;
    if (data.completedAt !== undefined) updateFields.completedAt = data.completedAt;

    if (Object.keys(updateFields).length > 0) {
      db.update(workoutSessions).set(updateFields).where(and(eq(workoutSessions.sessionId, id), eq(workoutSessions.userId, userId))).run();
    }

    if (data.exercises) {
      const currentExerciseIds = db.select({ id: sessionExercises.sessionExerciseId })
        .from(sessionExercises)
        .where(eq(sessionExercises.sessionId, id))
        .all()
        .map((r) => r.id);

      const incomingIds = data.exercises
        .filter((e) => e.sessionExerciseId)
        .map((e) => e.sessionExerciseId!);

      const toRemove = currentExerciseIds.filter((ci) => !incomingIds.includes(ci));
      for (const removeId of toRemove) {
        db.delete(sessionSets).where(eq(sessionSets.sessionExerciseId, removeId)).run();
        db.delete(sessionExercises).where(eq(sessionExercises.sessionExerciseId, removeId)).run();
      }

      for (const ex of data.exercises) {
        if (ex.sessionExerciseId) {
          db.update(sessionExercises).set({
            exerciseName: ex.exerciseName,
            sortOrder: ex.sortOrder,
            category: ex.category ?? "Free Weights",
            equipment: ex.equipment,
            perSide: ex.perSide ?? 0,
          }).where(eq(sessionExercises.sessionExerciseId, ex.sessionExerciseId)).run();

          if (ex.sets) {
            db.delete(sessionSets).where(eq(sessionSets.sessionExerciseId, ex.sessionExerciseId)).run();

            for (const set of ex.sets) {
              db.insert(sessionSets).values({
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
          const se = db.insert(sessionExercises).values({
            sessionId: id,
            exerciseName: ex.exerciseName,
            sortOrder: ex.sortOrder,
            category: ex.category ?? "Free Weights",
            equipment: ex.equipment,
            perSide: ex.perSide ?? 0,
          }).returning().get();

          if (ex.sets) {
            for (const set of ex.sets) {
              db.insert(sessionSets).values({
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

    return this.getSession(id, userId);
  }

  completeSession(id: number, userId: number, completedAt?: string) {
    const existing = db.select().from(workoutSessions).where(and(eq(workoutSessions.sessionId, id), eq(workoutSessions.userId, userId))).get();
    if (!existing) return null;

    db.update(workoutSessions).set({
      completedAt: completedAt ?? new Date().toISOString(),
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
    })
      .from(templateExercises)
      .innerJoin(workoutTemplates, eq(templateExercises.templateId, workoutTemplates.templateId))
      .where(and(
        like(sqlNormalize(templateExercises.exerciseName), `%${normalizedQ}%`),
        eq(workoutTemplates.userId, userId)
      ))
      .limit(10)
      .all();

    const fromSessions = db.select({
      name: sessionExercises.exerciseName,
      category: sessionExercises.category,
      equipment: sessionExercises.equipment,
      perSide: sessionExercises.perSide,
    })
      .from(sessionExercises)
      .innerJoin(workoutSessions, eq(sessionExercises.sessionId, workoutSessions.sessionId))
      .where(and(
        like(sqlNormalize(sessionExercises.exerciseName), `%${normalizedQ}%`),
        eq(workoutSessions.userId, userId),
        sql`${workoutSessions.completedAt} IS NOT NULL`
      ))
      .limit(10)
      .all();

    const exerciseMap = new Map<
      string,
      {
        category: string;
        defaultSets: number | null;
        defaultReps: number | null;
        defaultWeight: number | null;
        defaultDistance: number | null;
        defaultDuration: number | null;
        defaultRestTime: number | null;
        equipment: string | null;
        perSide: number | null;
      }
    >();

    for (const r of fromTemplates) {
      const eqNorm = r.equipment && r.equipment !== "none" ? r.equipment : null;
      const key = `${r.name}::${eqNorm ?? ""}`;
      if (!exerciseMap.has(key)) {
        exerciseMap.set(key, {
          category: r.category ?? "Free Weights",
          defaultSets: r.defaultSets,
          defaultReps: r.defaultReps,
          defaultWeight: r.defaultWeight,
          defaultDistance: r.defaultDistance,
          defaultDuration: r.defaultDuration,
          defaultRestTime: r.defaultRestTime,
          equipment: eqNorm,
          perSide: r.perSide ?? 0,
        });
      }
    }

    for (const r of fromSessions) {
      const eqNorm = r.equipment && r.equipment !== "none" ? r.equipment : null;
      const key = `${r.name}::${eqNorm ?? ""}`;
      if (!exerciseMap.has(key)) {
        exerciseMap.set(key, {
          category: r.category ?? "Free Weights",
          defaultSets: null,
          defaultReps: null,
          defaultWeight: null,
          defaultDistance: null,
          defaultDuration: null,
          defaultRestTime: null,
          equipment: eqNorm,
          perSide: r.perSide ?? 0,
        });
      }
    }

    return Array.from(exerciseMap.entries()).map(([key, data]) => {
      const [name] = key.split("::");
      return {
        type: "exercise" as const,
        value: name,
        category: data.category,
        defaultSets: data.defaultSets,
        defaultReps: data.defaultReps,
        defaultWeight: data.defaultWeight,
        defaultDistance: data.defaultDistance,
        defaultDuration: data.defaultDuration,
        defaultRestTime: data.defaultRestTime,
        equipment: data.equipment,
        perSide: data.perSide,
      };
    });
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
    const availableEqRows = db.select({ equipment: sessionExercises.equipment })
      .from(sessionExercises)
      .innerJoin(workoutSessions, eq(sessionExercises.sessionId, workoutSessions.sessionId))
      .where(and(
        eq(sessionExercises.exerciseName, name),
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
      eq(sessionExercises.exerciseName, name),
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
      .orderBy(workoutSessions.startedAt, sessionExercises.sortOrder, sessionSets.setNumber)
      .all();

    const sessions: Record<number, { startedAt: string; equipment: string | null; sets: typeof rows }> = {};
    for (const row of rows) {
      if (!sessions[row.sessionId]) {
        sessions[row.sessionId] = { startedAt: row.startedAt, equipment: row.equipment ?? null, sets: [] };
      }
      sessions[row.sessionId].sets.push(row);
    }

    return {
      exerciseName: name,
      category: rows[0]?.category ?? "Free Weights",
      equipment: equipment && equipment !== "all" ? equipment : null,
      availableEquipments,
      sessions: Object.entries(sessions).map(([id, s]) => ({
        sessionId: Number(id),
        startedAt: s.startedAt,
        equipment: s.equipment,
        sets: s.sets,
      })),
    };
  }

  listUniqueExercises(userId: number) {
    this.cleanupEmptySessions(userId, 0);
    const fromTemplates = db.select({ name: templateExercises.exerciseName, equipment: templateExercises.equipment })
      .from(templateExercises)
      .innerJoin(workoutTemplates, eq(templateExercises.templateId, workoutTemplates.templateId))
      .where(eq(workoutTemplates.userId, userId))
      .all();
    const fromSessions = db.select({ name: sessionExercises.exerciseName, equipment: sessionExercises.equipment })
      .from(sessionExercises)
      .innerJoin(workoutSessions, eq(sessionExercises.sessionId, workoutSessions.sessionId))
      .where(and(
        eq(workoutSessions.userId, userId),
        sql`${workoutSessions.completedAt} IS NOT NULL`
      ))
      .all();

    const map = new Map<string, Set<string>>();

    for (const r of [...fromTemplates, ...fromSessions]) {
      if (r.name) {
        if (!map.has(r.name)) {
          map.set(r.name, new Set());
        }
        if (r.equipment && r.equipment !== "none" && r.equipment !== "null" && r.equipment !== "undefined") {
          map.get(r.name)!.add(r.equipment);
        }
      }
    }

    const list: { name: string; equipment: string | null; equipments: string[] }[] = [];
    for (const [name, eqSet] of map.entries()) {
      const eqArray = Array.from(eqSet).sort();
      list.push({
        name,
        equipment: eqArray[0] ?? null,
        equipments: eqArray,
      });
    }

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }

  getStats(userId: number) {
    this.cleanupEmptySessions(userId, 0);
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
      volume: sql<number>`sum(coalesce(${sessionSets.weight}, 0) * coalesce(${sessionSets.reps}, 0))`
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

  cleanupEmptySessions(userId: number, minAgeSeconds: number = 0) {
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

  getSessionPRs(sessionId: number, userId: number, currentDurationSeconds?: number): any[] {
    const currentSession = db.select()
      .from(workoutSessions)
      .where(and(eq(workoutSessions.sessionId, sessionId), eq(workoutSessions.userId, userId)))
      .get();
    if (!currentSession) return [];

    const currentSets = db.select({
      exerciseName: sessionExercises.exerciseName,
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

    const prs: any[] = [];

    const currentSetsByExercise: { [name: string]: typeof currentSets } = {};
    for (const s of currentSets) {
      if (!currentSetsByExercise[s.exerciseName]) {
        currentSetsByExercise[s.exerciseName] = [];
      }
      currentSetsByExercise[s.exerciseName].push(s);
    }

    const previousSetsByExercise: { [name: string]: typeof previousSets } = {};
    for (const s of previousSets) {
      if (!previousSetsByExercise[s.exerciseName]) {
        previousSetsByExercise[s.exerciseName] = [];
      }
      previousSetsByExercise[s.exerciseName].push(s);
    }

    for (const exerciseName of Object.keys(currentSetsByExercise)) {
      const cSets = currentSetsByExercise[exerciseName];
      const pSets = previousSetsByExercise[exerciseName] ?? [];

      const cMaxWeight = Math.max(...cSets.map(s => s.weight ?? 0), 0);
      const pMaxWeight = pSets.length > 0 ? Math.max(...pSets.map(s => s.weight ?? 0), 0) : 0;
      if (cMaxWeight > pMaxWeight && cMaxWeight > 0) {
        prs.push({
          type: "weight",
          exerciseName,
          prevValue: pMaxWeight,
          newValue: cMaxWeight,
          unit: "kg",
        });
      }

      const cMaxReps = Math.max(...cSets.map(s => s.reps ?? 0), 0);
      const pMaxReps = pSets.length > 0 ? Math.max(...pSets.map(s => s.reps ?? 0), 0) : 0;
      if (cMaxReps > pMaxReps && cMaxReps > 0) {
        prs.push({
          type: "reps",
          exerciseName,
          prevValue: pMaxReps,
          newValue: cMaxReps,
          unit: "reps",
        });
      }

      const cSetsCount = cSets.length;
      const pSetsCountBySession: { [id: number]: number } = {};
      for (const s of pSets) {
        pSetsCountBySession[s.sessionId] = (pSetsCountBySession[s.sessionId] ?? 0) + 1;
      }
      const pMaxSetsCount = Object.keys(pSetsCountBySession).length > 0 ? Math.max(...Object.values(pSetsCountBySession)) : 0;
      if (cSetsCount > pMaxSetsCount && cSetsCount > 0) {
        prs.push({
          type: "sets",
          exerciseName,
          prevValue: pMaxSetsCount,
          newValue: cSetsCount,
          unit: "sets",
        });
      }

      const cVolume = cSets.reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);
      const pVolumeBySession: { [id: number]: number } = {};
      for (const s of pSets) {
        pVolumeBySession[s.sessionId] = (pVolumeBySession[s.sessionId] ?? 0) + (s.weight ?? 0) * (s.reps ?? 0);
      }
      const pMaxVolume = Object.keys(pVolumeBySession).length > 0 ? Math.max(...Object.values(pVolumeBySession)) : 0;
      if (cVolume > pMaxVolume && cVolume > 0) {
        prs.push({
          type: "volume",
          exerciseName,
          prevValue: pMaxVolume,
          newValue: cVolume,
          unit: "kg",
        });
      }

      const cMaxDistance = Math.max(...cSets.map(s => s.distance ?? 0), 0);
      const pMaxDistance = pSets.length > 0 ? Math.max(...pSets.map(s => s.distance ?? 0), 0) : 0;
      if (cMaxDistance > pMaxDistance && cMaxDistance > 0) {
        prs.push({
          type: "distance",
          exerciseName,
          prevValue: pMaxDistance,
          newValue: cMaxDistance,
          unit: "km",
        });
      }

      const cMaxDuration = Math.max(...cSets.map(s => s.duration ?? 0), 0);
      const pMaxDuration = pSets.length > 0 ? Math.max(...pSets.map(s => s.duration ?? 0), 0) : 0;
      if (cMaxDuration > pMaxDuration && cMaxDuration > 0) {
        prs.push({
          type: "duration",
          exerciseName,
          prevValue: pMaxDuration,
          newValue: cMaxDuration,
          unit: "sec",
        });
      }
    }

    const cSessionVolume = currentSets.reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);
    const pVolumeBySessionId: { [id: number]: number } = {};
    for (const s of previousSets) {
      pVolumeBySessionId[s.sessionId] = (pVolumeBySessionId[s.sessionId] ?? 0) + (s.weight ?? 0) * (s.reps ?? 0);
    }
    const pMaxSessionVolume = Object.keys(pVolumeBySessionId).length > 0 ? Math.max(...Object.values(pVolumeBySessionId)) : 0;
    if (cSessionVolume > pMaxSessionVolume && cSessionVolume > 0) {
      prs.push({
        type: "session_volume",
        prevValue: pMaxSessionVolume,
        newValue: cSessionVolume,
        unit: "kg",
      });
    }

    let cSessionDuration = 0;
    if (currentDurationSeconds !== undefined) {
      cSessionDuration = currentDurationSeconds;
    } else if (currentSession.completedAt) {
      cSessionDuration = (parseDateString(currentSession.completedAt).getTime() - parseDateString(currentSession.startedAt).getTime()) / 1000;
    } else {
      cSessionDuration = (Date.now() - parseDateString(currentSession.startedAt).getTime()) / 1000;
    }

    const pSessionsDurations = previousSessions.map(s => {
      if (!s.completedAt) return 0;
      return (parseDateString(s.completedAt).getTime() - parseDateString(s.startedAt).getTime()) / 1000;
    });
    const pMaxSessionDuration = pSessionsDurations.length > 0 ? Math.max(...pSessionsDurations) : 0;
    if (cSessionDuration > pMaxSessionDuration && cSessionDuration > 0) {
      prs.push({
        type: "session_duration",
        prevValue: pMaxSessionDuration,
        newValue: Math.round(cSessionDuration),
        unit: "sec",
      });
    }

    const cSessionExerciseCount = Object.keys(currentSetsByExercise).length;
    const pExercisesBySession: { [id: number]: Set<string> } = {};
    for (const s of previousSets) {
      if (!pExercisesBySession[s.sessionId]) {
        pExercisesBySession[s.sessionId] = new Set();
      }
      pExercisesBySession[s.sessionId].add(s.exerciseName);
    }
    const pMaxSessionExercisesCount = Object.keys(pExercisesBySession).length > 0
      ? Math.max(...Object.values(pExercisesBySession).map(set => set.size))
      : 0;
    if (cSessionExerciseCount > pMaxSessionExercisesCount && cSessionExerciseCount > 0) {
      prs.push({
        type: "session_exercises",
        prevValue: pMaxSessionExercisesCount,
        newValue: cSessionExerciseCount,
        unit: "exercises",
      });
    }

    return prs;
  }
}

