import { eq, and, or, like, desc, asc, sql } from "drizzle-orm";
import db from "../../db/client";
import {
  workoutTemplates,
  templateExercises,
  workoutSessions,
  sessionExercises,
  sessionSets,
} from "../../db/schema";

export class WorkoutService {
  listTemplates(userId: number) {
    return db.select().from(workoutTemplates).where(eq(workoutTemplates.userId, userId)).orderBy(desc(workoutTemplates.createdAt)).all();
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
    }[];
  }) {
    if (data.estimatedTime !== undefined && data.estimatedTime < 0) {
      throw new Error("Estimated time cannot be negative");
    }
    if (data.exercises?.length) {
      for (let i = 0; i < data.exercises.length; i++) {
        const ex = data.exercises[i];
        if (ex.sets < 1) throw new Error(`Exercise "${ex.exerciseName}" must have at least 1 set`);
        if (ex.reps < 0) throw new Error(`Exercise "${ex.exerciseName}" reps cannot be negative`);
        if (ex.weight !== undefined && ex.weight < 0) throw new Error(`Exercise "${ex.exerciseName}" weight cannot be negative`);
        if (ex.distance !== undefined && ex.distance < 0) throw new Error(`Exercise "${ex.exerciseName}" distance cannot be negative`);
        if (ex.duration !== undefined && ex.duration < 0) throw new Error(`Exercise "${ex.exerciseName}" duration cannot be negative`);
        if (ex.rpe !== undefined && (ex.rpe < 0 || ex.rpe > 10)) throw new Error(`Exercise "${ex.exerciseName}" RPE must be 0-10`);
        if (ex.heartRate !== undefined && ex.heartRate < 0) throw new Error(`Exercise "${ex.exerciseName}" heart rate cannot be negative`);
        if (ex.defaultRestTime !== undefined && ex.defaultRestTime < 0) throw new Error(`Exercise "${ex.exerciseName}" rest time cannot be negative`);
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
          category: ex.category ?? "resistance",
          defaultSets: ex.sets,
          defaultReps: ex.reps,
          defaultWeight: ex.weight,
          defaultDistance: ex.distance,
          defaultDuration: ex.duration,
          defaultRpe: ex.rpe,
          defaultHeartRate: ex.heartRate,
          defaultRestTime: ex.defaultRestTime,
          equipment: ex.equipment,
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
        if (ex.reps < 0) throw new Error(`Exercise "${ex.exerciseName}" reps cannot be negative`);
        if (ex.weight !== undefined && ex.weight < 0) throw new Error(`Exercise "${ex.exerciseName}" weight cannot be negative`);
        if (ex.distance !== undefined && ex.distance < 0) throw new Error(`Exercise "${ex.exerciseName}" distance cannot be negative`);
        if (ex.duration !== undefined && ex.duration < 0) throw new Error(`Exercise "${ex.exerciseName}" duration cannot be negative`);
        if (ex.rpe !== undefined && (ex.rpe < 0 || ex.rpe > 10)) throw new Error(`Exercise "${ex.exerciseName}" RPE must be 0-10`);
        if (ex.heartRate !== undefined && ex.heartRate < 0) throw new Error(`Exercise "${ex.exerciseName}" heart rate cannot be negative`);
        if (ex.defaultRestTime !== undefined && ex.defaultRestTime < 0) throw new Error(`Exercise "${ex.exerciseName}" rest time cannot be negative`);
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
          category: ex.category ?? "resistance",
          defaultSets: ex.sets,
          defaultReps: ex.reps,
          defaultWeight: ex.weight,
          defaultDistance: ex.distance,
          defaultDuration: ex.duration,
          defaultRpe: ex.rpe,
          defaultHeartRate: ex.heartRate,
          defaultRestTime: ex.defaultRestTime,
          equipment: ex.equipment,
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
    this.cleanupEmptySessions(userId, 300);
    const conditions = [eq(workoutSessions.userId, userId)];

    if (status === "active") {
      conditions.push(sql`completed_at IS NULL`);
    } else if (status === "completed") {
      conditions.push(sql`completed_at IS NOT NULL`);
    }

    const sessions = db.select().from(workoutSessions)
      .where(and(...conditions))
      .orderBy(desc(workoutSessions.startedAt))
      .all();

    if (!q) return sessions;

    const normalizedQ = q.replace(/[\s\-\/]/g, "").toLowerCase();
    return sessions.filter((session) => {
      const nameNorm = (session.name || "").replace(/[\s\-\/]/g, "").toLowerCase();
      const notesNorm = (session.notes || "").replace(/[\s\-\/]/g, "").toLowerCase();
      
      const dateObj = new Date(
        session.startedAt.includes("T")
          ? session.startedAt
          : session.startedAt.replace(" ", "T") + "Z"
      );
      const formattedDate = dateObj.toLocaleDateString("nl-NL", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const dateNorm = formattedDate.replace(/[\s\-\/]/g, "").toLowerCase();

      const dateLong = dateObj.toLocaleDateString("nl-NL", {
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const dateLongNorm = dateLong.replace(/[\s\-\/]/g, "").toLowerCase();

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

      let templateEx = templateExs.find((te) => te.exerciseName === ex.exerciseName);

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
            category: tex.category ?? "resistance",
            equipment: tex.equipment,
          }).returning().get();

          for (let s = 1; s <= tex.defaultSets; s++) {
            db.insert(sessionSets).values({
              sessionExerciseId: se.sessionExerciseId,
              setNumber: s,
              reps: tex.defaultReps,
              weight: tex.defaultWeight,
              distance: tex.defaultDistance,
              duration: tex.defaultDuration,
              rpe: tex.defaultRpe,
              heartRate: tex.defaultHeartRate,
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
            const s = ex.sets[j];
            if (s.reps !== undefined && s.reps < 0) throw new Error(`Reps cannot be negative`);
            if (s.weight !== undefined && s.weight < 0) throw new Error(`Weight cannot be negative`);
            if (s.distance !== undefined && s.distance < 0) throw new Error(`Distance cannot be negative`);
            if (s.duration !== undefined && s.duration < 0) throw new Error(`Duration cannot be negative`);
            if (s.rpe !== undefined && (s.rpe < 0 || s.rpe > 10)) throw new Error(`RPE must be 0-10`);
            if (s.heartRate !== undefined && s.heartRate < 0) throw new Error(`Heart rate cannot be negative`);
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
            category: ex.category ?? "resistance",
            equipment: ex.equipment,
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
            category: ex.category ?? "resistance",
            equipment: ex.equipment,
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
    const normalizedQ = q.replace(/[\s\-\/]/g, "").toLowerCase();
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
    })
      .from(templateExercises)
      .innerJoin(workoutTemplates, eq(templateExercises.templateId, workoutTemplates.templateId))
      .where(and(
        sql`replace(replace(${templateExercises.exerciseName}, ' ', ''), '-', '') LIKE ${`%${normalizedQ}%`}`,
        eq(workoutTemplates.userId, userId)
      ))
      .limit(10)
      .all();

    const fromSessions = db.select({
      name: sessionExercises.exerciseName,
      category: sessionExercises.category,
      equipment: sessionExercises.equipment,
    })
      .from(sessionExercises)
      .innerJoin(workoutSessions, eq(sessionExercises.sessionId, workoutSessions.sessionId))
      .where(and(
        sql`replace(replace(${sessionExercises.exerciseName}, ' ', ''), '-', '') LIKE ${`%${normalizedQ}%`}`,
        eq(workoutSessions.userId, userId)
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
      }
    >();

    for (const r of fromTemplates) {
      const eqNorm = r.equipment && r.equipment !== "none" ? r.equipment : null;
      const key = `${r.name}::${eqNorm ?? ""}`;
      if (!exerciseMap.has(key)) {
        exerciseMap.set(key, {
          category: r.category ?? "resistance",
          defaultSets: r.defaultSets,
          defaultReps: r.defaultReps,
          defaultWeight: r.defaultWeight,
          defaultDistance: r.defaultDistance,
          defaultDuration: r.defaultDuration,
          defaultRestTime: r.defaultRestTime,
          equipment: eqNorm,
        });
      }
    }

    for (const r of fromSessions) {
      const eqNorm = r.equipment && r.equipment !== "none" ? r.equipment : null;
      const key = `${r.name}::${eqNorm ?? ""}`;
      if (!exerciseMap.has(key)) {
        exerciseMap.set(key, {
          category: r.category ?? "resistance",
          defaultSets: null,
          defaultReps: null,
          defaultWeight: null,
          defaultDistance: null,
          defaultDuration: null,
          defaultRestTime: null,
          equipment: eqNorm,
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
      };
    });
  }

  suggestWorkoutSearch(userId: number, q: string) {
    const normalizedQ = q.replace(/[\s\-\/]/g, "").toLowerCase();

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
          sql`replace(replace(${workoutTemplates.name}, ' ', ''), '-', '') LIKE ${`%${normalizedQ}%`}`,
          sql`replace(replace(${workoutTemplates.description}, ' ', ''), '-', '') LIKE ${`%${normalizedQ}%`}`,
          sql`replace(replace(${workoutTemplates.targetMuscleGroups}, ' ', ''), '-', '') LIKE ${`%${normalizedQ}%`}`
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
        const dateObj = new Date(
          session.startedAt.includes("T")
            ? session.startedAt
            : session.startedAt.replace(" ", "T") + "Z"
        );
        const formattedDate = dateObj.toLocaleDateString("nl-NL", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        
        const nameNorm = (session.name || "").replace(/[\s\-\/]/g, "").toLowerCase();
        const notesNorm = (session.notes || "").replace(/[\s\-\/]/g, "").toLowerCase();
        const dateNorm = formattedDate.replace(/[\s\-\/]/g, "").toLowerCase();

        const dateLong = dateObj.toLocaleDateString("nl-NL", {
          weekday: "short",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        const dateLongNorm = dateLong.replace(/[\s\-\/]/g, "").toLowerCase();

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
    const conditions = [
      eq(sessionExercises.exerciseName, name),
      sql`${workoutSessions.completedAt} IS NOT NULL`,
      eq(workoutSessions.userId, userId),
    ];
    if (equipment && equipment !== "null" && equipment !== "undefined" && equipment !== "none") {
      conditions.push(eq(sessionExercises.equipment, equipment));
    } else {
      conditions.push(sql`(${sessionExercises.equipment} IS NULL OR ${sessionExercises.equipment} = '' OR ${sessionExercises.equipment} = 'none')`);
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

    const sessions: Record<number, { startedAt: string; sets: typeof rows }> = {};
    for (const row of rows) {
      if (!sessions[row.sessionId]) {
        sessions[row.sessionId] = { startedAt: row.startedAt, sets: [] };
      }
      sessions[row.sessionId].sets.push(row);
    }

    return {
      exerciseName: name,
      category: rows[0]?.category ?? "resistance",
      equipment: equipment ?? null,
      sessions: Object.entries(sessions).map(([id, s]) => ({
        sessionId: Number(id),
        startedAt: s.startedAt,
        sets: s.sets,
      })),
    };
  }

  listUniqueExercises(userId: number) {
    this.cleanupEmptySessions(userId, 300);
    const fromTemplates = db.select({ name: templateExercises.exerciseName, equipment: templateExercises.equipment })
      .from(templateExercises)
      .innerJoin(workoutTemplates, eq(templateExercises.templateId, workoutTemplates.templateId))
      .where(eq(workoutTemplates.userId, userId))
      .all();
    const fromSessions = db.select({ name: sessionExercises.exerciseName, equipment: sessionExercises.equipment })
      .from(sessionExercises)
      .innerJoin(workoutSessions, eq(sessionExercises.sessionId, workoutSessions.sessionId))
      .where(eq(workoutSessions.userId, userId))
      .all();

    const exerciseSet = new Set<string>();
    const list: { name: string; equipment: string | null }[] = [];

    for (const r of fromTemplates) {
      if (r.name) {
        const eqNorm = r.equipment && r.equipment !== "none" ? r.equipment : null;
        const key = `${r.name}::${eqNorm ?? ""}`;
        if (!exerciseSet.has(key)) {
          exerciseSet.add(key);
          list.push({ name: r.name, equipment: eqNorm });
        }
      }
    }
    for (const r of fromSessions) {
      if (r.name) {
        const eqNorm = r.equipment && r.equipment !== "none" ? r.equipment : null;
        const key = `${r.name}::${eqNorm ?? ""}`;
        if (!exerciseSet.has(key)) {
          exerciseSet.add(key);
          list.push({ name: r.name, equipment: eqNorm });
        }
      }
    }
    return list.sort((a, b) => a.name.localeCompare(b.name) || (a.equipment ?? "").localeCompare(b.equipment ?? ""));
  }

  getStats(userId: number) {
    this.cleanupEmptySessions(userId, 300);
    const lastSession = db.select()
      .from(workoutSessions)
      .where(and(eq(workoutSessions.userId, userId), sql`${workoutSessions.completedAt} IS NOT NULL`))
      .orderBy(desc(workoutSessions.completedAt))
      .limit(1)
      .get();

    let daysAgo: number | null = null;
    if (lastSession && lastSession.completedAt) {
      const completedDate = new Date(lastSession.completedAt.includes("T") ? lastSession.completedAt : lastSession.completedAt.replace(" ", "T") + "Z");
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
        const startedTime = new Date(s.startedAt.includes("T") ? s.startedAt : s.startedAt.replace(" ", "T") + "Z").getTime();
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

