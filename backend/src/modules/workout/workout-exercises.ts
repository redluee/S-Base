import { eq, and, sql } from "drizzle-orm";
import db from "../../db/client";
import { workoutTemplates, templateExercises, workoutSessions, sessionExercises, sessionSets } from "../../db/schema";
import { ValidationError } from "../../utils/errors";
import { exerciseKey } from "./workout-helpers";

export class WorkoutExercises {
  list(userId: number) {
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

  progress(userId: number, name: string, equipment?: string) {
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

  merge(userId: number, sourceName: string, targetName: string) {
    const sName = typeof sourceName === "string" ? sourceName.trim() : "";
    const tName = typeof targetName === "string" ? targetName.trim() : "";

    if (!sName || !tName) {
      throw new ValidationError("workout.exerciseNamesRequired");
    }
    if (sName === tName) {
      throw new ValidationError("workout.exerciseNamesSame");
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
}
