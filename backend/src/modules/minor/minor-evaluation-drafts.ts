import { and, eq, sql } from "drizzle-orm";
import db from "../../db/client";
import { minorSelfEvaluations } from "../../db/schema";
import type { MinorSelfEvaluation } from "../../types/shared";
import type { MinorSprints } from "./minor-sprints";

export class MinorEvaluationDrafts {
  constructor(private readonly sprints: MinorSprints) {}

  autoGenerate(sprintId: number, userId: number): MinorSelfEvaluation[] {
    const sprint = this.sprints.getById(sprintId, userId);
    const result: MinorSelfEvaluation[] = [];

    for (let lu = 1; lu <= 5; lu++) {
      const storiesForLu = sprint.stories.filter((s) => s.learningOutcomes.includes(lu));
      const defaultLevel = storiesForLu.length > 0 ? "V" : "-";

      const completedStories = storiesForLu.filter((s) => s.status === "done");
      const inProgressStories = storiesForLu.filter((s) => s.status !== "done");

      const lines: string[] = [];
      if (completedStories.length > 0) {
        lines.push(`Voltooide stories voor LU ${lu}:`);
        for (const st of completedStories) {
          const prefix = st.storyNumber ? `[${st.storyNumber}] ` : "";
          lines.push(`• ${prefix}${st.title}`);
          for (const ev of st.evidence ?? []) {
            lines.push(`   - Bewijs (${ev.type}): ${ev.title} (${ev.url})`);
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

      const argumentation = lines.join("\n");

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
