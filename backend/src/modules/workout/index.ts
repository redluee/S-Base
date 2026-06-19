import { eq, and, like, desc, asc, sql } from "drizzle-orm";
import db from "../../db/client";
import {
  workoutTemplates,
  templateExercises,
  workoutSessions,
  sessionExercises,
  sessionSets,
} from "../../db/schema";

export class WorkoutService {
  listTemplates() {
    return db.select().from(workoutTemplates).orderBy(desc(workoutTemplates.createdAt)).all();
  }

  getTemplate(id: number) {
    const template = db.select().from(workoutTemplates).where(eq(workoutTemplates.templateId, id)).get();
    if (!template) return null;

    const exercises = db.select()
      .from(templateExercises)
      .where(eq(templateExercises.templateId, id))
      .orderBy(templateExercises.sortOrder)
      .all();

    return { ...template, exercises };
  }

  createTemplate(data: {
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
    }[];
  }) {
    const template = db.insert(workoutTemplates).values({
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
        }).run();
      }
    }

    return this.getTemplate(template.templateId);
  }

  updateTemplate(id: number, data: {
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
    }[];
  }) {
    const existing = db.select().from(workoutTemplates).where(eq(workoutTemplates.templateId, id)).get();
    if (!existing) return null;

    db.update(workoutTemplates).set({
      name: data.name ?? existing.name,
      description: data.description ?? existing.description,
      targetMuscleGroups: data.targetMuscleGroups !== undefined ? data.targetMuscleGroups : existing.targetMuscleGroups,
      estimatedTime: data.estimatedTime !== undefined ? data.estimatedTime : existing.estimatedTime,
    }).where(eq(workoutTemplates.templateId, id)).run();

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
        }).run();
      }
    }

    return this.getTemplate(id);
  }

  deleteTemplate(id: number) {
    const existing = db.select().from(workoutTemplates).where(eq(workoutTemplates.templateId, id)).get();
    if (!existing) return null;
    db.delete(workoutTemplates).where(eq(workoutTemplates.templateId, id)).run();
    return { deleted: true };
  }

  listSessions(userId: number, status?: string) {
    this.cleanupEmptySessions(userId, 300);
    const conditions = [eq(workoutSessions.userId, userId)];

    if (status === "active") {
      conditions.push(sql`completed_at IS NULL`);
    } else if (status === "completed") {
      conditions.push(sql`completed_at IS NOT NULL`);
    }

    return db.select().from(workoutSessions)
      .where(and(...conditions))
      .orderBy(desc(workoutSessions.startedAt))
      .all();
  }

  getSession(id: number) {
    const session = db.select().from(workoutSessions).where(eq(workoutSessions.sessionId, id)).get();
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
        templateEx = db.select()
          .from(templateExercises)
          .where(eq(templateExercises.exerciseName, ex.exerciseName))
          .limit(1)
          .get();
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
        } : null
      };
    });

    return { ...session, exercises: sessionWithSets };
  }

  createSession(userId: number, templateId?: number) {
    this.cleanupEmptySessions(userId, 0);
    let sessionName = "Vrije training";
    if (templateId) {
      const template = db.select().from(workoutTemplates).where(eq(workoutTemplates.templateId, templateId)).get();
      if (template) {
        sessionName = template.name;
      }
    }

    const session = db.insert(workoutSessions).values({
      userId,
      templateId: templateId ?? null,
      name: sessionName,
      startedAt: new Date().toISOString(),
    }).returning().get();

    if (templateId) {
      const template = this.getTemplate(templateId);
      if (template?.exercises) {
        for (const tex of template.exercises) {
          const se = db.insert(sessionExercises).values({
            sessionId: session.sessionId,
            exerciseName: tex.exerciseName,
            sortOrder: tex.sortOrder,
            category: tex.category ?? "resistance",
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

    return this.getSession(session.sessionId);
  }

  updateSession(id: number, data: {
    name?: string;
    notes?: string;
    completedAt?: string;
    exercises?: {
      sessionExerciseId?: number;
      exerciseName: string;
      sortOrder: number;
      category?: string;
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
    const existing = db.select().from(workoutSessions).where(eq(workoutSessions.sessionId, id)).get();
    if (!existing) return null;

    const updateFields: any = {};
    if (data.name !== undefined) updateFields.name = data.name;
    if (data.notes !== undefined) updateFields.notes = data.notes;
    if (data.completedAt !== undefined) updateFields.completedAt = data.completedAt;

    if (Object.keys(updateFields).length > 0) {
      db.update(workoutSessions).set(updateFields).where(eq(workoutSessions.sessionId, id)).run();
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

    return this.getSession(id);
  }

  completeSession(id: number, completedAt?: string) {
    const existing = db.select().from(workoutSessions).where(eq(workoutSessions.sessionId, id)).get();
    if (!existing) return null;

    db.update(workoutSessions).set({
      completedAt: completedAt ?? new Date().toISOString(),
    }).where(eq(workoutSessions.sessionId, id)).run();

    return this.getSession(id);
  }

  deleteSession(id: number) {
    const existing = db.select().from(workoutSessions).where(eq(workoutSessions.sessionId, id)).get();
    if (!existing) return null;
    db.delete(workoutSessions).where(eq(workoutSessions.sessionId, id)).run();
    return { deleted: true };
  }

  suggestExercises(q: string) {
    const fromTemplates = db.select({
      name: templateExercises.exerciseName,
      category: templateExercises.category,
      defaultSets: templateExercises.defaultSets,
      defaultReps: templateExercises.defaultReps,
    })
      .from(templateExercises)
      .where(like(templateExercises.exerciseName, `%${q}%`))
      .limit(10)
      .all();

    const fromSessions = db.select({
      name: sessionExercises.exerciseName,
      category: sessionExercises.category,
    })
      .from(sessionExercises)
      .where(like(sessionExercises.exerciseName, `%${q}%`))
      .limit(10)
      .all();

    const exerciseMap = new Map<string, { category: string; defaultSets: number | null; defaultReps: number | null }>();

    for (const r of fromTemplates) {
      if (!exerciseMap.has(r.name)) {
        exerciseMap.set(r.name, { category: r.category ?? "resistance", defaultSets: r.defaultSets, defaultReps: r.defaultReps });
      }
    }

    for (const r of fromSessions) {
      if (!exerciseMap.has(r.name)) {
        exerciseMap.set(r.name, { category: r.category ?? "resistance", defaultSets: null, defaultReps: null });
      }
    }

    return Array.from(exerciseMap.entries()).map(([name, data]) => ({
      type: "exercise" as const,
      value: name,
      category: data.category,
      defaultSets: data.defaultSets,
      defaultReps: data.defaultReps,
    }));
  }

  exerciseProgress(name: string) {
    const rows = db.select({
      sessionId: workoutSessions.sessionId,
      startedAt: workoutSessions.startedAt,
      exerciseName: sessionExercises.exerciseName,
      category: sessionExercises.category,
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
      .where(and(
        eq(sessionExercises.exerciseName, name),
        sql`${workoutSessions.completedAt} IS NOT NULL`,
      ))
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
      sessions: Object.entries(sessions).map(([id, s]) => ({
        sessionId: Number(id),
        startedAt: s.startedAt,
        sets: s.sets,
      })),
    };
  }

  listUniqueExercises(userId: number) {
    this.cleanupEmptySessions(userId, 300);
    const fromTemplates = db.select({ name: templateExercises.exerciseName })
      .from(templateExercises)
      .all();
    const fromSessions = db.select({ name: sessionExercises.exerciseName })
      .from(sessionExercises)
      .all();
    const names = new Set<string>();
    for (const r of fromTemplates) {
      if (r.name) names.add(r.name);
    }
    for (const r of fromSessions) {
      if (r.name) names.add(r.name);
    }
    return Array.from(names).sort();
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

