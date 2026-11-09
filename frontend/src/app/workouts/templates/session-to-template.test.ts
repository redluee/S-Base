import { describe, expect, it } from "bun:test";
import type { FullWorkoutSession } from "@backend/types/shared";
import { isQuickStartSession, sessionToTemplatePrefill } from "./session-to-template";
import { buildInitialExercises } from "./workout-template-form-helpers";

function session(overrides: Partial<FullWorkoutSession> = {}): FullWorkoutSession {
  return {
    sessionId: 7,
    templateId: null,
    userId: 1,
    startedAt: "2026-11-01 10:00:00",
    completedAt: "2026-11-01 10:50:00",
    notes: null,
    name: "Snelle training",
    exercises: [],
    ...overrides,
  };
}

describe("isQuickStartSession", () => {
  it("is true only without a template", () => {
    expect(isQuickStartSession({ templateId: null })).toBe(true);
    expect(isQuickStartSession({ templateId: 3 })).toBe(false);
  });
});

describe("sessionToTemplatePrefill", () => {
  it("maps exercises in order using completed sets and the heaviest set", () => {
    const prefill = sessionToTemplatePrefill(
      session({
        exercises: [
          {
            exerciseName: "Squat",
            sortOrder: 1,
            category: "resistance",
            equipment: "barbell",
            restTime: 120,
            sets: [
              { setNumber: 1, reps: 8, weight: 60, completed: 1 },
              { setNumber: 2, reps: 6, weight: 80, rpe: 8, completed: 1 },
              { setNumber: 3, reps: 5, weight: 100, completed: 0 },
            ],
          },
          {
            exerciseName: "Plank",
            sortOrder: 0,
            category: "isometric",
            perSide: 1,
            sets: [{ setNumber: 1, reps: 0, duration: 45, completed: 1 }],
          },
          { exerciseName: "  ", sortOrder: 2, sets: [] },
        ],
      })
    );

    expect(prefill.name).toBe("Snelle training");
    expect(prefill.estimatedTime).toBe(50);
    expect(prefill.exercises.map((e) => e.exerciseName)).toEqual(["Plank", "Squat"]);
    expect(prefill.exercises[1]).toMatchObject({
      defaultSets: 2,
      defaultReps: 6,
      defaultWeight: 80,
      defaultRpe: 8,
      defaultRestTime: 120,
      equipment: "barbell",
    });
    expect(prefill.exercises[0]).toMatchObject({ defaultDuration: 45, defaultReps: 0, perSide: 1, defaultRestTime: 90 });
  });

  it("falls back to all sets when none were completed and keeps assisted weight", () => {
    const prefill = sessionToTemplatePrefill(
      session({
        completedAt: null,
        exercises: [
          {
            exerciseName: "Pull-up",
            sortOrder: 0,
            category: "bodyweight",
            isAssisted: 1,
            sets: [
              { setNumber: 1, reps: 8, weight: -20, completed: 0 },
              { setNumber: 2, reps: 6, weight: -30, completed: 0 },
            ],
          },
        ],
      })
    );
    expect(prefill.estimatedTime).toBeNull();
    expect(prefill.exercises[0]).toMatchObject({ defaultSets: 2, defaultWeight: -30, isAssisted: 1 });
  });

  it("produces form rows the template editor understands", () => {
    const rows = buildInitialExercises(
      sessionToTemplatePrefill(
        session({
          exercises: [
            {
              exerciseName: "Bench",
              sortOrder: 0,
              category: "resistance",
              equipment: "dumbbell",
              sets: [{ setNumber: 1, reps: 10, weight: 22.5, completed: 1 }],
            },
          ],
        })
      )
    );
    expect(rows[0]).toMatchObject({
      name: "Bench",
      category: "Free Weights",
      sets: "1",
      reps: "10",
      equipment: "Dumbbell",
      defaultRestTime: "01:30",
    });
    expect(rows[0].weight).toContain("22");
  });
});
