import { describe, expect, it, beforeEach } from "bun:test";
import { setupTestDb } from "../../test-utils";
import { WorkoutService } from "./index";

describe("WorkoutService", () => {
  let workoutService: WorkoutService;
  let adminId: number;

  beforeEach(async () => {
    const ids = await setupTestDb();
    adminId = ids.adminId;
    workoutService = new WorkoutService();
  });

  it("validates exercise parameters when creating a workout template", () => {
    expect(() =>
      workoutService.createTemplate(adminId, {
        name: "Invalid Template",
        estimatedTime: -10,
      })
    ).toThrow("Estimated time cannot be negative");

    expect(() =>
      workoutService.createTemplate(adminId, {
        name: "Invalid Exercise Sets",
        exercises: [{ exerciseName: "Bench Press", sets: 0, reps: 10 }],
      })
    ).toThrow('Exercise "Bench Press" must have at least 1 set');

    expect(() =>
      workoutService.createTemplate(adminId, {
        name: "Invalid RPE",
        exercises: [{ exerciseName: "Bench Press", sets: 3, reps: 10, rpe: 15 }],
      })
    ).toThrow("RPE must be 0-10");
  });

  it("manages workout templates CRUD", () => {
    const template = workoutService.createTemplate(adminId, {
      name: "Full Body Strength",
      description: "Complete full body routine",
      targetMuscleGroups: "Full Body",
      estimatedTime: 45,
      exercises: [
        { exerciseName: "Squat", category: "Free Weights", sets: 3, reps: 8, weight: 70 },
        { exerciseName: "Push-Up", category: "Bodyweight", sets: 3, reps: 15 },
      ],
    });

    expect(template).not.toBeNull();
    expect(template?.name).toBe("Full Body Strength");
    expect(template?.exercises.length).toBe(2);

    const list = workoutService.listTemplates(adminId);
    expect(list.some((t) => t.templateId === template?.templateId)).toBe(true);

    const fetched = workoutService.getTemplate(template!.templateId, adminId);
    expect(fetched?.targetMuscleGroups).toBe("Full Body");

    const updated = workoutService.updateTemplate(template!.templateId, adminId, {
      name: "Full Body Hypertrophy",
    });
    expect(updated?.name).toBe("Full Body Hypertrophy");

    const delRes = workoutService.deleteTemplate(template!.templateId, adminId);
    expect(delRes?.deleted).toBe(true);
  });

  it("manages workout session lifecycle", () => {
    const session = workoutService.createSession(adminId);
    expect(session).not.toBeNull();
    expect(session?.name).toBe("Vrije training");

    const updated = workoutService.updateSession(session!.sessionId, adminId, {
      notes: "Felt strong today",
      exercises: [
        {
          exerciseName: "Bench Press",
          sortOrder: 0,
          category: "Free Weights",
          sets: [{ setNumber: 1, reps: 10, weight: 60, completed: 1 }],
        },
      ],
    });

    expect(updated?.notes).toBe("Felt strong today");
    expect(updated?.exercises.length).toBe(1);

    const completed = workoutService.completeSession(session!.sessionId, adminId);
    expect(completed?.completedAt).not.toBeNull();

    const activeSessions = workoutService.listSessions(adminId, "completed");
    expect(activeSessions.some((s) => s.sessionId === session!.sessionId)).toBe(true);

    const delRes = workoutService.deleteSession(session!.sessionId, adminId);
    expect(delRes?.deleted).toBe(true);
  });

  it("provides exercise suggestions and progress tracking", () => {
    workoutService.createTemplate(adminId, {
      name: "Suggest Test",
      exercises: [{ exerciseName: "Overhead Press", sets: 3, reps: 10 }],
    });

    const suggestions = workoutService.suggestExercises(adminId, "Overhead");
    expect(suggestions.some((s) => s.value === "Overhead Press")).toBe(true);

    const searchSuggestions = workoutService.suggestWorkoutSearch(adminId, "Suggest");
    expect(searchSuggestions.length).toBeGreaterThan(0);

    const progress = workoutService.exerciseProgress(adminId, "Overhead Press");
    expect(progress).toBeDefined();
    expect(progress.sessions).toBeArray();
  });
});
