import { and, eq } from "drizzle-orm";
import db from "../../db/client";
import { minorStoryTypes } from "../../db/schema";
import type { MinorStoryType } from "../../types/shared";
import { NotFoundError, orNotFound, ValidationError } from "../../utils/errors";
import { DEFAULT_STORY_TYPES, parseDefaultQualityCriteria } from "./minor-helpers";

export type QualityCriterionInput = { text: string; indent?: number } | string;

export interface StoryTypeInput {
  code?: string;
  name?: string;
  description?: string | null;
  color?: string | null;
  defaultQualityCriteria?: QualityCriterionInput[];
}

type StoryTypeRow = typeof minorStoryTypes.$inferSelect;

function serializeCriteria(criteria: QualityCriterionInput[]): string {
  return JSON.stringify(
    criteria
      .map((c) =>
        typeof c === "string" ? { text: c.trim(), indent: 0 } : { text: c.text.trim(), indent: c.indent ? 1 : 0 },
      )
      .filter((c) => c.text),
  );
}

function toStoryType(row: StoryTypeRow, isDefault: boolean): MinorStoryType {
  return {
    id: row.id,
    userId: row.userId,
    code: row.code,
    name: row.name,
    description: row.description,
    color: row.color,
    isDefault,
    defaultQualityCriteria: parseDefaultQualityCriteria(row.defaultQualityCriteria),
    createdAt: row.createdAt,
  };
}

export class MinorStoryTypes {
  list(userId: number): MinorStoryType[] {
    const dbTypes = db.select().from(minorStoryTypes).where(eq(minorStoryTypes.userId, userId)).all();
    const dbCodeMap = new Map<string, StoryTypeRow>();
    for (const row of dbTypes) dbCodeMap.set(row.code, row);

    const defaults: MinorStoryType[] = DEFAULT_STORY_TYPES.map((d, idx) => {
      const override = dbCodeMap.get(d.code);
      if (override) return toStoryType(override, true);
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

    const customTypes = dbTypes
      .filter((row) => !DEFAULT_STORY_TYPES.some((d) => d.code === row.code))
      .map((row) => toStoryType(row, Boolean(row.isDefault)));

    return [...defaults, ...customTypes];
  }

  create(userId: number, data: { code: string; name: string } & StoryTypeInput): MinorStoryType {
    if (!data.code.trim() || !data.name.trim()) throw new ValidationError("minor.storyTypeFieldsRequired");
    const row = db
      .insert(minorStoryTypes)
      .values({
        userId,
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        description: data.description?.trim() || null,
        color: data.color || "brand",
        isDefault: false,
        defaultQualityCriteria: data.defaultQualityCriteria ? serializeCriteria(data.defaultQualityCriteria) : "[]",
      })
      .returning()
      .get();
    return toStoryType(row, Boolean(row.isDefault));
  }

  update(id: number, userId: number, data: StoryTypeInput): MinorStoryType {
    const criteriaJson =
      data.defaultQualityCriteria !== undefined ? serializeCriteria(data.defaultQualityCriteria) : undefined;
    if (id <= 0) return this.overrideDefault(id, userId, data, criteriaJson);

    const existing = this.requireOwned(id, userId);
    const isDefaultCode = DEFAULT_STORY_TYPES.some((d) => d.code === existing.code);
    const updated = db
      .update(minorStoryTypes)
      .set({
        code: data.code && !isDefaultCode ? data.code.trim().toUpperCase() : existing.code,
        name: data.name?.trim() ?? existing.name,
        description: data.description !== undefined ? data.description?.trim() || null : existing.description,
        color: data.color ?? existing.color,
        defaultQualityCriteria: criteriaJson !== undefined ? criteriaJson : existing.defaultQualityCriteria,
      })
      .where(eq(minorStoryTypes.id, id))
      .returning()
      .get();
    return toStoryType(updated, Boolean(updated.isDefault || isDefaultCode));
  }

  remove(id: number, userId: number) {
    if (id <= 0) throw new NotFoundError("minor.storyTypeNotFound");
    this.requireOwned(id, userId);
    db.delete(minorStoryTypes).where(eq(minorStoryTypes.id, id)).run();
    return { success: true };
  }

  private overrideDefault(
    id: number,
    userId: number,
    data: StoryTypeInput,
    criteriaJson: string | undefined,
  ): MinorStoryType {
    const definition =
      DEFAULT_STORY_TYPES[Math.abs(id) - 1] ||
      DEFAULT_STORY_TYPES.find((d) => d.code === data.code?.trim().toUpperCase());
    if (!definition) throw new NotFoundError("minor.storyTypeNotFound");

    const row = db
      .insert(minorStoryTypes)
      .values({
        userId,
        code: definition.code,
        name: data.name?.trim() || definition.name,
        description: data.description !== undefined ? data.description?.trim() || null : definition.description,
        color: data.color || definition.color,
        isDefault: true,
        defaultQualityCriteria:
          criteriaJson !== undefined ? criteriaJson : JSON.stringify(definition.defaultQualityCriteria),
      })
      .returning()
      .get();
    return toStoryType(row, true);
  }

  private requireOwned(id: number, userId: number): StoryTypeRow {
    return orNotFound(
      db
        .select()
        .from(minorStoryTypes)
        .where(and(eq(minorStoryTypes.id, id), eq(minorStoryTypes.userId, userId)))
        .get(),
      "minor.storyTypeNotFound",
    );
  }
}
