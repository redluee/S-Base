import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { api, ApiError } from "./api";
import type { FullWorkoutSession } from "@backend/types/shared";
import {
  saveOfflineSession,
  getOfflineSession,
  clearOfflineSession,
  listPendingOfflineSessions,
  listRejectedOfflineSessions,
  syncOfflineSession,
  syncAllPendingOfflineSessions,
  retryOfflineSession,
  buildSessionExercisesPayload,
  classifySyncError,
  createTempExerciseId,
  ensureExerciseIds,
  setExerciseAssisted,
  readSyncWarnings,
  dismissSyncWarning,
  UNKNOWN_EXERCISE_WARNING,
} from "./offline-workout";

class MockLocalStorage {
  private store: Record<string, string> = {};
  get length() {
    return Object.keys(this.store).length;
  }
  getItem(key: string) {
    return this.store[key] || null;
  }
  setItem(key: string, val: string) {
    this.store[key] = val;
  }
  removeItem(key: string) {
    delete this.store[key];
  }
  key(i: number) {
    return Object.keys(this.store)[i] || null;
  }
  clear() {
    this.store = {};
  }
}

describe("Frontend offline workout storage", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "window", { value: {}, writable: true, configurable: true });
    Object.defineProperty(globalThis, "localStorage", { value: new MockLocalStorage(), writable: true, configurable: true });
  });

  it("saves and retrieves offline session data", () => {
    const session: FullWorkoutSession = {
      sessionId: 42,
      userId: 1,
      name: "Offline Workout",
      startedAt: "2026-08-12T10:00:00Z",
      completedAt: null,
      notes: null,
      templateId: null,
      exercises: [],
    };

    saveOfflineSession(session, false);

    const offlineData = getOfflineSession(42);
    expect(offlineData).not.toBeNull();
    expect(offlineData?.sessionId).toBe(42);
    expect(offlineData?.pendingSync).toBe(true);

    const pending = listPendingOfflineSessions();
    expect(pending.length).toBe(1);

    clearOfflineSession(42);
    expect(getOfflineSession(42)).toBeNull();
  });
});

function makeSession(exercises: FullWorkoutSession["exercises"]): FullWorkoutSession {
  return {
    sessionId: 7,
    userId: 1,
    name: "S",
    startedAt: "2026-08-12T10:00:00Z",
    completedAt: null,
    notes: null,
    templateId: null,
    exercises,
  };
}

const assistedExercise = {
  sessionExerciseId: 11,
  exerciseName: "Assisted Pull-up",
  sortOrder: 0,
  category: "bodyweight",
  isAssisted: 1,
  sets: [{ setNumber: 1, reps: 8, weight: -20, completed: 1 }],
};

describe("Session payload building", () => {
  it("preserves isAssisted, category and negative weights for assisted exercises", () => {
    const payload = buildSessionExercisesPayload([assistedExercise])!;
    expect(payload[0].isAssisted).toBe(1);
    expect(payload[0].category).toBe("bodyweight");
    expect(payload[0].sets![0].weight).toBe(-20);
  });

  it("falls back to template isAssisted when the exercise has none", () => {
    const payload = buildSessionExercisesPayload([
      { ...assistedExercise, isAssisted: undefined, templateExercise: { isAssisted: 1 } },
    ])!;
    expect(payload[0].isAssisted).toBe(1);
  });

  it("never sends a negative weight for non-assisted exercises", () => {
    const payload = buildSessionExercisesPayload([
      { ...assistedExercise, isAssisted: 0, sets: [{ setNumber: 1, weight: -5, completed: 0 }] },
    ])!;
    expect(payload[0].sets![0].weight).toBe(5);
  });

  it("toggling assisted inverts existing weights both ways", () => {
    const toStandard = setExerciseAssisted(assistedExercise, false);
    expect(toStandard.isAssisted).toBe(0);
    expect(toStandard.sets[0].weight).toBe(20);
    const back = setExerciseAssisted(toStandard, true);
    expect(back.sets[0].weight).toBe(-20);
    expect(setExerciseAssisted({ ...assistedExercise, sets: [{ setNumber: 1, weight: null, completed: 0 }] }, false).sets[0].weight).toBeNull();
  });

  it("strips temporary client ids from the payload but keeps real ones", () => {
    const tempId = createTempExerciseId();
    const payload = buildSessionExercisesPayload([
      { ...assistedExercise, sessionExerciseId: tempId },
      assistedExercise,
    ])!;
    expect(payload[0].sessionExerciseId).toBeUndefined();
    expect(payload[1].sessionExerciseId).toBe(11);
  });
});

