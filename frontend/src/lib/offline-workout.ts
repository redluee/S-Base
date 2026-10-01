import type { FullWorkoutSession, SessionExercise, SessionSet } from "@backend/types/shared";
import { api, ApiError } from "./api";

const STORAGE_KEY_PREFIX = "sbase_offline_session_";

export interface OfflineSessionData {
  sessionId: number;
  session: FullWorkoutSession;
  pendingSync: boolean;
  pendingComplete: boolean;
  completedAt?: string;
  updatedAt: number;
  syncStatus?: "pending" | "rejected";
  syncError?: string;
  failedAttempts?: number;
}

export const OFFLINE_SYNC_EVENT = "sbase:offline-sync-change";
export const SYNC_WARNING_KEY = "sbase_offline_sync_warnings";

export interface SyncWarning {
  id: string;
  sessionId: number;
  message: string;
  at: number;
}

export type SyncFailureKind = "transient" | "permanent" | "server";

export function classifySyncError(err: unknown): SyncFailureKind {
  if (!(err instanceof ApiError)) return "transient";
  const status = err.status;
  if (status === 401 || status === 403 || status === 408 || status === 425 || status === 429) return "transient";
  if (status === 502 || status === 503 || status === 504) return "transient";
  if (status >= 400 && status < 500) return "permanent";
  return "server";
}

function notifySyncChange(): void {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
  try {
    window.dispatchEvent(new Event(OFFLINE_SYNC_EVENT));
  } catch {
    // ignore
  }
}

let tempIdCounter = Date.now();

export function createTempExerciseId(): number {
  tempIdCounter += 1;
  return -tempIdCounter;
}

export function isTempExerciseId(id: number | undefined | null): boolean {
  return typeof id === "number" && id < 0;
}

export function ensureExerciseIds(exercises: SessionExercise[]): SessionExercise[] {
  const used = new Set<number>();
  for (const ex of exercises) {
    if (ex.sessionExerciseId != null) used.add(ex.sessionExerciseId);
  }
  let changed = false;
  const result = exercises.map((ex) => {
    if (ex.sessionExerciseId != null) return ex;
    changed = true;
    let id = createTempExerciseId();
    while (used.has(id)) id = createTempExerciseId();
    used.add(id);
    return { ...ex, sessionExerciseId: id };
  });
  return changed ? result : exercises;
}

export function normalizeWeightSign(weight: number | null | undefined, isAssisted: boolean): number | null | undefined {
  if (weight == null || weight === 0 || Number.isNaN(weight)) return weight;
  const abs = Math.abs(weight);
  return isAssisted ? -abs : abs;
}

export function isExerciseAssisted(ex: SessionExercise): boolean {
  return ex.isAssisted != null ? Boolean(ex.isAssisted) : Boolean(ex.templateExercise?.isAssisted);
}

export function buildSessionExercisesPayload(exercises: SessionExercise[] | undefined) {
  return exercises?.map((ex) => {
    const assisted = isExerciseAssisted(ex);
    return {
      sessionExerciseId: isTempExerciseId(ex.sessionExerciseId) ? undefined : ex.sessionExerciseId,
      exerciseName: ex.exerciseName,
      sortOrder: ex.sortOrder,
      category: ex.category ?? "resistance",
      equipment: ex.equipment ?? "none",
      perSide: ex.perSide != null ? (ex.perSide ? 1 : 0) : (ex.templateExercise?.perSide ? 1 : 0),
      isAssisted: assisted ? 1 : 0,
      restTime: ex.restTime ?? undefined,
      sets: ex.sets?.map((set: SessionSet) => ({
        setId: set.setId,
        setNumber: set.setNumber,
        reps: set.reps ?? null,
        weight: normalizeWeightSign(set.weight, assisted),
        distance: set.distance,
        duration: set.duration,
        rpe: set.rpe,
        heartRate: set.heartRate,
        completed: set.completed,
      })),
    };
  });
}

export function setExerciseAssisted(exercise: SessionExercise, isAssisted: boolean): SessionExercise {
  return {
    ...exercise,
    isAssisted: isAssisted ? 1 : 0,
    sets: exercise.sets?.map((set) => ({ ...set, weight: normalizeWeightSign(set.weight, isAssisted) })),
  };
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
      syncStatus: "pending",
    };
    localStorage.setItem(getStorageKey(session.sessionId), JSON.stringify(data));
    if (existing?.syncStatus === "rejected") notifySyncChange();
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
  notifySyncChange();
}

function readAllOffline(): OfflineSessionData[] {
  const results: OfflineSessionData[] = [];
  if (typeof window === "undefined") return results;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        const itemStr = localStorage.getItem(key);
        if (itemStr) {
          const parsed = JSON.parse(itemStr) as OfflineSessionData;
          if (parsed?.pendingSync && parsed?.sessionId) results.push(parsed);
        }
      }
    }
  } catch (err) {
    console.error("Failed to list pending offline sessions", err);
  }
  return results;
}

export function readSyncWarnings(): SyncWarning[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SYNC_WARNING_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as SyncWarning[]) : [];
  } catch {
    return [];
  }
}

