import { and, asc, eq, sql } from "drizzle-orm";
import db from "../../db/client";
import { minorFeedbackEntries, minorReflections, minorSprints } from "../../db/schema";
import type { MinorFeedbackEntry, MinorReflection } from "../../types/shared";
import { orNotFound, ValidationError } from "../../utils/errors";
import { formatDate } from "./minor-helpers";
import type { MinorSprints } from "./minor-sprints";
import type { PublishNotifier } from "./publish-notifier";

export interface FeedbackInput {
  date?: string;
  fromWhom?: string;
  feedback?: string;
  action?: string;
  orderIndex?: number;
}

export interface ReflectionInput {
  date?: string;
  whatLearned?: string;
  whatRetained?: string;
  whatChange?: string;
}

export class MinorFeedback {
  constructor(
    private readonly sprints: MinorSprints,
    private readonly notifier: PublishNotifier,
  ) {}

  list(sprintId: number, userId: number): MinorFeedbackEntry[] {
    this.sprints.requireOwned(sprintId, userId);
    return db.select().from(minorFeedbackEntries).where(eq(minorFeedbackEntries.sprintId, sprintId)).orderBy(asc(minorFeedbackEntries.orderIndex), asc(minorFeedbackEntries.id)).all() as MinorFeedbackEntry[];
  }

  add(sprintId: number, userId: number, data: FeedbackInput) {
    this.sprints.requireOwned(sprintId, userId);
    if (!data.fromWhom?.trim() || !data.feedback?.trim() || !data.action?.trim()) {
      throw new ValidationError("minor.feedbackFieldsRequired");
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

  update(id: number, userId: number, data: FeedbackInput) {
    const existing = this.requireEntry(id, userId);
    return db.update(minorFeedbackEntries).set({
      date: data.date ?? existing.date,
      fromWhom: data.fromWhom?.trim() ?? existing.fromWhom,
      feedback: data.feedback?.trim() ?? existing.feedback,
      action: data.action?.trim() ?? existing.action,
      orderIndex: data.orderIndex ?? existing.orderIndex,
    }).where(eq(minorFeedbackEntries.id, id)).returning().get() as MinorFeedbackEntry;
  }

  remove(id: number, userId: number) {
    this.requireEntry(id, userId);
    db.delete(minorFeedbackEntries).where(eq(minorFeedbackEntries.id, id)).run();
    return { success: true };
  }

  getReflection(sprintId: number, userId: number): MinorReflection | null {
    this.sprints.requireOwned(sprintId, userId);
    return db.select().from(minorReflections).where(eq(minorReflections.sprintId, sprintId)).get() as MinorReflection | null;
  }

  saveReflection(sprintId: number, userId: number, data: ReflectionInput): MinorReflection {
    this.sprints.requireOwned(sprintId, userId);
    const saved = this.upsertReflection(sprintId, data);
    this.notifier.notify(userId, { event: "self_evaluations_saved", sprintId });
    return saved;
  }

  private upsertReflection(sprintId: number, data: ReflectionInput): MinorReflection {
    const existing = db.select().from(minorReflections).where(eq(minorReflections.sprintId, sprintId)).get();
    if (existing) {
      return db.update(minorReflections).set({
        date: data.date ?? existing.date,
        whatLearned: data.whatLearned !== undefined ? data.whatLearned : existing.whatLearned,
        whatRetained: data.whatRetained !== undefined ? data.whatRetained : existing.whatRetained,
        whatChange: data.whatChange !== undefined ? data.whatChange : existing.whatChange,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      }).where(eq(minorReflections.id, existing.id)).returning().get() as MinorReflection;
    }
    return db.insert(minorReflections).values({
      sprintId,
      date: data.date || formatDate(new Date()),
      whatLearned: data.whatLearned || "",
      whatRetained: data.whatRetained || "",
      whatChange: data.whatChange || "",
    }).returning().get() as MinorReflection;
  }

  private requireEntry(id: number, userId: number) {
    const row = db
      .select({ entry: minorFeedbackEntries })
      .from(minorFeedbackEntries)
      .innerJoin(minorSprints, eq(minorSprints.id, minorFeedbackEntries.sprintId))
      .where(and(eq(minorFeedbackEntries.id, id), eq(minorSprints.userId, userId)))
      .get();
    return orNotFound(row?.entry, "minor.feedbackNotFound");
  }
}
