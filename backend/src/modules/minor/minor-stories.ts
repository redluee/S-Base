import {
  eq,
  and,
  asc,
  inArray,
  sql,
} from "drizzle-orm";
import db from "../../db/client";
import {
  minorSprints,
  minorStories,
  minorStoryCriteria,
  minorStoryEvidence,
} from "../../db/schema";
import type {
  MinorStory,
  MinorStoryWithSprint,
  MinorStoryCriterion,
  MinorStoryEvidence,
  MinorStoryPresentationData,
} from "../../types/shared";
import {
  MinorEvaluationService,
} from "./minor-evaluations";

export class MinorStoryService extends MinorEvaluationService {
  // --- Story Management ---

  listAllStories(userId: number): MinorStoryWithSprint[] {
    const storiesRaw = db
      .select({
        story: minorStories,
        sprintNumber: minorSprints.sprintNumber,
        sprintName: minorSprints.name,
        sprintStatus: minorSprints.status,
      })
      .from(minorStories)
      .leftJoin(minorSprints, eq(minorStories.sprintId, minorSprints.id))
      .where(eq(minorStories.userId, userId))
      .orderBy(asc(minorStories.sprintId), asc(minorStories.orderIndex), asc(minorStories.id))
      .all();

    const storyIds = storiesRaw.map((r) => r.story.id);

    const criteria = storyIds.length > 0
      ? db.select().from(minorStoryCriteria).where(inArray(minorStoryCriteria.storyId, storyIds)).orderBy(asc(minorStoryCriteria.orderIndex)).all()
      : [];

    const evidence = storyIds.length > 0
      ? db.select().from(minorStoryEvidence).where(inArray(minorStoryEvidence.storyId, storyIds)).orderBy(asc(minorStoryEvidence.id)).all()
      : [];

    return storiesRaw.map((r) => {
      const s = r.story;
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
        presentationData: s.presentationData ? (() => {
          try { return JSON.parse(s.presentationData); } catch { return null; }
        })() : null,
        createdAt: s.createdAt,
        sprintNumber: r.sprintNumber ?? undefined,
        sprintName: r.sprintName ?? undefined,
        sprintStatus: r.sprintStatus ?? undefined,
        criteria: criteria.filter((c) => c.storyId === s.id).map((c) => ({
          id: c.id,
          storyId: c.storyId,
          type: c.type as "acceptance" | "quality",
          orderIndex: c.orderIndex,
          indent: c.indent ?? 0,
          text: c.text,
          isCompleted: c.isCompleted,
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
  }

  createStory(userId: number, sprintId: number | null | undefined, data: {
    storyTypeCode?: string;
    storyNumber?: string;
    title: string;
    asA?: string;
    iWant?: string;
    soThat?: string;
    learningOutcomes?: number[];
    status?: "todo" | "in_progress" | "done";
    orderIndex?: number;
    presentationData?: MinorStoryPresentationData | null;
    acceptanceCriteria?: { text: string; isCompleted?: boolean; indent?: number }[];
    qualityCriteria?: { text: string; isCompleted?: boolean; indent?: number }[];
    evidence?: { type: "link" | "github" | "document" | "app"; title: string; url: string }[];
  }): MinorStory {
    if (!data.title?.trim()) throw new Error("Story title is required");

    let validSprintId: number | null = null;
    if (sprintId && sprintId > 0) {
      const sprint = db.select().from(minorSprints).where(and(eq(minorSprints.id, sprintId), eq(minorSprints.userId, userId))).get();
      if (!sprint) throw new Error("Sprint not found");
      validSprintId = sprintId;
    }

    const storyTypeCode = data.storyTypeCode?.trim().toUpperCase() || "US";
    const learningOutcomes = Array.isArray(data.learningOutcomes) ? data.learningOutcomes : [];

    let orderIndex = data.orderIndex;
    if (orderIndex === undefined) {
      if (validSprintId) {
        const lastStory = db
          .select({ maxOrder: sql<number>`MAX(${minorStories.orderIndex})` })
          .from(minorStories)
          .where(and(eq(minorStories.sprintId, validSprintId), eq(minorStories.userId, userId)))
          .get();
        orderIndex = ((lastStory?.maxOrder as number | null | undefined) ?? 0) + 1;
      } else {
        orderIndex = 0;
      }
    }

    const storyRow = db.insert(minorStories).values({
      sprintId: validSprintId,
      userId,
      storyTypeCode,
      storyNumber: data.storyNumber?.trim() || null,
      title: data.title.trim(),
      asA: data.asA?.trim() || null,
      iWant: data.iWant?.trim() || null,
      soThat: data.soThat?.trim() || null,
      learningOutcomes: JSON.stringify(learningOutcomes),
      status: data.status || "todo",
      orderIndex,
      presentationData: data.presentationData ? JSON.stringify(data.presentationData) : null,
    }).returning().get();

    const createdCriteria: MinorStoryCriterion[] = [];
    if (Array.isArray(data.acceptanceCriteria)) {
      data.acceptanceCriteria.forEach((crit, index) => {
        if (crit.text?.trim()) {
          const c = db.insert(minorStoryCriteria).values({
            storyId: storyRow.id,
            type: "acceptance",
            orderIndex: index + 1,
            indent: crit.indent ? 1 : 0,
            text: crit.text.trim(),
            isCompleted: Boolean(crit.isCompleted),
          }).returning().get();
          createdCriteria.push({
            id: c.id,
            storyId: c.storyId,
            type: "acceptance",
            orderIndex: c.orderIndex,
            indent: c.indent ?? 0,
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
            indent: crit.indent ? 1 : 0,
            text: crit.text.trim(),
            isCompleted: Boolean(crit.isCompleted),
          }).returning().get();
          createdCriteria.push({
            id: c.id,
            storyId: c.storyId,
            type: "quality",
            orderIndex: c.orderIndex,
            indent: c.indent ?? 0,
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

    if (storyRow.sprintId) {
      this.syncSprintSelfEvaluations(storyRow.sprintId);
      if (storyRow.status === "done" && this.markLearningOutcomesSufficient(storyRow.sprintId, JSON.parse(storyRow.learningOutcomes))) {
        this.notifier.notify(userId, { event: "self_evaluations_saved", sprintId: storyRow.sprintId });
      }
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
      presentationData: data.presentationData || null,
      createdAt: storyRow.createdAt,
      criteria: createdCriteria,
      evidence: createdEvidence,
    };
  }

  updateStory(storyId: number, userId: number, data: {
    sprintId?: number | null;
    storyTypeCode?: string;
    storyNumber?: string;
    title?: string;
    asA?: string | null;
    iWant?: string | null;
    soThat?: string | null;
    learningOutcomes?: number[];
    status?: "todo" | "in_progress" | "done";
    orderIndex?: number;
    presentationData?: MinorStoryPresentationData | null;
    acceptanceCriteria?: { id?: number; text: string; isCompleted?: boolean; indent?: number }[];
    qualityCriteria?: { id?: number; text: string; isCompleted?: boolean; indent?: number }[];
    evidence?: { id?: number; type: "link" | "github" | "document" | "app"; title: string; url: string }[];
  }): MinorStory | null {
    const existing = db.select().from(minorStories).where(and(eq(minorStories.id, storyId), eq(minorStories.userId, userId))).get();
    if (!existing) return null;

    let newSprintId = existing.sprintId;
    if (data.sprintId !== undefined) {
      if (data.sprintId === null || data.sprintId <= 0) {
        newSprintId = null;
      } else {
        const sprint = db.select().from(minorSprints).where(and(eq(minorSprints.id, data.sprintId), eq(minorSprints.userId, userId))).get();
        if (!sprint) throw new Error("Sprint not found");
        newSprintId = data.sprintId;
      }
    }

    const storyTypeCode = data.storyTypeCode !== undefined ? data.storyTypeCode.trim().toUpperCase() : existing.storyTypeCode;
    const learningOutcomes = data.learningOutcomes !== undefined ? data.learningOutcomes : JSON.parse(existing.learningOutcomes);

    db.update(minorStories).set({
      sprintId: newSprintId,
      storyTypeCode,
      storyNumber: data.storyNumber !== undefined ? (data.storyNumber?.trim() || null) : existing.storyNumber,
      title: data.title?.trim() ?? existing.title,
      asA: data.asA !== undefined ? (data.asA?.trim() || null) : existing.asA,
      iWant: data.iWant !== undefined ? (data.iWant?.trim() || null) : existing.iWant,
      soThat: data.soThat !== undefined ? (data.soThat?.trim() || null) : existing.soThat,
      learningOutcomes: JSON.stringify(learningOutcomes),
      status: data.status ?? (existing.status as any),
      orderIndex: data.orderIndex ?? existing.orderIndex,
      presentationData: data.presentationData !== undefined ? (data.presentationData ? JSON.stringify(data.presentationData) : null) : existing.presentationData,
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
              indent: crit.indent ? 1 : 0,
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
              indent: crit.indent ? 1 : 0,
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

    if (updated.sprintId) {
      this.syncSprintSelfEvaluations(updated.sprintId);
    }
    if (existing.sprintId && existing.sprintId !== updated.sprintId) {
      this.syncSprintSelfEvaluations(existing.sprintId);
    }
    if (updated.sprintId && updated.status === "done" && (existing.status !== "done" || existing.sprintId !== updated.sprintId || data.learningOutcomes !== undefined)) {
      if (this.markLearningOutcomesSufficient(updated.sprintId, JSON.parse(updated.learningOutcomes))) {
        this.notifier.notify(userId, { event: "self_evaluations_saved", sprintId: updated.sprintId });
      }
    }

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
      presentationData: updated.presentationData ? (() => {
        try { return JSON.parse(updated.presentationData); } catch { return null; }
      })() : null,
      createdAt: updated.createdAt,
      criteria: criteria.map((c) => ({
        id: c.id,
        storyId: c.storyId,
        type: c.type as any,
        orderIndex: c.orderIndex,
        indent: c.indent ?? 0,
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

  reorderStories(sprintId: number, userId: number, storyIds: number[]) {
    const sprint = db.select().from(minorSprints).where(and(eq(minorSprints.id, sprintId), eq(minorSprints.userId, userId))).get();
    if (!sprint) return null;

    db.transaction((tx) => {
      storyIds.forEach((id, index) => {
        tx.update(minorStories)
          .set({ orderIndex: index + 1 })
          .where(and(eq(minorStories.id, id), eq(minorStories.sprintId, sprintId), eq(minorStories.userId, userId)))
          .run();
      });
    });

    return { success: true };
  }

  toggleCriterion(criterionId: number, isCompleted: boolean) {
    const c = db.select().from(minorStoryCriteria).where(eq(minorStoryCriteria.id, criterionId)).get();
    if (!c) return null;
    return db.update(minorStoryCriteria).set({
      isCompleted: isCompleted,
    }).where(eq(minorStoryCriteria.id, criterionId)).returning().get();
  }
}