describe("Stable client exercise ids", () => {
  it("generates unique negative ids", () => {
    const ids = new Set(Array.from({ length: 2000 }, () => createTempExerciseId()));
    expect(ids.size).toBe(2000);
    for (const id of ids) expect(id).toBeLessThan(0);
  });

  it("assigns ids to legacy exercises without one and leaves others", () => {
    const result = ensureExerciseIds([
      { exerciseName: "A", sortOrder: 0, sets: [] },
      { exerciseName: "B", sortOrder: 1, sets: [] },
      { sessionExerciseId: 5, exerciseName: "C", sortOrder: 2, sets: [] },
    ]);
    expect(result[0].sessionExerciseId).toBeDefined();
    expect(result[0].sessionExerciseId).not.toBe(result[1].sessionExerciseId);
    expect(result[2].sessionExerciseId).toBe(5);
    const again = ensureExerciseIds(result);
    expect(again).toBe(result);
  });
});

describe("Sync error classification", () => {
  it("treats network errors and gateway failures as transient", () => {
    expect(classifySyncError(new TypeError("Failed to fetch"))).toBe("transient");
    expect(classifySyncError(new ApiError("x", 503))).toBe("transient");
    expect(classifySyncError(new ApiError("x", 401))).toBe("transient");
  });
  it("treats client errors as permanent and 500 as a retried server error", () => {
    expect(classifySyncError(new ApiError("Weight cannot be negative", 400))).toBe("permanent");
    expect(classifySyncError(new ApiError("x", 404))).toBe("permanent");
    expect(classifySyncError(new ApiError("x", 500))).toBe("server");
  });
});

type SyncPayload = {
  pausedAt?: string | null;
  pausedSeconds?: number;
  exercises?: { sessionExerciseId?: number; exerciseName: string; sortOrder: number; restTime?: number }[];
};

