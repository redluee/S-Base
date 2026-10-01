export function pauseAccumulate(accumulatedMs: number, runStartMs: number | null, nowMs: number): number {
  if (runStartMs === null) return accumulatedMs;
  return accumulatedMs + Math.max(0, nowMs - runStartMs);
}

export function setTimerElapsedMs(accumulatedMs: number, runStartMs: number | null, nowMs: number): number {
  return pauseAccumulate(accumulatedMs, runStartMs, nowMs);
}

export interface SetTimerSnapshot {
  sessionId: number;
  exIdx: number;
  setIdx: number;
  exerciseName: string;
  setNumber: number;
  targetDurationSeconds: number | null;
  targetTime: number;
  accumulatedMs: number;
  runStartMs: number | null;
}

export function setTimerStorageKey(sessionId: number): string {
  return `set_timer_active_${sessionId}`;
}

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function parseSetTimerSnapshot(raw: string | null): SetTimerSnapshot | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    if (!p || typeof p !== "object") return null;
    if (!finite(p.sessionId) || !finite(p.exIdx) || !finite(p.setIdx) || !finite(p.setNumber)) return null;
    if (typeof p.exerciseName !== "string" || !finite(p.targetTime) || p.targetTime <= 0) return null;
    if (!finite(p.accumulatedMs) || p.accumulatedMs < 0) return null;
    if (p.runStartMs !== null && !finite(p.runStartMs)) return null;
    if (p.targetDurationSeconds !== null && !finite(p.targetDurationSeconds)) return null;
    return {
      sessionId: p.sessionId,
      exIdx: p.exIdx,
      setIdx: p.setIdx,
      exerciseName: p.exerciseName,
      setNumber: p.setNumber,
      targetDurationSeconds: p.targetDurationSeconds,
      targetTime: p.targetTime,
      accumulatedMs: p.accumulatedMs,
      runStartMs: p.runStartMs,
    };
  } catch {
    return null;
  }
}

export function restoreSetTimer(snapshot: SetTimerSnapshot, nowMs: number) {
  const runStartMs = snapshot.runStartMs === null ? null : Math.min(snapshot.runStartMs, nowMs);
  return {
    isRunning: runStartMs !== null,
    accumulatedMs: snapshot.accumulatedMs,
    runStartMs,
    elapsedMs: setTimerElapsedMs(snapshot.accumulatedMs, runStartMs, nowMs),
  };
}

export function loadSetTimerSnapshot(sessionId: number): SetTimerSnapshot | null {
  try {
    const snap = parseSetTimerSnapshot(localStorage.getItem(setTimerStorageKey(sessionId)));
    return snap && snap.sessionId === sessionId ? snap : null;
  } catch {
    return null;
  }
}

export function saveSetTimerSnapshot(snapshot: SetTimerSnapshot): void {
  try {
    localStorage.setItem(setTimerStorageKey(snapshot.sessionId), JSON.stringify(snapshot));
  } catch {
    // storage unavailable
  }
}

export function clearSetTimerSnapshot(sessionId: number): void {
  try {
    localStorage.removeItem(setTimerStorageKey(sessionId));
  } catch {
    // storage unavailable
  }
}
