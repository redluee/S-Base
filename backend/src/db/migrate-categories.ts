import db from "./client";
import { sql } from "drizzle-orm";

/**
 * Migration script for exercise categories and equipment.
 * Converts legacy values:
 * - Categories: (resistance -> Free Weights, bodyweight -> Bodyweight, cardio -> Cardio, isometric -> Functional)
 * - Equipment: (ball / Medicine Ball -> bal, none/NULL for Bodyweight category -> Bodyweight)
 *
 * Idempotent & safe to run multiple times.
 */
export async function runCategoryMigration() {
  console.log("=== Starting exercise categories & equipment migration ===");

  const categoryMap: [string, string][] = [
    ["resistance", "Free Weights"],
    ["bodyweight", "Bodyweight"],
    ["cardio", "Cardio"],
    ["isometric", "Functional"],
  ];

  for (const [oldCat, newCat] of categoryMap) {
    const resTemplates = await db.run(
      sql`UPDATE template_exercises SET category = ${newCat} WHERE LOWER(category) = ${oldCat}`
    );
    const resSessions = await db.run(
      sql`UPDATE session_exercises SET category = ${newCat} WHERE LOWER(category) = ${oldCat}`
    );
    console.log(
      `Migrated category '${oldCat}' -> '${newCat}': template_exercises (${resTemplates.changes ?? 0} updated), session_exercises (${resSessions.changes ?? 0} updated)`
    );
  }

  // Fallback for null or unmapped legacy category values
  const resNullTemplates = await db.run(
    sql`UPDATE template_exercises SET category = 'Free Weights' WHERE category IS NULL OR category = ''`
  );
  const resNullSessions = await db.run(
    sql`UPDATE session_exercises SET category = 'Free Weights' WHERE category IS NULL OR category = ''`
  );
  if ((resNullTemplates.changes ?? 0) > 0 || (resNullSessions.changes ?? 0) > 0) {
    console.log(
      `Set default category 'Free Weights' for empty rows: template_exercises (${resNullTemplates.changes ?? 0}), session_exercises (${resNullSessions.changes ?? 0})`
    );
  }

  // Equipment updates: 'ball' / 'Medicine Ball' / 'medicine_ball' -> 'bal'
  const resBallTemplates = await db.run(
    sql`UPDATE template_exercises SET equipment = 'bal' WHERE LOWER(equipment) IN ('ball', 'medicine ball', 'medicine_ball')`
  );
  const resBallSessions = await db.run(
    sql`UPDATE session_exercises SET equipment = 'bal' WHERE LOWER(equipment) IN ('ball', 'medicine ball', 'medicine_ball')`
  );
  if ((resBallTemplates.changes ?? 0) > 0 || (resBallSessions.changes ?? 0) > 0) {
    console.log(
      `Migrated equipment ball/Medicine Ball -> 'bal': template_exercises (${resBallTemplates.changes ?? 0}), session_exercises (${resBallSessions.changes ?? 0})`
    );
  }

  // Equipment updates for Bodyweight category
  const resBwTemplates = await db.run(
    sql`UPDATE template_exercises SET equipment = 'Bodyweight' WHERE (equipment IS NULL OR equipment = '' OR LOWER(equipment) = 'none') AND category = 'Bodyweight'`
  );
  const resBwSessions = await db.run(
    sql`UPDATE session_exercises SET equipment = 'Bodyweight' WHERE (equipment IS NULL OR equipment = '' OR LOWER(equipment) = 'none') AND category = 'Bodyweight'`
  );
  if ((resBwTemplates.changes ?? 0) > 0 || (resBwSessions.changes ?? 0) > 0) {
    console.log(
      `Migrated Bodyweight exercise equipment to 'Bodyweight': template_exercises (${resBwTemplates.changes ?? 0}), session_exercises (${resBwSessions.changes ?? 0})`
    );
  }

  console.log("=== Category and equipment migration finished successfully ===");
}

if (import.meta.main) {
  runCategoryMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}
