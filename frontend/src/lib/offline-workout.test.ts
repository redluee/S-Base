import { describe, expect, it, beforeEach } from "bun:test";
import type { FullWorkoutSession } from "@backend/types/shared";
import {
  saveOfflineSession,
  getOfflineSession,
  clearOfflineSession,
  listPendingOfflineSessions,
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
