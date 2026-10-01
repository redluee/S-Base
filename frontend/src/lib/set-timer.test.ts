import { describe, expect, it } from "bun:test";
import { pauseAccumulate, setTimerElapsedMs } from "./set-timer";

describe("set timer pause accounting", () => {
  it("only counts running time, not paused time", () => {
    let acc = 0;
    acc = pauseAccumulate(acc, 1000, 11000);
    expect(acc).toBe(10000);
    expect(setTimerElapsedMs(acc, null, 500000)).toBe(10000);
    expect(setTimerElapsedMs(acc, 600000, 605000)).toBe(15000);
  });

  it("never goes negative on clock skew and ignores pause when not running", () => {
    expect(pauseAccumulate(2000, 5000, 4000)).toBe(2000);
    expect(pauseAccumulate(2000, null, 9000)).toBe(2000);
  });
});

import { parseSetTimerSnapshot, restoreSetTimer, type SetTimerSnapshot } from "./set-timer";

const snap: SetTimerSnapshot = {
  sessionId: 7, exIdx: 1, setIdx: 0, exerciseName: "Plank", setNumber: 1,
  targetDurationSeconds: 60, targetTime: 60, accumulatedMs: 10000, runStartMs: null,
};

describe("set timer persistence restore", () => {
  it("round-trips a snapshot through JSON", () => {
    expect(parseSetTimerSnapshot(JSON.stringify(snap))).toEqual(snap);
  });

  it("rejects missing or corrupt data", () => {
    expect(parseSetTimerSnapshot(null)).toBeNull();
    expect(parseSetTimerSnapshot("{nope")).toBeNull();
    expect(parseSetTimerSnapshot(JSON.stringify({ ...snap, accumulatedMs: -1 }))).toBeNull();
    expect(parseSetTimerSnapshot(JSON.stringify({ ...snap, targetTime: 0 }))).toBeNull();
    expect(parseSetTimerSnapshot(JSON.stringify({ ...snap, runStartMs: "x" }))).toBeNull();
  });

  it("restores a paused timer without counting the time away", () => {
    const r = restoreSetTimer(snap, 9_000_000);
    expect(r.isRunning).toBe(false);
    expect(r.elapsedMs).toBe(10000);
    expect(r.runStartMs).toBeNull();
  });

  it("restores a running timer and keeps counting from its start time", () => {
    const r = restoreSetTimer({ ...snap, runStartMs: 100_000 }, 105_000);
    expect(r.isRunning).toBe(true);
    expect(r.elapsedMs).toBe(15000);
  });

  it("clamps a start time in the future (clock skew)", () => {
    const r = restoreSetTimer({ ...snap, runStartMs: 200_000 }, 100_000);
    expect(r.elapsedMs).toBe(10000);
  });
});
