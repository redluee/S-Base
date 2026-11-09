import { useEffect, useState, type MutableRefObject } from "react";
import { loadSetTimerSnapshot, clearSetTimerSnapshot, type SetTimerSnapshot } from "@/lib/set-timer";
import type { FullWorkoutSession } from "@backend/types/shared";

export function useRepTimer({
  session,
  sessionRef,
  loadedSessionId,
  completeSet,
}: {
  session: FullWorkoutSession | null;
  sessionRef: MutableRefObject<FullWorkoutSession | null>;
  loadedSessionId: number | undefined;
  completeSet: (exIdx: number, setIdx: number, durationSeconds: number) => Promise<void>;
}) {
  const [activeRepTimer, setActiveRepTimer] = useState<{
    exIdx: number;
    setIdx: number;
    exerciseName: string;
    setNumber: number;
    targetDurationSeconds?: number | null;
    restored?: SetTimerSnapshot | null;
  } | null>(null);

  useEffect(() => {
    const current = sessionRef.current;
    if (!current?.sessionId) return;
    const snap = loadSetTimerSnapshot(current.sessionId);
    if (!snap) return;
    const ex = current.exercises?.[snap.exIdx];
    const set = ex?.sets?.[snap.setIdx];
    if (current.completedAt || !ex || !set || set.completed === 1 || ex.exerciseName !== snap.exerciseName) {
      clearSetTimerSnapshot(current.sessionId);
      return;
    }
    setActiveRepTimer({
      exIdx: snap.exIdx,
      setIdx: snap.setIdx,
      exerciseName: snap.exerciseName,
      setNumber: snap.setNumber,
      targetDurationSeconds: snap.targetDurationSeconds,
      restored: snap,
    });
  }, [loadedSessionId, sessionRef]);

  function closeRepTimer() {
    if (session) clearSetTimerSnapshot(session.sessionId);
    setActiveRepTimer(null);
  }

  function handleStartRepTimer(exIdx: number, setIdx: number, targetDurationSeconds?: number | null) {
    if (!session?.exercises?.[exIdx]) return;
    const ex = session.exercises[exIdx];
    const set = ex.sets[setIdx];
    setActiveRepTimer({
      exIdx,
      setIdx,
      exerciseName: ex.exerciseName,
      setNumber: set?.setNumber ?? (setIdx + 1),
      targetDurationSeconds: set?.duration ?? targetDurationSeconds ?? null,
    });
  }

  async function handleFinishRepTimer(elapsedSeconds: number) {
    if (!activeRepTimer || !session?.exercises) return;
    const { exIdx, setIdx } = activeRepTimer;

    closeRepTimer();
    await completeSet(exIdx, setIdx, elapsedSeconds);
  }

  return { activeRepTimer, closeRepTimer, handleStartRepTimer, handleFinishRepTimer };
}