function writeSyncWarnings(warnings: SyncWarning[]): void {
  try {
    localStorage.setItem(SYNC_WARNING_KEY, JSON.stringify(warnings));
  } catch (err) {
    console.error("Failed to store sync warnings", err);
  }
  notifySyncChange();
}

export function addSyncWarning(sessionId: number, message: string): void {
  const warnings = readSyncWarnings();
  warnings.push({ id: `${sessionId}-${Date.now()}-${warnings.length}`, sessionId, message, at: Date.now() });
  writeSyncWarnings(warnings);
}

export function dismissSyncWarning(id: string): void {
  writeSyncWarnings(readSyncWarnings().filter((w) => w.id !== id));
}

export const UNKNOWN_EXERCISE_CODE = "unknown_session_exercise";
export const UNKNOWN_EXERCISE_WARNING =
  "An exercise no longer exists on the server and was removed from your local workout. Its sets could not be synced.";

export function getUnknownExerciseId(err: unknown): number | null {
  if (!(err instanceof ApiError) || err.status !== 400) return null;
  if (err.data?.code !== UNKNOWN_EXERCISE_CODE) return null;
  const id = err.data.sessionExerciseId;
  return typeof id === "number" ? id : null;
}

export type SyncFailureOutcome = "retry" | "rejected" | "dropped";

export function recordSyncFailure(sessionId: number, err: unknown): SyncFailureOutcome {
  const data = getOfflineSession(sessionId);
  if (!data) return "retry";

  const unknownId = getUnknownExerciseId(err);
  if (unknownId !== null) {
    const exercises = (data.session.exercises ?? [])
      .filter((ex) => ex.sessionExerciseId !== unknownId)
      .map((ex, i) => ({ ...ex, sortOrder: i }));
    try {
      localStorage.setItem(
        getStorageKey(sessionId),
        JSON.stringify({
          ...data,
          session: { ...data.session, exercises },
          failedAttempts: 0,
          syncError: undefined,
          syncStatus: "pending",
        } satisfies OfflineSessionData)
      );
    } catch (e) {
      console.error("Failed to drop unknown exercise from offline session", e);
    }
    addSyncWarning(sessionId, UNKNOWN_EXERCISE_WARNING);
    return "dropped";
  }

  const kind = classifySyncError(err);
  if (kind === "transient") return "retry";
  const attempts = (data.failedAttempts ?? 0) + 1;
  const rejected = kind === "permanent";
  const message = err instanceof Error ? err.message : String(err);
  try {
    localStorage.setItem(
      getStorageKey(sessionId),
      JSON.stringify({
        ...data,
        failedAttempts: attempts,
        syncError: message,
        syncStatus: rejected ? "rejected" : "pending",
      } satisfies OfflineSessionData)
    );
  } catch (e) {
    console.error("Failed to record sync failure", e);
  }
  if (rejected) notifySyncChange();
  return rejected ? "rejected" : "retry";
}

export function listRejectedOfflineSessions(): OfflineSessionData[] {
  return readAllOffline().filter((d) => d.syncStatus === "rejected");
}

export function retryOfflineSession(sessionId: number): Promise<FullWorkoutSession | null> {
  const data = getOfflineSession(sessionId);
  if (data) {
    try {
      localStorage.setItem(
        getStorageKey(sessionId),
        JSON.stringify({ ...data, syncStatus: "pending", failedAttempts: 0, syncError: undefined })
      );
    } catch (err) {
      console.error("Failed to reset offline sync state", err);
    }
    notifySyncChange();
  }
  return syncOfflineSession(sessionId, true);
}

export function listPendingOfflineSessions(): OfflineSessionData[] {
  return readAllOffline().filter((d) => d.syncStatus !== "rejected");
}

let isSyncing = false;

export async function syncOfflineSession(sessionId: number, manual = false): Promise<FullWorkoutSession | null> {
  if (typeof window === "undefined") return null;
  if (!navigator.onLine) return null;

  const data = getOfflineSession(sessionId);
  if (!data || !data.pendingSync) return null;
  if (data.syncStatus === "rejected" && !manual) return null;

  try {
    const s = data.session;
    const updatePayload = {
      name: s.name,
      notes: s.notes,
      completedAt: data.completedAt || s.completedAt,
      pausedAt: s.pausedAt ?? null,
      pausedSeconds: s.pausedSeconds ?? 0,
      exercises: buildSessionExercisesPayload(s.exercises),
    };

    let updatedSession = await api.workouts.sessions.update(sessionId, updatePayload);

    if (data.pendingComplete) {
      const finalCompletedAt = data.completedAt || s.completedAt || new Date().toISOString();
      updatedSession = await api.workouts.sessions.complete(sessionId, finalCompletedAt);
    }

    clearOfflineSession(sessionId);
    return updatedSession;
  } catch (err) {
    const outcome = recordSyncFailure(sessionId, err);
    if (outcome === "dropped") return syncOfflineSession(sessionId, manual);
    console.warn(
      outcome === "rejected"
        ? `Sync rejected for offline session ${sessionId}, manual action required.`
        : `Sync failed for offline session ${sessionId}, will retry.`,
      err
    );
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
