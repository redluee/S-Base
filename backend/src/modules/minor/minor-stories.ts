import { and, asc, eq, sql } from "drizzle-orm";
import db from "../../db/client";
import { minorSprints, minorStories, minorStoryCriteria, minorStoryEvidence } from "../../db/schema";
import type { MinorStory, MinorStoryPresentationData, MinorStoryWithSprint } from "../../types/shared";
import { orNotFound, ValidationError } from "../../utils/errors";
import type { MinorEvaluations } from "./minor-evaluations";
import {
  type CriterionRow,
  type EvidenceRow,
  loadStoryChildren,
  parseLearningOutcomes,
  toStory,
} from "./minor-story-mapper";
import type { PublishNotifier } from "./publish-notifier";

type StoryStatus = "todo" | "in_progress" | "done";
type EvidenceType = "link" | "github" | "document" | "app";

export interface CriterionInput {
  id?: number;
  text: string;
  isCompleted?: boolean;
  indent?: number;
}

export interface EvidenceInput {
  id?: number;
  type?: EvidenceType;
  title: string;
  url: string;
}

export interface StoryInput {
  sprintId?: number | null;
  storyTypeCode?: string;
  storyNumber?: string | null;
  title?: string;
  asA?: string | null;
  iWant?: string | null;
  soThat?: string | null;
  learningOutcomes?: number[];
  status?: StoryStatus;
  orderIndex?: number;
  presentationData?: MinorStoryPresentationData | null;
  acceptanceCriteria?: CriterionInput[];
  qualityCriteria?: CriterionInput[];
  evidence?: EvidenceInput[];
}

export class MinorStories {
  constructor(
    private readonly evaluations: MinorEvaluations,
    private readonly notifier: PublishNotifier,
  ) {}

  listAll(userId: number): MinorStoryWithSprint[] {
    const rows = db
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

    const { criteria, evidence } = loadStoryChildren(rows.map((r) => r.story.id));

    return rows.map((r) => ({
      ...toStory(r.story, criteria, evidence),
      sprintNumber: r.sprintNumber ?? undefined,
      sprintName: r.sprintName ?? undefined,
      sprintStatus: r.sprintStatus ?? undefined,
    }));
  }

