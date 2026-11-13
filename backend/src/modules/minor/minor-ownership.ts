import { and, eq } from "drizzle-orm";
import db from "../../db/client";
import { minorSprints } from "../../db/schema";
import { orNotFound } from "../../utils/errors";

export function requireOwnedSprint(sprintId: number, userId: number) {
  return orNotFound(
    db
      .select()
      .from(minorSprints)
      .where(and(eq(minorSprints.id, sprintId), eq(minorSprints.userId, userId)))
      .get(),
    "minor.sprintNotFound",
  );
}

export function ownedSprintIdOrNull(sprintId: number | null | undefined, userId: number): number | null {
  return sprintId ? requireOwnedSprint(sprintId, userId).id : null;
}
