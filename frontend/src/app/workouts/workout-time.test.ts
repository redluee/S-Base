import { describe, expect, it } from "bun:test";
import { pauseSession, resumeSession, sessionElapsedSeconds, type TimedSession } from "./workout-time";

const startedAt = "2026-01-01T10:00:00.000Z";
const base: TimedSession = { startedAt };
const at = (seconds: number) => new Date(Date.parse(startedAt) + seconds * 1000).getTime();

describe("workout session time", () => {
  it("counts wall time for a running session", () => {
    expect(sessionElapsedSeconds({ startedAt }, at(90))).toBe(90);
  });

  it("excludes accumulated paused seconds", () => {
    expect(sessionElapsedSeconds({ startedAt, pausedSeconds: 30 }, at(90))).toBe(60);
  });

  it("freezes the elapsed time while paused, even after a reload", () => {
    const paused = pauseSession(base, at(100));
    expect(sessionElapsedSeconds(paused, at(100))).toBe(100);
    expect(sessionElapsedSeconds(paused, at(500))).toBe(100);
    const reloaded = JSON.parse(JSON.stringify(paused));
    expect(sessionElapsedSeconds(reloaded, at(900))).toBe(100);
  });

  it("resumes and keeps the paused time out of the total", () => {
    const paused = pauseSession(base, at(100));
    const resumed = resumeSession(paused, at(160));
    expect(resumed.pausedAt).toBeNull();
    expect(resumed.pausedSeconds).toBe(60);
    expect(sessionElapsedSeconds(resumed, at(200))).toBe(140);
  });

  it("supports repeated pauses", () => {
    let s = pauseSession(base, at(10));
    s = resumeSession(s, at(20));
    s = pauseSession(s, at(50));
    s = resumeSession(s, at(80));
    expect(s.pausedSeconds).toBe(40);
    expect(sessionElapsedSeconds(s, at(100))).toBe(60);
  });

  it("uses the stored duration for completed sessions", () => {
    const completedAt = new Date(at(1800)).toISOString();
    expect(sessionElapsedSeconds({ startedAt, completedAt, pausedSeconds: 300 }, at(99999))).toBe(1800);
  });

  it("is idempotent when pausing a paused or resuming a running session", () => {
    const paused = pauseSession(base, at(10));
    expect(pauseSession(paused, at(20))).toBe(paused);
    const running = { startedAt };
    expect(resumeSession(running, at(20))).toBe(running);
  });
});
