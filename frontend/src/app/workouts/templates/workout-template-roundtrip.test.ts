import { describe, expect, it } from "bun:test";
import { cleanTemplateForExport } from "./workout-template-detail";
import { normalizeImportedWorkout } from "./workout-import-modal";

const template = {
  name: "Pull day",
  exercises: [
    {
      exerciseName: "Assisted Pull-up",
      category: "Bodyweight",
      defaultSets: 3,
      defaultReps: 8,
      defaultWeight: -25,
      defaultRpe: 8,
      defaultHeartRate: 140,
      defaultRestTime: 90,
      equipment: "machine",
      perSide: 0,
      isAssisted: 1,
    },
  ],
};

describe("Template export/import round trip", () => {
  it("exports isAssisted, rpe and heart rate", () => {
    const ex = cleanTemplateForExport(template).exercises[0];
    expect(ex.isAssisted).toBe(1);
    expect(ex.rpe).toBe(8);
    expect(ex.heartRate).toBe(140);
    expect(ex.weight).toBe(-25);
  });

  it("re-imports losslessly", () => {
    const imported = normalizeImportedWorkout(JSON.parse(JSON.stringify(cleanTemplateForExport(template)))).exercises[0];
    expect(imported.isAssisted).toBe(1);
    expect(imported.rpe).toBe(8);
    expect(imported.heartRate).toBe(140);
    expect(imported.weight).toBe(-25);
  });

  it("infers assisted for legacy exports with negative weight and no flag", () => {
    const imported = normalizeImportedWorkout({
      name: "Legacy",
      exercises: [{ exerciseName: "Dip", sets: 3, reps: 8, weight: -20 }],
    }).exercises[0];
    expect(imported.isAssisted).toBe(1);
    expect(imported.weight).toBe(-20);
  });

  it("never yields a negative weight for non-assisted exercises", () => {
    const imported = normalizeImportedWorkout({
      name: "X",
      exercises: [{ exerciseName: "Curl", sets: 3, reps: 8, weight: -10, isAssisted: 0 }],
    }).exercises[0];
    expect(imported.weight).toBe(10);
    expect(imported.isAssisted).toBe(0);
  });
});
