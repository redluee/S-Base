import { and, eq, sql } from "drizzle-orm";
import db from "../../db/client";
import { minorSelfEvaluations } from "../../db/schema";
import type { MinorSelfEvaluation } from "../../types/shared";
import { draftArgumentation, LEARNING_OUTCOMES, noStoriesArgumentation } from "../../shared/minor";
import type { MinorSprints } from "./minor-sprints";

export class MinorEvaluationDrafts {
  constructor(private readonly sprints: MinorSprints) {}

  autoGenerate(sprintId: number, userId: number): MinorSelfEvaluation[] {
    const sprint = this.sprints.getById(sprintId, userId);
    const result: MinorSelfEvaluation[] = [];

    for (const lu of LEARNING_OUTCOMES) {
      const draft = draftArgumentation(lu, sprint.stories);
      const defaultLevel = draft ? "V" : "-";
      const argumentation = draft ?? noStoriesArgumentation(lu);

      const existing = db
        .select()
        .from(minorSelfEvaluations)
        .where(and(eq(minorSelfEvaluations.sprintId, sprintId), eq(minorSelfEvaluations.learningOutcome, lu)))
        .get();
      if (existing) {
        const updated = db
          .update(minorSelfEvaluations)
          .set({
            level: defaultLevel,
            argumentation,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          })
          .where(eq(minorSelfEvaluations.id, existing.id))
          .returning()
          .get();
        result.push(updated as MinorSelfEvaluation);
      } else {
        const created = db
          .insert(minorSelfEvaluations)
          .values({
            sprintId,
            learningOutcome: lu,
            level: defaultLevel,
            argumentation,
          })
          .returning()
          .get();
        result.push(created as MinorSelfEvaluation);
      }
    }

    return result;
  }
}