describe("Offline sync loop robustness", () => {
  const original = api.workouts.sessions.update;
  let calls = 0;

  beforeEach(() => {
    Object.defineProperty(globalThis, "window", { value: {}, writable: true, configurable: true });
    Object.defineProperty(globalThis, "navigator", { value: { onLine: true }, writable: true, configurable: true });
    Object.defineProperty(globalThis, "localStorage", { value: new MockLocalStorage(), writable: true, configurable: true });
    calls = 0;
  });
  afterEach(() => {
    api.workouts.sessions.update = original;
  });

  it("keeps pending data and retries on network failure", async () => {
    api.workouts.sessions.update = (async () => {
      calls++;
      throw new TypeError("Failed to fetch");
    }) as typeof original;
    saveOfflineSession(makeSession([assistedExercise]));
    await syncAllPendingOfflineSessions();
    await syncAllPendingOfflineSessions();
    expect(calls).toBe(2);
    expect(listPendingOfflineSessions().length).toBe(1);
    expect(listRejectedOfflineSessions().length).toBe(0);
  });

  it("stops retrying after a permanent rejection and exposes it", async () => {
    api.workouts.sessions.update = (async () => {
      calls++;
      throw new ApiError("Weight cannot be negative", 400);
    }) as typeof original;
    saveOfflineSession(makeSession([assistedExercise]));
    await syncAllPendingOfflineSessions();
    await syncAllPendingOfflineSessions();
    await syncAllPendingOfflineSessions();
    expect(calls).toBe(1);
    const rejected = listRejectedOfflineSessions();
    expect(rejected.length).toBe(1);
    expect(rejected[0].syncError).toBe("Weight cannot be negative");
    expect(listPendingOfflineSessions().length).toBe(0);
    expect(getOfflineSession(7)?.session.exercises[0].sets[0].weight).toBe(-20);
  });

  it("keeps retrying 500 responses and never moves them to rejected", async () => {
    api.workouts.sessions.update = (async () => {
      calls++;
      throw new ApiError("boom", 500);
    }) as typeof original;
    saveOfflineSession(makeSession([assistedExercise]));
    for (let i = 0; i < 10; i++) await syncAllPendingOfflineSessions();
    expect(calls).toBe(10);
    expect(listRejectedOfflineSessions().length).toBe(0);
    expect(listPendingOfflineSessions().length).toBe(1);
    expect(getOfflineSession(7)?.syncStatus).toBe("pending");
  });

  it("clears a session once the server recovers from 500 responses", async () => {
    let fail = true;
    api.workouts.sessions.update = (async () => {
      calls++;
      if (fail) throw new ApiError("boom", 500);
      return makeSession([]);
    }) as typeof original;
    saveOfflineSession(makeSession([assistedExercise]));
    for (let i = 0; i < 4; i++) await syncAllPendingOfflineSessions();
    fail = false;
    await syncAllPendingOfflineSessions();
    expect(getOfflineSession(7)).toBeNull();
  });

  it("drops an unknown exercise, retries without it and shows a warning", async () => {
    const payloads: SyncPayload[] = [];
    api.workouts.sessions.update = (async (_id: number, payload: SyncPayload) => {
      payloads.push(payload);
      const ids = (payload.exercises ?? []).map((e) => e.sessionExerciseId);
      if (ids.includes(999)) {
        throw new ApiError("Exercise does not belong to this session", 400, {
          error: "Exercise does not belong to this session",
          code: "unknown_session_exercise",
          sessionExerciseId: 999,
        });
      }
      return makeSession([]);
    }) as typeof original;
    const stale = { ...assistedExercise, sessionExerciseId: 999, exerciseName: "Stale" };
    const good = { ...assistedExercise, sessionExerciseId: 5, exerciseName: "Good" };
    saveOfflineSession(makeSession([stale, good]));
    const res = await syncOfflineSession(7);
    expect(res).not.toBeNull();
    expect(payloads.length).toBe(2);
    expect(payloads[1].exercises!.map((e) => e.exerciseName)).toEqual(["Good"]);
    expect(payloads[1].exercises![0].sortOrder).toBe(0);
    expect(getOfflineSession(7)).toBeNull();
    const warnings = readSyncWarnings();
    expect(warnings.length).toBe(1);
    expect(warnings[0].sessionId).toBe(7);
    expect(warnings[0].message).toBe(UNKNOWN_EXERCISE_WARNING);
    dismissSyncWarning(warnings[0].id);
    expect(readSyncWarnings().length).toBe(0);
  });

  it("does not treat other 400 errors as unknown exercises", async () => {
    api.workouts.sessions.update = (async () => {
      throw new ApiError("Reps cannot be negative", 400, { error: "Reps cannot be negative" });
    }) as typeof original;
    saveOfflineSession(makeSession([assistedExercise]));
    await syncOfflineSession(7);
    expect(listRejectedOfflineSessions().length).toBe(1);
    expect(readSyncWarnings().length).toBe(0);
  });

  it("sends pause state and rest time to the server", async () => {
    let payload!: SyncPayload;
    api.workouts.sessions.update = (async (_id: number, p: SyncPayload) => {
      payload = p;
      return makeSession([]);
    }) as typeof original;
    const session = makeSession([{ ...assistedExercise, restTime: 45 }]);
    saveOfflineSession({ ...session, pausedAt: "2026-08-12T10:05:00.000Z", pausedSeconds: 30 });
    await syncOfflineSession(7);
    expect(payload.pausedAt).toBe("2026-08-12T10:05:00.000Z");
    expect(payload.pausedSeconds).toBe(30);
    expect(payload.exercises![0].restTime).toBe(45);
  });

  it("manual retry resumes a rejected session and clears it on success", async () => {
    let fail = true;
    api.workouts.sessions.update = (async () => {
      calls++;
      if (fail) throw new ApiError("bad", 400);
      return makeSession([]);
    }) as typeof original;
    saveOfflineSession(makeSession([assistedExercise]));
    await syncOfflineSession(7);
    expect(listRejectedOfflineSessions().length).toBe(1);
    fail = false;
    const res = await retryOfflineSession(7);
    expect(res).not.toBeNull();
    expect(getOfflineSession(7)).toBeNull();
  });

  it("new local edits reset a rejected session to pending", async () => {
    api.workouts.sessions.update = (async () => {
      throw new ApiError("bad", 400);
    }) as typeof original;
    saveOfflineSession(makeSession([assistedExercise]));
    await syncOfflineSession(7);
    expect(listRejectedOfflineSessions().length).toBe(1);
    saveOfflineSession(makeSession([]));
    expect(listRejectedOfflineSessions().length).toBe(0);
    expect(listPendingOfflineSessions().length).toBe(1);
  });
});
