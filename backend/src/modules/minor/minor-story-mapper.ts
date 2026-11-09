import { asc, inArray } from "drizzle-orm";
import db from "../../db/client";
import { minorStoryCriteria, minorStoryEvidence } from "../../db/schema";
import type { minorStories } from "../../db/schema";
import type {
  MinorStory,
  MinorStoryCriterion,
  MinorStoryEvidence,
  MinorStoryPresentationData,
} from "../../types/shared";

export type StoryRow = typeof minorStories.$inferSelect;
export type CriterionRow = typeof minorStoryCriteria.$inferSelect;
export type EvidenceRow = typeof minorStoryEvidence.$inferSelect;

export function parseLearningOutcomes(raw: string): number[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parsePresentationData(raw: string | null): MinorStoryPresentationData | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function toCriterion(row: CriterionRow): MinorStoryCriterion {
  return {
    id: row.id,
    storyId: row.storyId,
    type: row.type as MinorStoryCriterion["type"],
    orderIndex: row.orderIndex,
    indent: row.indent ?? 0,
    text: row.text,
    isCompleted: Boolean(row.isCompleted),
  };
}

export function toEvidence(row: EvidenceRow): MinorStoryEvidence {
  return {
    id: row.id,
    storyId: row.storyId,
    type: row.type as MinorStoryEvidence["type"],
    title: row.title,
    url: row.url,
    createdAt: row.createdAt,
  };
}

export function toStory(row: StoryRow, criteria: CriterionRow[], evidence: EvidenceRow[]): MinorStory {
  return {
    id: row.id,
    sprintId: row.sprintId,
    userId: row.userId,
    storyTypeCode: row.storyTypeCode,
    storyNumber: row.storyNumber,
    title: row.title,
    asA: row.asA,
    iWant: row.iWant,
    soThat: row.soThat,
    learningOutcomes: parseLearningOutcomes(row.learningOutcomes),
    status: row.status as MinorStory["status"],
    orderIndex: row.orderIndex,
    presentationData: parsePresentationData(row.presentationData),
    createdAt: row.createdAt,
    criteria: criteria.filter((c) => c.storyId === row.id).map(toCriterion),
    evidence: evidence.filter((e) => e.storyId === row.id).map(toEvidence),
  };
}

export function loadStoryChildren(storyIds: number[]): { criteria: CriterionRow[]; evidence: EvidenceRow[] } {
  if (storyIds.length === 0) return { criteria: [], evidence: [] };
  return {
    criteria: db
      .select()
      .from(minorStoryCriteria)
      .where(inArray(minorStoryCriteria.storyId, storyIds))
      .orderBy(asc(minorStoryCriteria.orderIndex))
      .all(),
    evidence: db
      .select()
      .from(minorStoryEvidence)
      .where(inArray(minorStoryEvidence.storyId, storyIds))
      .orderBy(asc(minorStoryEvidence.id))
      .all(),
  };
}
