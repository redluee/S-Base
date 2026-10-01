import { describe, expect, it } from "bun:test";
import { ApiError } from "./api";
import {
  closeConflictingSession,
  conflictResolution,
  hasLocalCompletedSets,
  parseSessionConflict,
  type ActiveSessionInfo,
} from "./session-conflict";

describe("parseSessionConflict", () => {
  it("extracts the running session from a 409 response", () => {
    const err = new ApiError("A workout session is already running", 409, {
      error: "A workout session is already running",
      activeSession: { sessionId: 12, templateId: 3, name: "Push", startedAt: "2026-01-01T10:00:00Z", exerciseCount: 4, completedSetsCount: 2 },
    });
    expect(parseSessionConflict(err)).toEqual({
      sessionId: 12,
      templateId: 3,
      name: "Push",
      startedAt: "2026-01-01T10:00:00Z",
      exerciseCount: 4,
      completedSetsCount: 2,
    });
  });

  it("ignores other errors", () => {
    expect(parseSessionConflict(new ApiError("bad", 400, {}))).toBeNull();
    expect(parseSessionConflict(new ApiError("conflict", 409, { error: "x" }))).toBeNull();
    expect(parseSessionConflict(new Error("x"))).toBeNull();
    expect(parseSessionConflict(null)).toBeNull();
  });
});

const info = (completedSetsCount: number): ActiveSessionInfo => ({
  sessionId: 7,
  templateId: null,
  name: "Pull",
  startedAt: "2026-01-01T10:00:00Z",
  exerciseCount: 2,
  completedSetsCount,
});

describe("conflictResolution", () => {
  it("completes a session that has completed sets", () => {
    expect(conflictResolution(info(3))).toBe("complete");
  });

  it("deletes a session without completed sets", () => {
    expect(conflictResolution(info(0))).toBe("delete");
    expect(conflictResolution(info(0), { exercises: [{ sets: [{ completed: 0 }] }] })).toBe("delete");
  });

  it("keeps locally completed sets that the server has not seen yet", () => {
    expect(conflictResolution(info(0), { exercises: [{ sets: [{ completed: 0 }, { completed: 1 }] }] })).toBe("complete");
  });

  it("detects local completed sets defensively", () => {
    expect(hasLocalCompletedSets(null)).toBe(false);
    expect(hasLocalCompletedSets({ exercises: null })).toBe(false);
    expect(hasLocalCompletedSets({ exercises: [{ sets: null }] })).toBe(false);
  });
});

function fakeClient(overrides: Partial<Record<"complete" | "delete" | "syncLocal", (id: number) => Promise<unknown>>> = {}) {
  const calls: string[] = [];
  const client = {
    complete: overrides.complete ?? (async (id: number) => { calls.push(`complete:${id}`); }),
    delete: overrides.delete ?? (async (id: number) => { calls.push(`delete:${id}`); }),
    syncLocal: overrides.syncLocal ?? (async (id: number) => { calls.push(`sync:${id}`); }),
    clearLocal: (id: number, resolution: string) => { calls.push(`clear:${id}:${resolution}`); },
  };
  return { client, calls };
}

describe("closeConflictingSession", () => {
  it("syncs local changes before completing", async () => {
    const { client, calls } = fakeClient();
    await closeConflictingSession(info(2), "complete", client);
    expect(calls).toEqual(["sync:7", "complete:7", "clear:7:complete"]);
  });

  it("deletes and clears local data", async () => {
    const { client, calls } = fakeClient();
    await closeConflictingSession(info(0), "delete", client);
    expect(calls).toEqual(["delete:7", "clear:7:delete"]);
  });

  it("still completes when the local sync fails", async () => {
    const { client, calls } = fakeClient({ syncLocal: async () => { throw new Error("offline"); } });
    await closeConflictingSession(info(2), "complete", client);
    expect(calls).toEqual(["complete:7", "clear:7:complete"]);
  });

  it("treats an already removed session as closed", async () => {
    const { client, calls } = fakeClient({ delete: async () => { throw new ApiError("Not Found", 404); } });
    await closeConflictingSession(info(0), "delete", client);
    expect(calls).toEqual(["clear:7:delete"]);
  });

  it("propagates other failures without clearing local data", async () => {
    const { client, calls } = fakeClient({ complete: async () => { throw new ApiError("boom", 500); } });
    await expect(closeConflictingSession(info(2), "complete", client)).rejects.toThrow("boom");
    expect(calls).toEqual(["sync:7"]);
  });
});
