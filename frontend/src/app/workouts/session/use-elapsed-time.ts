import { useEffect, useState, type MutableRefObject } from "react";
import { sessionElapsedSeconds } from "@/lib/workout-time";
import type { FullWorkoutSession } from "@backend/types/shared";

export function useElapsedTime(
  session: FullWorkoutSession | null,
  sessionRef: MutableRefObject<FullWorkoutSession | null>,
  isPaused: boolean,
  isSummaryView: boolean
) {
  const [elapsed, setElapsed] = useState(0);

  // Derive elapsed time from the persisted timestamps and pause state
  useEffect(() => {
    if (session) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setElapsed(sessionElapsedSeconds(session, Date.now()));
    }
  }, [session, sessionRef]);

  // Main timer tick
  useEffect(() => {
    if (!session?.sessionId || isPaused || isSummaryView || session?.completedAt) return;

    const interval = setInterval(() => {
      const current = sessionRef.current;
      if (current) setElapsed(sessionElapsedSeconds(current, Date.now()));
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.sessionId, isPaused, isSummaryView, session?.completedAt, sessionRef]);

  return [elapsed, setElapsed] as const;
}
