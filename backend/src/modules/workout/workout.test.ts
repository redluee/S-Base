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
      exercises: [{ exerciseName: "Overhead Press", sets: 3, reps: 10, weight: 40 }],
    });

    const suggestions = workoutService.suggestExercises(adminId, "Overhead");
    expect(suggestions.filter((s) => s.value.toLowerCase() === "overhead press").length).toBe(1);
    expect(suggestions[0].value).toBe("Overhead Press");
    expect(suggestions[0].defaultSets).toBe(3);
    expect(suggestions[0].defaultReps).toBe(10);
    expect(suggestions[0].defaultWeight).toBe(40);

    // Create completed session 1 with 50kg
    const s1 = workoutService.createSession(adminId);
    workoutService.updateSession(s1.sessionId, adminId, {
      exercises: [
        {
          exerciseName: "Overhead Press",
          category: "Free Weights",
          equipment: "barbell",
          sets: [{ setNumber: 1, reps: 8, weight: 50, completed: 1 }],
        },
      ],
    });
    workoutService.completeSession(s1.sessionId, adminId);

    // Create completed session 2 with 55kg (more recent)
    const s2 = workoutService.createSession(adminId);
    workoutService.updateSession(s2.sessionId, adminId, {
      exercises: [
        {
          exerciseName: "Overhead Press",
          category: "Free Weights",
          equipment: "dumbbell",
          sets: [
            { setNumber: 1, reps: 6, weight: 55, completed: 1 },
            { setNumber: 2, reps: 6, weight: 55, completed: 1 },
          ],
        },
      ],
    });
    workoutService.completeSession(s2.sessionId, adminId);

    // Ensure suggestExercises only returns ONE entry for Overhead Press and uses the latest session data
    const suggestionsAfter = workoutService.suggestExercises(adminId, "Overhead");
    const ohMatches = suggestionsAfter.filter((s) => s.value.toLowerCase() === "overhead press");
    expect(ohMatches.length).toBe(1);
    expect(ohMatches[0].defaultSets).toBe(2);
    expect(ohMatches[0].defaultReps).toBe(6);
    expect(ohMatches[0].defaultWeight).toBe(55);
    expect(ohMatches[0].lastSets?.length).toBe(2);
    expect(ohMatches[0].lastSets?.[0].weight).toBe(55);

    const searchSuggestions = workoutService.suggestWorkoutSearch(adminId, "Suggest");
    expect(searchSuggestions.length).toBeGreaterThan(0);

    const progress = workoutService.exerciseProgress(adminId, "Overhead Press");
    expect(progress).toBeDefined();
    expect(progress.sessions.length).toBe(2);
    expect(progress.sessions[1].sets[0].weight).toBe(55);
  });

  it("handles perSide toggles properly across session creation and updates", () => {
    const tmpl = workoutService.createTemplate(adminId, {
      name: "Per Side Test Template",
      exercises: [
        { exerciseName: "Single Leg Press", sets: 3, reps: 10, weight: 60, perSide: 1 },
      ],
    });
    expect(tmpl.exercises[0].perSide).toBe(1);

    const s = workoutService.createSession(adminId, tmpl.templateId);
    expect(s?.exercises?.[0].perSide).toBe(1);

    // Disable perSide on this session exercise
    const updated = workoutService.updateSession(s!.sessionId, adminId, {
      exercises: [
        {
          sessionExerciseId: s!.exercises![0].sessionExerciseId,
          exerciseName: "Single Leg Press",
          sortOrder: 0,
          perSide: 0,
          sets: [{ setNumber: 1, reps: 10, weight: 60, completed: 1 }],
        },
      ],
    });
    expect(updated?.exercises?.[0].perSide).toBe(0);
  });

  it("rejects negative weight unless the exercise is marked assisted", () => {
    expect(() =>
      workoutService.createTemplate(adminId, {
        name: "Non-Assisted Negative Weight",
        exercises: [{ exerciseName: "Pull-Up", category: "Bodyweight", sets: 3, reps: 8, weight: -20 }],
      })
    ).toThrow("weight cannot be negative");

    const tmpl = workoutService.createTemplate(adminId, {
      name: "Assisted Negative Weight",
      exercises: [{ exerciseName: "Pull-Up", category: "Bodyweight", sets: 3, reps: 8, weight: -20, isAssisted: 1 }],
    });
    expect(tmpl.exercises[0].defaultWeight).toBe(-20);
    expect(tmpl.exercises[0].isAssisted).toBe(1);

    const session = workoutService.createSession(adminId);
    expect(() =>
      workoutService.updateSession(session!.sessionId, adminId, {
        exercises: [
          {
            exerciseName: "Pull-Up",
            sortOrder: 0,
            category: "Bodyweight",
            sets: [{ setNumber: 1, reps: 8, weight: -20, completed: 1 }],
          },
        ],
      })
    ).toThrow("Weight cannot be negative");

    const updated = workoutService.updateSession(session!.sessionId, adminId, {
      exercises: [
        {
          exerciseName: "Pull-Up",
          sortOrder: 0,
          category: "Bodyweight",
          isAssisted: 1,
          sets: [{ setNumber: 1, reps: 8, weight: -20, completed: 1 }],
        },
      ],
    });
    expect(updated?.exercises?.[0].sets?.[0].weight).toBe(-20);
  });

  it("fires a weight PR when assistance decreases and keeps one continuous progress series across the assisted-to-added transition", () => {
    // Session 1: heavily assisted (-20kg support)
    const s1 = workoutService.createSession(adminId);
    workoutService.updateSession(s1.sessionId, adminId, {
      exercises: [
        {
          exerciseName: "Assisted Pull-Up",
          category: "Bodyweight",
          isAssisted: 1,
          sets: [{ setNumber: 1, reps: 8, weight: -20, completed: 1 }],
        },
      ],
    });
    workoutService.completeSession(s1.sessionId, adminId);

    // Session 2: less assistance (-15kg support) -> should register a weight PR
    const s2 = workoutService.createSession(adminId);
    workoutService.updateSession(s2.sessionId, adminId, {
      exercises: [
        {
          exerciseName: "Assisted Pull-Up",
          category: "Bodyweight",
          isAssisted: 1,
          sets: [{ setNumber: 1, reps: 8, weight: -15, completed: 1 }],
        },
      ],
    });
    workoutService.completeSession(s2.sessionId, adminId);

    const prs = workoutService.getSessionPRs(s2.sessionId, adminId);
    const weightPr = prs.find((p) => p.type === "weight");
    expect(weightPr).toBeDefined();
    expect(weightPr?.prevValue).toBe(-20);
    expect(weightPr?.newValue).toBe(-15);

    // Session 3: same exercise, now with added weight instead of assistance
    const s3 = workoutService.createSession(adminId);
    workoutService.updateSession(s3.sessionId, adminId, {
      exercises: [
        {
          exerciseName: "Assisted Pull-Up",
          category: "Bodyweight",
          isAssisted: 0,
          sets: [{ setNumber: 1, reps: 8, weight: 5, completed: 1 }],
        },
      ],
    });
    workoutService.completeSession(s3.sessionId, adminId);

    const progress = workoutService.exerciseProgress(adminId, "Assisted Pull-Up");
    expect(progress.sessions.length).toBe(3);
    expect(progress.sessions[0].sets[0].weight).toBe(-20);
    expect(progress.sessions[1].sets[0].weight).toBe(-15);
    expect(progress.sessions[2].sets[0].weight).toBe(5);
  });
});

