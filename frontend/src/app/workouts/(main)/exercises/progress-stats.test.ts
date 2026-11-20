import { describe, expect, it } from "bun:test";
import type { ExerciseProgressSession } from "@backend/types/workout";
import { filterByRange, progressSummary, smoothPath, statModeFor, topValue } from "./progress-stats";

function session(id: number, startedAt: string, sets: Array<[number | null, number | null, number?]>) {
  return {
    sessionId: id,
    startedAt,
    sessionName: null,
    equipment: null,
    sets: sets.map(([reps, weight, completed = 1], i) => ({
      sessionId: id,
      startedAt,
      sessionName: null,
      exerciseName: "Squat",
      category: null,
      equipment: null,
      setNumber: i + 1,
      reps,
      weight,
      distance: null,
      duration: null,
      rpe: null,
      heartRate: null,
      completed,
    })),
  } as unknown as ExerciseProgressSession;
}

const a = session(1, "2026-01-01T10:00:00Z", [[8, 100], [6, 110]]);
const b = session(2, "2026-11-10T10:00:00Z", [[5, 120], [5, 140, 0]]);

describe("progress stats", () => {
  it("filters sessions by range", () => {
    const now = new Date("2026-11-20T00:00:00Z");
    expect(filterByRange([a, b], "1M", now)).toEqual([b]);
    expect(filterByRange([a, b], "1Y", now)).toEqual([a, b]);
    expect(filterByRange([a, b], "all", now)).toEqual([a, b]);
  });

  it("uses completed sets for the top value", () => {
    expect(topValue(b, "weight")).toBe(120);
    expect(statModeFor(a.sets)).toBe("weight");
  });

  it("summarises peak volume, reps and working weight", () => {
    const s = progressSummary([a, b], "weight");
    expect(s.latest).toBe(120);
    expect(s.delta).toBe(10);
    expect(s.peak).toEqual({ value: 1460, startedAt: a.startedAt });
    expect(s.completedReps).toBe(19);
    expect(s.workingWeight).toBe(110);
    expect(s.avgReps).toBeCloseTo(19 / 3);
  });

  it("draws a smooth path through every point", () => {
    expect(smoothPath([])).toBe("");
    const d = smoothPath([{ x: 0, y: 10 }, { x: 10, y: 0 }, { x: 20, y: 5 }]);
    expect(d.startsWith("M0,10")).toBe(true);
    expect(d.endsWith("20,5")).toBe(true);
    expect(d.match(/C/g)?.length).toBe(2);
  });
});
