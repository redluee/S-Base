import {
  eq,
  and,
  asc,
} from "drizzle-orm";
import db from "../../db/client";
import {
  minorVacations,
  minorStoryTypes,
} from "../../db/schema";
import type {
  MinorVacation,
  MinorStoryType,
} from "../../types/shared";
import {
  DEFAULT_STORY_TYPES,
  parseDefaultQualityCriteria,
  formatDate,
  parseDate,
  addDays,
} from "./minor-helpers";
import {
  PublishNotifier,
} from "./publish-notifier";

export class MinorScheduleService {
  protected notifier = new PublishNotifier();

  listVacations(userId: number): MinorVacation[] {
    return db.select().from(minorVacations).where(eq(minorVacations.userId, userId)).orderBy(asc(minorVacations.startDate)).all();
  }

  createVacation(userId: number, data: { name: string; startDate: string; endDate: string }) {
    if (!data.name?.trim()) throw new Error("Vacation name is required");
    if (!data.startDate || !data.endDate) throw new Error("Start and end dates are required");
    return db.insert(minorVacations).values({
      userId,
      name: data.name.trim(),
      startDate: data.startDate,
      endDate: data.endDate,
    }).returning().get();
  }

  updateVacation(id: number, userId: number, data: { name?: string; startDate?: string; endDate?: string }) {
    const existing = db.select().from(minorVacations).where(and(eq(minorVacations.id, id), eq(minorVacations.userId, userId))).get();
    if (!existing) return null;
    return db.update(minorVacations).set({
      name: data.name?.trim() ?? existing.name,
      startDate: data.startDate ?? existing.startDate,
      endDate: data.endDate ?? existing.endDate,
    }).where(eq(minorVacations.id, id)).returning().get();
  }

  deleteVacation(id: number, userId: number) {
    const existing = db.select().from(minorVacations).where(and(eq(minorVacations.id, id), eq(minorVacations.userId, userId))).get();
    if (!existing) return null;
    db.delete(minorVacations).where(eq(minorVacations.id, id)).run();
    return { success: true };
  }

  calculateSprintDates(userId: number, startDateStr: string, durationDays: number = 14) {
    const vacations = this.listVacations(userId);
    let start = parseDate(startDateStr);
    let effectiveDuration = durationDays;
    let extendedDays = 0;
    const overlappingVacationNames: string[] = [];

    let currentEnd = addDays(start, effectiveDuration - 1);
    let hasChanged = true;
    const countedVacationDates = new Set<string>();

    while (hasChanged) {
      hasChanged = false;
      for (const vac of vacations) {
        const vacStart = parseDate(vac.startDate);
        const vacEnd = parseDate(vac.endDate);

        const overlapStart = start > vacStart ? start : vacStart;
        const overlapEnd = currentEnd < vacEnd ? currentEnd : vacEnd;

        if (overlapStart <= overlapEnd) {
          if (!overlappingVacationNames.includes(vac.name)) {
            overlappingVacationNames.push(vac.name);
          }

          let cur = new Date(overlapStart);
          while (cur <= overlapEnd) {
            const dateKey = formatDate(cur);
            if (!countedVacationDates.has(dateKey)) {
              countedVacationDates.add(dateKey);
              extendedDays++;
              hasChanged = true;
            }
            cur = addDays(cur, 1);
          }
        }
      }

      if (hasChanged) {
        currentEnd = addDays(start, effectiveDuration + extendedDays - 1);
      }
    }

    // Calculate Show & Grow date (Wednesday in the last week of the sprint)
    // Find the Wednesday before or on currentEnd
    let showAndGrow = new Date(currentEnd);
    while (showAndGrow.getDay() !== 3) {
      // 3 is Wednesday (0 is Sun, 1 is Mon, 2 is Tue, 3 is Wed)
      showAndGrow = addDays(showAndGrow, -1);
    }
    // If calculated Wednesday is before sprint start, adjust forward to next Wednesday
    if (showAndGrow < start) {
      showAndGrow = new Date(start);
      while (showAndGrow.getDay() !== 3) {
        showAndGrow = addDays(showAndGrow, 1);
      }
    }

    return {
      startDate: formatDate(start),
      endDate: formatDate(currentEnd),
      durationDays,
      extendedDays,
      extensionReason: overlappingVacationNames.length > 0 ? overlappingVacationNames.join(", ") : null,
      showAndGrowDate: formatDate(showAndGrow),
    };
  }

  // --- Story Types ---

  listStoryTypes(userId: number): MinorStoryType[] {
    const dbTypes = db.select().from(minorStoryTypes).where(eq(minorStoryTypes.userId, userId)).all();
    const dbCodeMap = new Map<string, typeof dbTypes[0]>();
    dbTypes.forEach((t) => dbCodeMap.set(t.code, t));

    const defaults: MinorStoryType[] = DEFAULT_STORY_TYPES.map((d, idx) => {
      const override = dbCodeMap.get(d.code);
      if (override) {
        return {
          id: override.id,
          userId: override.userId,
          code: override.code,
          name: override.name,
          description: override.description,
          color: override.color,
          isDefault: true,
          defaultQualityCriteria: parseDefaultQualityCriteria(override.defaultQualityCriteria),
          createdAt: override.createdAt,
        };
      }
      return {
        id: -(idx + 1),
        userId,
        code: d.code,
        name: d.name,
        description: d.description,
        color: d.color,
        isDefault: true,
        defaultQualityCriteria: d.defaultQualityCriteria,
        createdAt: new Date().toISOString(),
      };
    });

    const customTypes: MinorStoryType[] = dbTypes
      .filter((t) => !DEFAULT_STORY_TYPES.some((d) => d.code === t.code))
      .map((t) => ({
        id: t.id,
        userId: t.userId,
        code: t.code,
        name: t.name,
        description: t.description,
        color: t.color,
        isDefault: Boolean(t.isDefault),
        defaultQualityCriteria: parseDefaultQualityCriteria(t.defaultQualityCriteria),
        createdAt: t.createdAt,
      }));

    return [...defaults, ...customTypes];
  }