  create(userId: number, sprintId: number | null | undefined, data: StoryInput & { title: string }): MinorStory {
    if (!data.title.trim()) throw new ValidationError("minor.storyTitleRequired");

    let validSprintId: number | null = null;
    if (sprintId && sprintId > 0) {
      this.requireSprint(sprintId, userId);
      validSprintId = sprintId;
    }

    const learningOutcomes = Array.isArray(data.learningOutcomes) ? data.learningOutcomes : [];

    let orderIndex = data.orderIndex;
    if (orderIndex === undefined) {
      if (validSprintId) {
        const last = db
          .select({ maxOrder: sql<number>`MAX(${minorStories.orderIndex})` })
          .from(minorStories)
          .where(and(eq(minorStories.sprintId, validSprintId), eq(minorStories.userId, userId)))
          .get();
        orderIndex = ((last?.maxOrder as number | null | undefined) ?? 0) + 1;
      } else {
        orderIndex = 0;
      }
    }

    const row = db.insert(minorStories).values({
      sprintId: validSprintId,
      userId,
      storyTypeCode: data.storyTypeCode?.trim().toUpperCase() || "US",
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

    const criteria = [
      ...this.insertCriteria(row.id, "acceptance", data.acceptanceCriteria),
      ...this.insertCriteria(row.id, "quality", data.qualityCriteria),
    ];
    const evidence = this.insertEvidence(row.id, data.evidence);

    if (row.sprintId) {
      if (row.status === "done" && this.evaluations.markLearningOutcomesSufficient(row.sprintId, parseLearningOutcomes(row.learningOutcomes))) {
        this.notifier.notify(userId, { event: "self_evaluations_saved", sprintId: row.sprintId });
      }
    }

    return toStory(row, criteria, evidence);
  }

  update(storyId: number, userId: number, data: StoryInput): MinorStory {
    const existing = this.requireStory(storyId, userId);

    let newSprintId = existing.sprintId;
    if (data.sprintId !== undefined) {
      if (data.sprintId === null || data.sprintId <= 0) {
        newSprintId = null;
      } else {
        this.requireSprint(data.sprintId, userId);
        newSprintId = data.sprintId;
      }
    }

    const learningOutcomes = data.learningOutcomes !== undefined ? data.learningOutcomes : parseLearningOutcomes(existing.learningOutcomes);

    db.update(minorStories).set({
      sprintId: newSprintId,
      storyTypeCode: data.storyTypeCode !== undefined ? data.storyTypeCode.trim().toUpperCase() : existing.storyTypeCode,
      storyNumber: data.storyNumber !== undefined ? (data.storyNumber?.trim() || null) : existing.storyNumber,
      title: data.title?.trim() ?? existing.title,
      asA: data.asA !== undefined ? (data.asA?.trim() || null) : existing.asA,
      iWant: data.iWant !== undefined ? (data.iWant?.trim() || null) : existing.iWant,
      soThat: data.soThat !== undefined ? (data.soThat?.trim() || null) : existing.soThat,
      learningOutcomes: JSON.stringify(learningOutcomes),
      status: data.status ?? (existing.status as StoryStatus),
      orderIndex: data.orderIndex ?? existing.orderIndex,
      presentationData: data.presentationData !== undefined ? (data.presentationData ? JSON.stringify(data.presentationData) : null) : existing.presentationData,
    }).where(eq(minorStories.id, storyId)).run();

    if (data.acceptanceCriteria !== undefined || data.qualityCriteria !== undefined) {
      db.delete(minorStoryCriteria).where(eq(minorStoryCriteria.storyId, storyId)).run();
      this.insertCriteria(storyId, "acceptance", data.acceptanceCriteria);
      this.insertCriteria(storyId, "quality", data.qualityCriteria);
    }

    if (data.evidence !== undefined) {
      db.delete(minorStoryEvidence).where(eq(minorStoryEvidence.storyId, storyId)).run();
      this.insertEvidence(storyId, data.evidence);
    }

    const updated = this.requireStory(storyId, userId);
    const { criteria, evidence } = loadStoryChildren([storyId]);

    const becameDone = existing.status !== "done" || existing.sprintId !== updated.sprintId || data.learningOutcomes !== undefined;
    if (updated.sprintId && updated.status === "done" && becameDone) {
      if (this.evaluations.markLearningOutcomesSufficient(updated.sprintId, parseLearningOutcomes(updated.learningOutcomes))) {
        this.notifier.notify(userId, { event: "self_evaluations_saved", sprintId: updated.sprintId });
      }
    }

    return toStory(updated, criteria, evidence);
  }

  remove(storyId: number, userId: number) {
    this.requireStory(storyId, userId);
    db.delete(minorStories).where(eq(minorStories.id, storyId)).run();
    return { success: true };
  }

  reorder(sprintId: number, userId: number, storyIds: number[]) {
    this.requireSprint(sprintId, userId);

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
    orNotFound(db.select().from(minorStoryCriteria).where(eq(minorStoryCriteria.id, criterionId)).get(), "minor.criterionNotFound");
    return db.update(minorStoryCriteria).set({ isCompleted }).where(eq(minorStoryCriteria.id, criterionId)).returning().get();
  }

  private insertCriteria(storyId: number, type: "acceptance" | "quality", items: CriterionInput[] | undefined): CriterionRow[] {
    const inserted: CriterionRow[] = [];
    (items ?? []).forEach((crit, index) => {
      if (!crit.text?.trim()) return;
      inserted.push(
        db.insert(minorStoryCriteria).values({
          storyId,
          type,
          orderIndex: index + 1,
          indent: crit.indent ? 1 : 0,
          text: crit.text.trim(),
          isCompleted: Boolean(crit.isCompleted),
        }).returning().get(),
      );
    });
    return inserted;
  }

  private insertEvidence(storyId: number, items: EvidenceInput[] | undefined): EvidenceRow[] {
    const inserted: EvidenceRow[] = [];
    for (const ev of items ?? []) {
      if (!ev.title?.trim() || !ev.url?.trim()) continue;
      inserted.push(
        db.insert(minorStoryEvidence).values({
          storyId,
          type: ev.type || "link",
          title: ev.title.trim(),
          url: ev.url.trim(),
        }).returning().get(),
      );
    }
    return inserted;
  }

  private requireStory(storyId: number, userId: number) {
    return orNotFound(
      db.select().from(minorStories).where(and(eq(minorStories.id, storyId), eq(minorStories.userId, userId))).get(),
      "minor.storyNotFound",
    );
  }

  private requireSprint(sprintId: number, userId: number) {
    return orNotFound(
      db.select().from(minorSprints).where(and(eq(minorSprints.id, sprintId), eq(minorSprints.userId, userId))).get(),
      "minor.sprintNotFound",
    );
  }
}
