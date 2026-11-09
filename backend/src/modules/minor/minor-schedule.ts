import { and, asc, eq } from "drizzle-orm";
import db from "../../db/client";
import { minorVacations } from "../../db/schema";
import type { MinorVacation } from "../../types/shared";
import { orNotFound, ValidationError } from "../../utils/errors";
import { addDays, formatDate, parseDate } from "./minor-helpers";

export interface VacationInput {
  name?: string;
  startDate?: string;
  endDate?: string;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class MinorSchedule {
  listVacations(userId: number): MinorVacation[] {
    return db
      .select()
      .from(minorVacations)
      .where(eq(minorVacations.userId, userId))
      .orderBy(asc(minorVacations.startDate))
      .all();
  }

  createVacation(userId: number, data: { name: string; startDate: string; endDate: string }) {
    if (!data.name.trim()) throw new ValidationError("minor.vacationNameRequired");
    if (!data.startDate || !data.endDate) throw new ValidationError("minor.vacationDatesRequired");
    return db
      .insert(minorVacations)
      .values({
        userId,
        name: data.name.trim(),
        startDate: data.startDate,
        endDate: data.endDate,
      })
      .returning()
      .get();
  }

  updateVacation(id: number, userId: number, data: VacationInput) {
    const existing = this.requireVacation(id, userId);
    return db
      .update(minorVacations)
      .set({
        name: data.name?.trim() ?? existing.name,
        startDate: data.startDate ?? existing.startDate,
        endDate: data.endDate ?? existing.endDate,
      })
      .where(eq(minorVacations.id, id))
      .returning()
      .get();
  }

  removeVacation(id: number, userId: number) {
    this.requireVacation(id, userId);
    db.delete(minorVacations).where(eq(minorVacations.id, id)).run();
    return { success: true };
  }

  calculateSprintDates(userId: number, startDateStr?: string, durationDays?: number) {
    const startInput = startDateStr || new Date().toISOString().slice(0, 10);
    if (!DATE_PATTERN.test(startInput)) throw new ValidationError("minor.invalidDate");
    const duration = durationDays || 14;
    const vacations = this.listVacations(userId);
    const start = parseDate(startInput);
    let extendedDays = 0;
    const overlappingVacationNames: string[] = [];

    let currentEnd = addDays(start, duration - 1);
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
        currentEnd = addDays(start, duration + extendedDays - 1);
      }
    }

    let showAndGrow = new Date(currentEnd);
    while (showAndGrow.getDay() !== 3) {
      showAndGrow = addDays(showAndGrow, -1);
    }
    if (showAndGrow < start) {
      showAndGrow = new Date(start);
      while (showAndGrow.getDay() !== 3) {
        showAndGrow = addDays(showAndGrow, 1);
      }
    }

    return {
      startDate: formatDate(start),
      endDate: formatDate(currentEnd),
      durationDays: durationDays ?? 14,
      extendedDays,
      extensionReason: overlappingVacationNames.length > 0 ? overlappingVacationNames.join(", ") : null,
      showAndGrowDate: formatDate(showAndGrow),
    };
  }

  private requireVacation(id: number, userId: number) {
    return orNotFound(
      db
        .select()
        .from(minorVacations)
        .where(and(eq(minorVacations.id, id), eq(minorVacations.userId, userId)))
        .get(),
      "minor.vacationNotFound",
    );
  }
}
