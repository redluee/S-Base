import type { FullWorkoutSession, SessionSet } from "@backend/types/shared";
import { api } from "./api";

const STORAGE_KEY_PREFIX = "sbase_offline_session_";

export interface OfflineSessionData {
  sessionId: number;
  session: FullWorkoutSession;
  pendingSync: boolean;
  pendingComplete: boolean;
  completedAt?: string;
  updatedAt: number;
}

function getStorageKey(sessionId: number): string {
  return `${STORAGE_KEY_PREFIX}${sessionId}`;
}

export function getOfflineSession(sessionId: number): OfflineSessionData | null {
  if (typeof window === "undefined") return null;
  try {
    const dataStr = localStorage.getItem(getStorageKey(sessionId));
    if (!dataStr) return null;
    return JSON.parse(dataStr) as OfflineSessionData;
  } catch (err) {
    console.error("Failed to read offline session from localStorage", err);
    return null;
  }
}

export function saveOfflineSession(
  session: FullWorkoutSession,
  pendingComplete = false,
  completedAt?: string
): void {
  if (typeof window === "undefined" || !session?.sessionId) return;
  try {
    const existing = getOfflineSession(session.sessionId);
    const data: OfflineSessionData = {
      sessionId: session.sessionId,
      session,
      pendingSync: true,
      pendingComplete: pendingComplete || existing?.pendingComplete || false,
      completedAt: completedAt || session.completedAt || existing?.completedAt,
      updatedAt: Date.now(),
    };
    localStorage.setItem(getStorageKey(session.sessionId), JSON.stringify(data));
  } catch (err) {
    console.error("Failed to save offline session to localStorage", err);
  }
}

export function clearOfflineSession(sessionId: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(getStorageKey(sessionId));
  } catch (err) {
    console.error("Failed to clear offline session from localStorage", err);
  }
}

export function listPendingOfflineSessions(): OfflineSessionData[] {
  if (typeof window === "undefined") return [];
  const results: OfflineSessionData[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        const itemStr = localStorage.getItem(key);
        if (itemStr) {
          const parsed = JSON.parse(itemStr) as OfflineSessionData;
          if (parsed?.pendingSync && parsed?.sessionId) {
            results.push(parsed);
          }
        }
      }
    }
  } catch (err) {
    console.error("Failed to list pending offline sessions", err);
  }
  return results;
}

let isSyncing = false;

export async function syncOfflineSession(sessionId: number): Promise<FullWorkoutSession | null> {
  if (typeof window === "undefined") return null;
  if (!navigator.onLine) return null;

  const data = getOfflineSession(sessionId);
  if (!data || !data.pendingSync) return null;

  try {
    const s = data.session;
    const updatePayload = {
      name: s.name,
      notes: s.notes,
      completedAt: data.completedAt || s.completedAt,
      exercises: s.exercises?.map((ex) => ({
        sessionExerciseId: ex.sessionExerciseId,
        exerciseName: ex.exerciseName,
        sortOrder: ex.sortOrder,
        category: ex.category ?? "resistance",
        equipment: ex.equipment ?? "none",
        perSide: ex.perSide ?? (ex.templateExercise?.perSide ? 1 : 0),
        sets: ex.sets?.map((set: SessionSet) => ({
          setId: set.setId,
          setNumber: set.setNumber,
          reps: set.reps ?? null,
          weight: set.weight,
          distance: set.distance,
          duration: set.duration,
          rpe: set.rpe,
          heartRate: set.heartRate,
          completed: set.completed,
        })),
      })),
    };

    let updatedSession = await api.workouts.sessions.update(sessionId, updatePayload);

    if (data.pendingComplete) {
      const finalCompletedAt = data.completedAt || s.completedAt || new Date().toISOString();
      updatedSession = await api.workouts.sessions.complete(sessionId, finalCompletedAt);
    }

    clearOfflineSession(sessionId);
    return updatedSession;
  } catch (err) {
    console.warn(`Sync failed for offline session ${sessionId}, will retry when online.`, err);
    return null;
  }
}

export async function syncAllPendingOfflineSessions(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!navigator.onLine || isSyncing) return;

  isSyncing = true;
  try {
    const pendingList = listPendingOfflineSessions();
    for (const pending of pendingList) {
      await syncOfflineSession(pending.sessionId);
    }
  } catch (err) {
    console.error("Error during syncAllPendingOfflineSessions", err);
  } finally {
    isSyncing = false;
  }
}

let syncInitialized = false;

export function initOfflineWorkoutSync(): () => void {
  if (typeof window === "undefined") return () => {};
  if (syncInitialized) return () => {};
  syncInitialized = true;

  const handleOnline = () => {
    syncAllPendingOfflineSessions();
  };

  window.addEventListener("online", handleOnline);

  const intervalId = setInterval(() => {
    if (navigator.onLine) {
      syncAllPendingOfflineSessions();
    }
  }, 15000);

  // Initial check
  syncAllPendingOfflineSessions();

  return () => {
    window.removeEventListener("online", handleOnline);
    clearInterval(intervalId);
    syncInitialized = false;
  };
}
