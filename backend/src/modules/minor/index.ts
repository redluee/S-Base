import { eq, and, desc, asc, inArray, sql } from "drizzle-orm";
import db from "../../db/client";
import {
  minorSprints,
  minorStories,
  minorStoryCriteria,
  minorStoryEvidence,
  minorSelfEvaluations,
  minorTeacherAssessments,
  minorFeedbackEntries,
  minorReflections,
  minorVacations,
  minorStoryTypes,
  minorPeerHelp,
} from "../../db/schema";
import type {
  MinorSprint,
  MinorSprintFull,
  MinorStory,
  MinorStoryCriterion,
  MinorStoryEvidence,
  MinorSelfEvaluation,
  MinorTeacherAssessment,
  MinorFeedbackEntry,
  MinorReflection,
  MinorVacation,
  MinorStoryType,
  MinorPeerHelp,
  MinorDashboardStats,
} from "../../types/shared";

export const DEFAULT_STORY_TYPES = [
  { code: "US", name: "User Story", description: "Standaard functionele user story", color: "brand", isDefault: true },
  { code: "RS", name: "Research Story", description: "Onderzoek en analyse story", color: "blue", isDefault: true },
  { code: "LS", name: "Learning Story", description: "Persoonlijk leertraject story", color: "purple", isDefault: true },
];

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export class MinorService {
  // --- Vacation & Date Calculation Engine ---

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
    const customTypes = db.select().from(minorStoryTypes).where(eq(minorStoryTypes.userId, userId)).all();
    const defaults: MinorStoryType[] = DEFAULT_STORY_TYPES.map((d, idx) => ({
      id: -(idx + 1),
      userId,
      code: d.code,
      name: d.name,
      description: d.description,
      color: d.color,
      isDefault: true,
      createdAt: new Date().toISOString(),
    }));

    return [...defaults, ...customTypes];
  }

  createStoryType(userId: number, data: { code: string; name: string; description?: string; color?: string }) {
    if (!data.code?.trim() || !data.name?.trim()) {
      throw new Error("Code and name are required");
    }
    const cleanCode = data.code.trim().toUpperCase();
    return db.insert(minorStoryTypes).values({
      userId,
      code: cleanCode,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      color: data.color || "brand",
      isDefault: false,
    }).returning().get();
  }

  deleteStoryType(id: number, userId: number) {
    if (id <= 0) return null; // Default types cannot be deleted
    const existing = db.select().from(minorStoryTypes).where(and(eq(minorStoryTypes.id, id), eq(minorStoryTypes.userId, userId))).get();
    if (!existing) return null;
    db.delete(minorStoryTypes).where(eq(minorStoryTypes.id, id)).run();
    return { success: true };
  }

  // --- Sprints ---

  getNextSprintNumber(userId: number): { nextNumber: string; nextName: string } {
    const sprints = db.select().from(minorSprints).where(eq(minorSprints.userId, userId)).all();
    if (sprints.length === 0) {
      return { nextNumber: "1", nextName: "Sprint 1" };
    }

    let maxNum = 0;
    for (const s of sprints) {
      const match = s.sprintNumber.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    const next = maxNum + 1;
    return { nextNumber: String(next), nextName: `Sprint ${next}` };
  }

  listSprints(userId: number): MinorSprint[] {
    return db.select().from(minorSprints).where(eq(minorSprints.userId, userId)).orderBy(asc(minorSprints.startDate), asc(minorSprints.id)).all() as MinorSprint[];
  }

  getSprintById(id: number, userId: number): MinorSprintFull | null {
    const sprint = db.select().from(minorSprints).where(and(eq(minorSprints.id, id), eq(minorSprints.userId, userId))).get() as MinorSprint | undefined;
    if (!sprint) return null;

    const storiesRaw = db.select().from(minorStories).where(eq(minorStories.sprintId, id)).orderBy(asc(minorStories.orderIndex), asc(minorStories.id)).all();
    const storyIds = storiesRaw.map((s) => s.id);

    const criteria = storyIds.length > 0
      ? db.select().from(minorStoryCriteria).where(inArray(minorStoryCriteria.storyId, storyIds)).orderBy(asc(minorStoryCriteria.orderIndex)).all()
      : [];

    const evidence = storyIds.length > 0
      ? db.select().from(minorStoryEvidence).where(inArray(minorStoryEvidence.storyId, storyIds)).orderBy(asc(minorStoryEvidence.id)).all()
      : [];

    const stories: MinorStory[] = storiesRaw.map((s) => {
      let outcomes: number[] = [];
      try {
        outcomes = JSON.parse(s.learningOutcomes);
      } catch {
        outcomes = [];
      }
      return {
        id: s.id,
        sprintId: s.sprintId,
        userId: s.userId,
        storyTypeCode: s.storyTypeCode,
        storyNumber: s.storyNumber,
        title: s.title,
        asA: s.asA,
        iWant: s.iWant,
        soThat: s.soThat,
        learningOutcomes: outcomes,
        status: s.status as "todo" | "in_progress" | "done",
        orderIndex: s.orderIndex,
        createdAt: s.createdAt,
        criteria: criteria.filter((c) => c.storyId === s.id).map((c) => ({
          id: c.id,
          storyId: c.storyId,
          type: c.type as "acceptance" | "quality",
          orderIndex: c.orderIndex,
          text: c.text,
          isCompleted: Boolean(c.isCompleted),
        })),
        evidence: evidence.filter((e) => e.storyId === s.id).map((e) => ({
          id: e.id,
          storyId: e.storyId,
          type: e.type as "link" | "github" | "document" | "app",
          title: e.title,
          url: e.url,
          createdAt: e.createdAt,
        })),
      };
    });

    let selfEvaluations = db.select().from(minorSelfEvaluations).where(eq(minorSelfEvaluations.sprintId, id)).orderBy(asc(minorSelfEvaluations.learningOutcome)).all() as MinorSelfEvaluation[];
    if (selfEvaluations.length === 0) {
      this.initSelfEvaluationsAndAssessments(id);
      selfEvaluations = db.select().from(minorSelfEvaluations).where(eq(minorSelfEvaluations.sprintId, id)).orderBy(asc(minorSelfEvaluations.learningOutcome)).all() as MinorSelfEvaluation[];
    }

    let teacherAssessments = db.select().from(minorTeacherAssessments).where(eq(minorTeacherAssessments.sprintId, id)).orderBy(asc(minorTeacherAssessments.learningOutcome)).all() as MinorTeacherAssessment[];
    if (teacherAssessments.length === 0) {
      this.initSelfEvaluationsAndAssessments(id);
      teacherAssessments = db.select().from(minorTeacherAssessments).where(eq(minorTeacherAssessments.sprintId, id)).orderBy(asc(minorTeacherAssessments.learningOutcome)).all() as MinorTeacherAssessment[];
    }

    const feedback = db.select().from(minorFeedbackEntries).where(eq(minorFeedbackEntries.sprintId, id)).orderBy(asc(minorFeedbackEntries.orderIndex), asc(minorFeedbackEntries.date)).all() as MinorFeedbackEntry[];
    const reflection = db.select().from(minorReflections).where(eq(minorReflections.sprintId, id)).get() as MinorReflection | null;

    return {
      ...sprint,
      stories,
      selfEvaluations,
      teacherAssessments,
      feedback,
      reflection,
    };
  }

  createSprint(userId: number, data: {
    sprintNumber?: string;
    name?: string;
    startDate: string;
    endDate?: string;
    durationDays?: number;
    showAndGrowDate?: string;
    status?: "planned" | "active" | "completed" | "archived";
  }): MinorSprint {
    const calc = this.calculateSprintDates(userId, data.startDate, data.durationDays ?? 14);
    const nextInfo = this.getNextSprintNumber(userId);

    const sprintNumber = data.sprintNumber?.trim() || nextInfo.nextNumber;
    const name = data.name?.trim() || `Sprint ${sprintNumber}`;

    const sprint = db.insert(minorSprints).values({
      userId,
      sprintNumber,
      name,
      startDate: data.startDate,
      endDate: data.endDate || calc.endDate,
      durationDays: data.durationDays ?? calc.durationDays,
      showAndGrowDate: data.showAndGrowDate || calc.showAndGrowDate,
      extendedDays: calc.extendedDays,
      extensionReason: calc.extensionReason,
      status: data.status || "active",
    }).returning().get() as MinorSprint;

    this.initSelfEvaluationsAndAssessments(sprint.id);

    return sprint;
  }

  private initSelfEvaluationsAndAssessments(sprintId: number) {
    for (let lu = 1; lu <= 5; lu++) {
      const existingEval = db.select().from(minorSelfEvaluations).where(and(eq(minorSelfEvaluations.sprintId, sprintId), eq(minorSelfEvaluations.learningOutcome, lu))).get();
      if (!existingEval) {
        db.insert(minorSelfEvaluations).values({
          sprintId,
          learningOutcome: lu,
          level: "-",
          argumentation: "",
        }).run();
      }

      const existingAssess = db.select().from(minorTeacherAssessments).where(and(eq(minorTeacherAssessments.sprintId, sprintId), eq(minorTeacherAssessments.learningOutcome, lu))).get();
      if (!existingAssess) {
        db.insert(minorTeacherAssessments).values({
          sprintId,
          learningOutcome: lu,
          assessment: "-",
          notes: "",
        }).run();
      }
    }

    const existingReflect = db.select().from(minorReflections).where(eq(minorReflections.sprintId, sprintId)).get();
    if (!existingReflect) {
      db.insert(minorReflections).values({
        sprintId,
        date: formatDate(new Date()),
        whatLearned: "",
        whatRetained: "",
        whatChange: "",
      }).run();
    }
  }

  updateSprint(id: number, userId: number, data: Partial<{
    sprintNumber: string;
    name: string;
    startDate: string;
    endDate: string;
    durationDays: number;
    showAndGrowDate: string;
    extendedDays: number;
    extensionReason: string | null;
    status: "planned" | "active" | "completed" | "archived";
  }>): MinorSprint | null {
    const existing = db.select().from(minorSprints).where(and(eq(minorSprints.id, id), eq(minorSprints.userId, userId))).get();
    if (!existing) return null;

    let extendedDays = data.extendedDays ?? existing.extendedDays;
    let extensionReason = data.extensionReason !== undefined ? data.extensionReason : existing.extensionReason;
    let endDate = data.endDate ?? existing.endDate;
    let showAndGrowDate = data.showAndGrowDate ?? existing.showAndGrowDate;

    // Recalculate if startDate or duration changed and not explicitly overridden
    if (data.startDate && data.startDate !== existing.startDate && !data.endDate) {
      const calc = this.calculateSprintDates(userId, data.startDate, data.durationDays ?? existing.durationDays);
      endDate = calc.endDate;
      showAndGrowDate = calc.showAndGrowDate;
      extendedDays = calc.extendedDays;
      extensionReason = calc.extensionReason;
    }

    const updated = db.update(minorSprints).set({
      sprintNumber: data.sprintNumber?.trim() ?? existing.sprintNumber,
      name: data.name?.trim() ?? existing.name,
      startDate: data.startDate ?? existing.startDate,
      endDate,
      durationDays: data.durationDays ?? existing.durationDays,
      showAndGrowDate,
      extendedDays,
      extensionReason,
      status: data.status ?? (existing.status as any),
      updatedAt: sql`CURRENT_TIMESTAMP`,
    }).where(eq(minorSprints.id, id)).returning().get();

    return updated as MinorSprint;
  }

  deleteSprint(id: number, userId: number) {
    const existing = db.select().from(minorSprints).where(and(eq(minorSprints.id, id), eq(minorSprints.userId, userId))).get();
    if (!existing) return null;
    db.delete(minorSprints).where(eq(minorSprints.id, id)).run();
    return { success: true };
  }

  // --- Story Management ---

  createStory(userId: number, sprintId: number, data: {
    storyTypeCode?: string;
    storyNumber?: string;
    title: string;
    asA?: string;
    iWant?: string;
    soThat?: string;
    learningOutcomes?: number[];
    status?: "todo" | "in_progress" | "done";
    orderIndex?: number;
    acceptanceCriteria?: { text: string; isCompleted?: boolean }[];
    qualityCriteria?: { text: string; isCompleted?: boolean }[];
    evidence?: { type: "link" | "github" | "document" | "app"; title: string; url: string }[];
  }): MinorStory {
    if (!data.title?.trim()) throw new Error("Story title is required");

    const sprint = db.select().from(minorSprints).where(and(eq(minorSprints.id, sprintId), eq(minorSprints.userId, userId))).get();
    if (!sprint) throw new Error("Sprint not found");

    const storyTypeCode = data.storyTypeCode?.trim().toUpperCase() || "US";
    const learningOutcomes = Array.isArray(data.learningOutcomes) ? data.learningOutcomes : [];

    const storyRow = db.insert(minorStories).values({
      sprintId,
      userId,
      storyTypeCode,
      storyNumber: data.storyNumber?.trim() || null,
      title: data.title.trim(),
      asA: data.asA?.trim() || null,
      iWant: data.iWant?.trim() || null,
      soThat: data.soThat?.trim() || null,
      learningOutcomes: JSON.stringify(learningOutcomes),
      status: data.status || "todo",
      orderIndex: data.orderIndex ?? 0,
    }).returning().get();

    const createdCriteria: MinorStoryCriterion[] = [];
    if (Array.isArray(data.acceptanceCriteria)) {
      data.acceptanceCriteria.forEach((crit, index) => {
        if (crit.text?.trim()) {
          const c = db.insert(minorStoryCriteria).values({
            storyId: storyRow.id,
            type: "acceptance",
            orderIndex: index + 1,
            text: crit.text.trim(),
            isCompleted: Boolean(crit.isCompleted),
          }).returning().get();
          createdCriteria.push({
            id: c.id,
            storyId: c.storyId,
            type: "acceptance",
            orderIndex: c.orderIndex,
            text: c.text,
            isCompleted: Boolean(c.isCompleted),
          });
        }
      });
    }

    if (Array.isArray(data.qualityCriteria)) {
      data.qualityCriteria.forEach((crit, index) => {
        if (crit.text?.trim()) {
          const c = db.insert(minorStoryCriteria).values({
            storyId: storyRow.id,
            type: "quality",
            orderIndex: index + 1,
            text: crit.text.trim(),
            isCompleted: Boolean(crit.isCompleted),
          }).returning().get();
          createdCriteria.push({
            id: c.id,
            storyId: c.storyId,
            type: "quality",
            orderIndex: c.orderIndex,
            text: c.text,
            isCompleted: Boolean(c.isCompleted),
          });
        }
      });
    }

    const createdEvidence: MinorStoryEvidence[] = [];
    if (Array.isArray(data.evidence)) {
      data.evidence.forEach((ev) => {
        if (ev.title?.trim() && ev.url?.trim()) {
          const e = db.insert(minorStoryEvidence).values({
            storyId: storyRow.id,
            type: ev.type || "link",
            title: ev.title.trim(),
            url: ev.url.trim(),
          }).returning().get();
          createdEvidence.push({
            id: e.id,
            storyId: e.storyId,
            type: e.type as any,
            title: e.title,
            url: e.url,
            createdAt: e.createdAt,
          });
        }
      });
    }

    return {
      id: storyRow.id,
      sprintId: storyRow.sprintId,
      userId: storyRow.userId,
      storyTypeCode: storyRow.storyTypeCode,
      storyNumber: storyRow.storyNumber,
      title: storyRow.title,
      asA: storyRow.asA,
      iWant: storyRow.iWant,
      soThat: storyRow.soThat,
      learningOutcomes,
      status: storyRow.status as any,
      orderIndex: storyRow.orderIndex,
      createdAt: storyRow.createdAt,
      criteria: createdCriteria,
      evidence: createdEvidence,
    };
  }

  updateStory(storyId: number, userId: number, data: {
    storyTypeCode?: string;
    storyNumber?: string;
    title?: string;
    asA?: string | null;
    iWant?: string | null;
    soThat?: string | null;
    learningOutcomes?: number[];
    status?: "todo" | "in_progress" | "done";
    orderIndex?: number;
    acceptanceCriteria?: { id?: number; text: string; isCompleted?: boolean }[];
    qualityCriteria?: { id?: number; text: string; isCompleted?: boolean }[];
    evidence?: { id?: number; type: "link" | "github" | "document" | "app"; title: string; url: string }[];
  }): MinorStory | null {
    const existing = db.select().from(minorStories).where(and(eq(minorStories.id, storyId), eq(minorStories.userId, userId))).get();
    if (!existing) return null;

    const storyTypeCode = data.storyTypeCode !== undefined ? data.storyTypeCode.trim().toUpperCase() : existing.storyTypeCode;
    const learningOutcomes = data.learningOutcomes !== undefined ? data.learningOutcomes : JSON.parse(existing.learningOutcomes);

    db.update(minorStories).set({
      storyTypeCode,
      storyNumber: data.storyNumber !== undefined ? (data.storyNumber?.trim() || null) : existing.storyNumber,
      title: data.title?.trim() ?? existing.title,
      asA: data.asA !== undefined ? (data.asA?.trim() || null) : existing.asA,
      iWant: data.iWant !== undefined ? (data.iWant?.trim() || null) : existing.iWant,
      soThat: data.soThat !== undefined ? (data.soThat?.trim() || null) : existing.soThat,
      learningOutcomes: JSON.stringify(learningOutcomes),
      status: data.status ?? (existing.status as any),
      orderIndex: data.orderIndex ?? existing.orderIndex,
    }).where(eq(minorStories.id, storyId)).run();

    if (data.acceptanceCriteria !== undefined || data.qualityCriteria !== undefined) {
      db.delete(minorStoryCriteria).where(eq(minorStoryCriteria.storyId, storyId)).run();

      if (Array.isArray(data.acceptanceCriteria)) {
        data.acceptanceCriteria.forEach((crit, index) => {
          if (crit.text?.trim()) {
            db.insert(minorStoryCriteria).values({
              storyId,
              type: "acceptance",
              orderIndex: index + 1,
              text: crit.text.trim(),
              isCompleted: Boolean(crit.isCompleted),
            }).run();
          }
        });
      }

      if (Array.isArray(data.qualityCriteria)) {
        data.qualityCriteria.forEach((crit, index) => {
          if (crit.text?.trim()) {
            db.insert(minorStoryCriteria).values({
              storyId,
              type: "quality",
              orderIndex: index + 1,
              text: crit.text.trim(),
              isCompleted: Boolean(crit.isCompleted),
            }).run();
          }
        });
      }
    }

    if (data.evidence !== undefined) {
      db.delete(minorStoryEvidence).where(eq(minorStoryEvidence.storyId, storyId)).run();
      if (Array.isArray(data.evidence)) {
        data.evidence.forEach((ev) => {
          if (ev.title?.trim() && ev.url?.trim()) {
            db.insert(minorStoryEvidence).values({
              storyId,
              type: ev.type || "link",
              title: ev.title.trim(),
              url: ev.url.trim(),
            }).run();
          }
        });
      }
    }

    const updated = db.select().from(minorStories).where(eq(minorStories.id, storyId)).get()!;
    const criteria = db.select().from(minorStoryCriteria).where(eq(minorStoryCriteria.storyId, storyId)).orderBy(asc(minorStoryCriteria.orderIndex)).all();
    const evidence = db.select().from(minorStoryEvidence).where(eq(minorStoryEvidence.storyId, storyId)).all();

    return {
      id: updated.id,
      sprintId: updated.sprintId,
      userId: updated.userId,
      storyTypeCode: updated.storyTypeCode,
      storyNumber: updated.storyNumber,
      title: updated.title,
      asA: updated.asA,
      iWant: updated.iWant,
      soThat: updated.soThat,
      learningOutcomes,
      status: updated.status as any,
      orderIndex: updated.orderIndex,
      createdAt: updated.createdAt,
      criteria: criteria.map((c) => ({
        id: c.id,
        storyId: c.storyId,
        type: c.type as any,
        orderIndex: c.orderIndex,
        text: c.text,
        isCompleted: Boolean(c.isCompleted),
      })),
      evidence: evidence.map((e) => ({
        id: e.id,
        storyId: e.storyId,
        type: e.type as any,
        title: e.title,
        url: e.url,
        createdAt: e.createdAt,
      })),
    };
  }

  deleteStory(storyId: number, userId: number) {
    const existing = db.select().from(minorStories).where(and(eq(minorStories.id, storyId), eq(minorStories.userId, userId))).get();
    if (!existing) return null;
    db.delete(minorStories).where(eq(minorStories.id, storyId)).run();
    return { success: true };
  }

  toggleCriterion(criterionId: number, isCompleted: boolean) {
    const c = db.select().from(minorStoryCriteria).where(eq(minorStoryCriteria.id, criterionId)).get();
    if (!c) return null;
    return db.update(minorStoryCriteria).set({
      isCompleted: isCompleted,
    }).where(eq(minorStoryCriteria.id, criterionId)).returning().get();
  }

  // --- Self-Evaluation & Teacher Assessment ---

  autoGenerateSelfEvaluations(sprintId: number, userId: number): MinorSelfEvaluation[] {
    const sprint = this.getSprintById(sprintId, userId);
    if (!sprint) throw new Error("Sprint not found");

    const result: MinorSelfEvaluation[] = [];

    for (let lu = 1; lu <= 5; lu++) {
      const storiesForLu = sprint.stories.filter((s) => s.learningOutcomes.includes(lu));
      const hasStories = storiesForLu.length > 0;
      const defaultLevel = hasStories ? "V" : "-";

      const completedStories = storiesForLu.filter((s) => s.status === "done");
      const inProgressStories = storiesForLu.filter((s) => s.status !== "done");

      const lines: string[] = [];
      if (completedStories.length > 0) {
        lines.push(`Voltooide stories voor LU ${lu}:`);
        for (const st of completedStories) {
          const prefix = st.storyNumber ? `[${st.storyNumber}] ` : "";
          lines.push(`• ${prefix}${st.title}`);
          if (st.evidence && st.evidence.length > 0) {
            for (const ev of st.evidence) {
              lines.push(`   - Bewijs (${ev.type}): ${ev.title} (${ev.url})`);
            }
          }
        }
      }

      if (inProgressStories.length > 0) {
        if (lines.length > 0) lines.push("");
        lines.push(`In uitvoering:`);
        for (const st of inProgressStories) {
          const prefix = st.storyNumber ? `[${st.storyNumber}] ` : "";
          lines.push(`• ${prefix}${st.title}`);
        }
      }

      if (lines.length === 0) {
        lines.push(`Geen stories gekoppeld aan LU ${lu} in deze sprint.`);
      }

      const generatedArgumentation = lines.join("\n");

      const existing = db.select().from(minorSelfEvaluations).where(and(eq(minorSelfEvaluations.sprintId, sprintId), eq(minorSelfEvaluations.learningOutcome, lu))).get();
      if (existing) {
        const updated = db.update(minorSelfEvaluations).set({
          level: defaultLevel,
          argumentation: generatedArgumentation,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        }).where(eq(minorSelfEvaluations.id, existing.id)).returning().get();
        result.push(updated as MinorSelfEvaluation);
      } else {
        const created = db.insert(minorSelfEvaluations).values({
          sprintId,
          learningOutcome: lu,
          level: defaultLevel,
          argumentation: generatedArgumentation,
        }).returning().get();
        result.push(created as MinorSelfEvaluation);
      }
    }

    return result;
  }

  saveSelfEvaluations(sprintId: number, userId: number, items: { learningOutcome: number; level: "V" | "NV" | "-"; argumentation?: string }[]): MinorSelfEvaluation[] {
    const sprint = db.select().from(minorSprints).where(and(eq(minorSprints.id, sprintId), eq(minorSprints.userId, userId))).get();
    if (!sprint) throw new Error("Sprint not found");

    for (const item of items) {
      const existing = db.select().from(minorSelfEvaluations).where(and(eq(minorSelfEvaluations.sprintId, sprintId), eq(minorSelfEvaluations.learningOutcome, item.learningOutcome))).get();
      if (existing) {
        db.update(minorSelfEvaluations).set({
          level: item.level,
          argumentation: item.argumentation ?? existing.argumentation,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        }).where(eq(minorSelfEvaluations.id, existing.id)).run();
      } else {
        db.insert(minorSelfEvaluations).values({
          sprintId,
          learningOutcome: item.learningOutcome,
          level: item.level,
          argumentation: item.argumentation || "",
        }).run();
      }
    }

    return db.select().from(minorSelfEvaluations).where(eq(minorSelfEvaluations.sprintId, sprintId)).orderBy(asc(minorSelfEvaluations.learningOutcome)).all() as MinorSelfEvaluation[];
  }

  saveTeacherAssessments(sprintId: number, userId: number, items: { learningOutcome: number; assessment: "V" | "O" | "-"; notes?: string; evaluatedAt?: string }[]): MinorTeacherAssessment[] {
    const sprint = db.select().from(minorSprints).where(and(eq(minorSprints.id, sprintId), eq(minorSprints.userId, userId))).get();
    if (!sprint) throw new Error("Sprint not found");

    for (const item of items) {
      const existing = db.select().from(minorTeacherAssessments).where(and(eq(minorTeacherAssessments.sprintId, sprintId), eq(minorTeacherAssessments.learningOutcome, item.learningOutcome))).get();
      if (existing) {
        db.update(minorTeacherAssessments).set({
          assessment: item.assessment,
          notes: item.notes !== undefined ? item.notes : existing.notes,
          evaluatedAt: item.evaluatedAt ?? existing.evaluatedAt ?? formatDate(new Date()),
        }).where(eq(minorTeacherAssessments.id, existing.id)).run();
      } else {
        db.insert(minorTeacherAssessments).values({
          sprintId,
          learningOutcome: item.learningOutcome,
          assessment: item.assessment,
          notes: item.notes || "",
          evaluatedAt: item.evaluatedAt || formatDate(new Date()),
        }).run();
      }
    }

    return db.select().from(minorTeacherAssessments).where(eq(minorTeacherAssessments.sprintId, sprintId)).orderBy(asc(minorTeacherAssessments.learningOutcome)).all() as MinorTeacherAssessment[];
  }

  // --- Feedback Entries ---

  listFeedback(sprintId: number): MinorFeedbackEntry[] {
    return db.select().from(minorFeedbackEntries).where(eq(minorFeedbackEntries.sprintId, sprintId)).orderBy(asc(minorFeedbackEntries.orderIndex), asc(minorFeedbackEntries.id)).all() as MinorFeedbackEntry[];
  }

  addFeedback(sprintId: number, data: { date: string; fromWhom: string; feedback: string; action: string; orderIndex?: number }) {
    if (!data.fromWhom?.trim() || !data.feedback?.trim() || !data.action?.trim()) {
      throw new Error("All feedback fields are required");
    }
    return db.insert(minorFeedbackEntries).values({
      sprintId,
      date: data.date || formatDate(new Date()),
      fromWhom: data.fromWhom.trim(),
      feedback: data.feedback.trim(),
      action: data.action.trim(),
      orderIndex: data.orderIndex ?? 0,
    }).returning().get() as MinorFeedbackEntry;
  }

  updateFeedback(id: number, data: { date?: string; fromWhom?: string; feedback?: string; action?: string; orderIndex?: number }) {
    const existing = db.select().from(minorFeedbackEntries).where(eq(minorFeedbackEntries.id, id)).get();
    if (!existing) return null;
    return db.update(minorFeedbackEntries).set({
      date: data.date ?? existing.date,
      fromWhom: data.fromWhom?.trim() ?? existing.fromWhom,
      feedback: data.feedback?.trim() ?? existing.feedback,
      action: data.action?.trim() ?? existing.action,
      orderIndex: data.orderIndex ?? existing.orderIndex,
    }).where(eq(minorFeedbackEntries.id, id)).returning().get() as MinorFeedbackEntry;
  }

  deleteFeedback(id: number) {
    const existing = db.select().from(minorFeedbackEntries).where(eq(minorFeedbackEntries.id, id)).get();
    if (!existing) return null;
    db.delete(minorFeedbackEntries).where(eq(minorFeedbackEntries.id, id)).run();
    return { success: true };
  }

  // --- Reflection ---

  getReflection(sprintId: number): MinorReflection | null {
    return db.select().from(minorReflections).where(eq(minorReflections.sprintId, sprintId)).get() as MinorReflection | null;
  }

  saveReflection(sprintId: number, data: { date?: string; whatLearned?: string; whatRetained?: string; whatChange?: string }): MinorReflection {
    const existing = db.select().from(minorReflections).where(eq(minorReflections.sprintId, sprintId)).get();
    if (existing) {
      return db.update(minorReflections).set({
        date: data.date ?? existing.date,
        whatLearned: data.whatLearned !== undefined ? data.whatLearned : existing.whatLearned,
        whatRetained: data.whatRetained !== undefined ? data.whatRetained : existing.whatRetained,
        whatChange: data.whatChange !== undefined ? data.whatChange : existing.whatChange,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      }).where(eq(minorReflections.id, existing.id)).returning().get() as MinorReflection;
    } else {
      return db.insert(minorReflections).values({
        sprintId,
        date: data.date || formatDate(new Date()),
        whatLearned: data.whatLearned || "",
        whatRetained: data.whatRetained || "",
        whatChange: data.whatChange || "",
      }).returning().get() as MinorReflection;
    }
  }

  // --- Peer Help / Kennisdeling ---

  listPeerHelp(userId: number): MinorPeerHelp[] {
    return db.select().from(minorPeerHelp).where(eq(minorPeerHelp.userId, userId)).orderBy(desc(minorPeerHelp.date), desc(minorPeerHelp.id)).all() as MinorPeerHelp[];
  }

  createPeerHelp(userId: number, data: { sprintId?: number | null; date: string; peerName: string; description: string; links?: string }) {
    if (!data.peerName?.trim() || !data.description?.trim()) {
      throw new Error("Peer name and description are required");
    }
    return db.insert(minorPeerHelp).values({
      userId,
      sprintId: data.sprintId ?? null,
      date: data.date || formatDate(new Date()),
      peerName: data.peerName.trim(),
      description: data.description.trim(),
      links: data.links?.trim() || null,
    }).returning().get() as MinorPeerHelp;
  }

  updatePeerHelp(id: number, userId: number, data: { sprintId?: number | null; date?: string; peerName?: string; description?: string; links?: string }) {
    const existing = db.select().from(minorPeerHelp).where(and(eq(minorPeerHelp.id, id), eq(minorPeerHelp.userId, userId))).get();
    if (!existing) return null;
    return db.update(minorPeerHelp).set({
      sprintId: data.sprintId !== undefined ? data.sprintId : existing.sprintId,
      date: data.date ?? existing.date,
      peerName: data.peerName?.trim() ?? existing.peerName,
      description: data.description?.trim() ?? existing.description,
      links: data.links !== undefined ? (data.links?.trim() || null) : existing.links,
    }).where(eq(minorPeerHelp.id, id)).returning().get() as MinorPeerHelp;
  }

  deletePeerHelp(id: number, userId: number) {
    const existing = db.select().from(minorPeerHelp).where(and(eq(minorPeerHelp.id, id), eq(minorPeerHelp.userId, userId))).get();
    if (!existing) return null;
    db.delete(minorPeerHelp).where(eq(minorPeerHelp.id, id)).run();
    return { success: true };
  }

  // --- Dashboard Stats & Validation Warnings ---

  getDashboardStats(userId: number): MinorDashboardStats {
    const sprints = this.listSprints(userId);
    const today = formatDate(new Date());

    // Active sprint determination:
    // 1. Current running sprint covering today
    let activeSprint = sprints.find((s) => s.status === "active" && s.startDate <= today && s.endDate >= today) ?? null;
    if (!activeSprint) {
      activeSprint = sprints.find((s) => s.startDate <= today && s.endDate >= today) ?? null;
    }
    // 2. Nearest upcoming active sprint (or nearest upcoming sprint)
    if (!activeSprint) {
      const upcoming = sprints.filter((s) => s.startDate > today);
      if (upcoming.length > 0) {
        activeSprint = upcoming.find((s) => s.status === "active") ?? upcoming[0];
      }
    }
    // 3. Most recent past sprint
    if (!activeSprint && sprints.length > 0) {
      const pastActive = sprints.filter((s) => s.status === "active");
      activeSprint = pastActive.length > 0 ? pastActive[pastActive.length - 1] : sprints[sprints.length - 1];
    }

    let nextShowAndGrowDate: string | null = null;
    let daysUntilShowAndGrow: number | null = null;
    if (activeSprint) {
      nextShowAndGrowDate = activeSprint.showAndGrowDate;
      const todayDate = parseDate(today);
      const sgDate = parseDate(activeSprint.showAndGrowDate);
      const diffTime = sgDate.getTime() - todayDate.getTime();
      daysUntilShowAndGrow = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Official passes: count teacher assessments with 'V' across all user sprints
    const officialPasses: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const projectedPasses: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    const sprintIds = sprints.map((s) => s.id);
    if (sprintIds.length > 0) {
      const allAssessments = db.select().from(minorTeacherAssessments).where(inArray(minorTeacherAssessments.sprintId, sprintIds)).all();
      for (const a of allAssessments) {
        if (a.assessment === "V" && a.learningOutcome >= 1 && a.learningOutcome <= 5) {
          officialPasses[a.learningOutcome] = (officialPasses[a.learningOutcome] || 0) + 1;
        }
      }

      // Prognosis: include active & planned sprints where stories cover the LU
      for (const s of sprints) {
        if (s.status === "completed" || s.status === "archived") {
          // Use official assessment if completed
          const sprintAssessments = allAssessments.filter((a) => a.sprintId === s.id);
          for (const a of sprintAssessments) {
            if (a.assessment === "V" && a.learningOutcome >= 1 && a.learningOutcome <= 5) {
              projectedPasses[a.learningOutcome] = (projectedPasses[a.learningOutcome] || 0) + 1;
            }
          }
        } else {
          // Active or planned: check stories in sprint
          const stories = db.select().from(minorStories).where(eq(minorStories.sprintId, s.id)).all();
          const coveredLUs = new Set<number>();
          for (const st of stories) {
            try {
              const lus = JSON.parse(st.learningOutcomes);
              if (Array.isArray(lus)) {
                lus.forEach((lu) => {
                  if (typeof lu === "number" && lu >= 1 && lu <= 5) coveredLUs.add(lu);
                });
              }
            } catch {}
          }
          coveredLUs.forEach((lu) => {
            projectedPasses[lu] = (projectedPasses[lu] || 0) + 1;
          });
        }
      }
    }

    // Active Sprint Warnings
    let activeSprintWarnings = null;
    if (activeSprint) {
      const activeStories = db.select().from(minorStories).where(eq(minorStories.sprintId, activeSprint.id)).all();
      const uniqueLUs = new Set<number>();
      for (const st of activeStories) {
        try {
          const lus = JSON.parse(st.learningOutcomes);
          if (Array.isArray(lus)) {
            lus.forEach((lu) => {
              if (typeof lu === "number" && lu >= 1 && lu <= 5) uniqueLUs.add(lu);
            });
          }
        } catch {}
      }

      activeSprintWarnings = {
        fewLearningOutcomes: uniqueLUs.size < 3,
        missingLU5: !uniqueLUs.has(5),
        uniqueLUsCount: uniqueLUs.size,
      };
    }

    const recentPeerHelp = this.listPeerHelp(userId).slice(0, 5);

    return {
      activeSprint,
      nextShowAndGrowDate,
      daysUntilShowAndGrow,
      officialPasses,
      projectedPasses,
      totalSprints: sprints.length,
      activeSprintWarnings,
      recentPeerHelp,
    };
  }
}