  createStoryType(userId: number, data: {
    code: string;
    name: string;
    description?: string;
    color?: string;
    defaultQualityCriteria?: ({ text: string; indent?: number } | string)[];
  }): MinorStoryType {
    if (!data.code?.trim() || !data.name?.trim()) {
      throw new Error("Code and name are required");
    }
    const cleanCode = data.code.trim().toUpperCase();
    const criteriaJson = data.defaultQualityCriteria
      ? JSON.stringify(
          data.defaultQualityCriteria
            .map((c) => (typeof c === "string" ? { text: c.trim(), indent: 0 } : { text: c.text.trim(), indent: c.indent ? 1 : 0 }))
            .filter((c) => c.text)
        )
      : "[]";

    const row = db.insert(minorStoryTypes).values({
      userId,
      code: cleanCode,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      color: data.color || "brand",
      isDefault: false,
      defaultQualityCriteria: criteriaJson,
    }).returning().get();

    return {
      id: row.id,
      userId: row.userId,
      code: row.code,
      name: row.name,
      description: row.description,
      color: row.color,
      isDefault: Boolean(row.isDefault),
      defaultQualityCriteria: parseDefaultQualityCriteria(row.defaultQualityCriteria),
      createdAt: row.createdAt,
    };
  }

  updateStoryType(id: number, userId: number, data: {
    code?: string;
    name?: string;
    description?: string;
    color?: string;
    defaultQualityCriteria?: ({ text: string; indent?: number } | string)[];
  }): MinorStoryType | null {
    const criteriaJson = data.defaultQualityCriteria !== undefined
      ? JSON.stringify(
          data.defaultQualityCriteria
            .map((c) => (typeof c === "string" ? { text: c.trim(), indent: 0 } : { text: c.text.trim(), indent: c.indent ? 1 : 0 }))
            .filter((c) => c.text)
        )
      : undefined;

    if (id <= 0) {
      const defaultIdx = Math.abs(id) - 1;
      const defaultDef = DEFAULT_STORY_TYPES[defaultIdx] || DEFAULT_STORY_TYPES.find((d) => d.code === data.code?.trim().toUpperCase());
      if (!defaultDef) throw new Error("Story type not found");

      const code = defaultDef.code;
      const name = data.name?.trim() || defaultDef.name;
      const description = data.description !== undefined ? (data.description?.trim() || null) : defaultDef.description;
      const color = data.color || defaultDef.color;
      const finalCriteriaJson = criteriaJson !== undefined ? criteriaJson : JSON.stringify(defaultDef.defaultQualityCriteria);

      const row = db.insert(minorStoryTypes).values({
        userId,
        code,
        name,
        description,
        color,
        isDefault: true,
        defaultQualityCriteria: finalCriteriaJson,
      }).returning().get();

      return {
        id: row.id,
        userId: row.userId,
        code: row.code,
        name: row.name,
        description: row.description,
        color: row.color,
        isDefault: true,
        defaultQualityCriteria: parseDefaultQualityCriteria(row.defaultQualityCriteria),
        createdAt: row.createdAt,
      };
    }

    const existing = db.select().from(minorStoryTypes).where(and(eq(minorStoryTypes.id, id), eq(minorStoryTypes.userId, userId))).get();
    if (!existing) return null;

    const isDefaultCode = DEFAULT_STORY_TYPES.some((d) => d.code === existing.code);

    const updated = db.update(minorStoryTypes).set({
      code: data.code && !isDefaultCode ? data.code.trim().toUpperCase() : existing.code,
      name: data.name?.trim() ?? existing.name,
      description: data.description !== undefined ? (data.description?.trim() || null) : existing.description,
      color: data.color ?? existing.color,
      defaultQualityCriteria: criteriaJson !== undefined ? criteriaJson : existing.defaultQualityCriteria,
    }).where(eq(minorStoryTypes.id, id)).returning().get();

    return {
      id: updated.id,
      userId: updated.userId,
      code: updated.code,
      name: updated.name,
      description: updated.description,
      color: updated.color,
      isDefault: Boolean(updated.isDefault || isDefaultCode),
      defaultQualityCriteria: parseDefaultQualityCriteria(updated.defaultQualityCriteria),
      createdAt: updated.createdAt,
    };
  }

  deleteStoryType(id: number, userId: number) {
    if (id <= 0) return null; // Default virtual types cannot be deleted
    const existing = db.select().from(minorStoryTypes).where(and(eq(minorStoryTypes.id, id), eq(minorStoryTypes.userId, userId))).get();
    if (!existing) return null;
    db.delete(minorStoryTypes).where(eq(minorStoryTypes.id, id)).run();
    return { success: true };
  }
}
