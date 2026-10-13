import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { FullWorkoutSession, SessionSet } from "@backend/types/shared";

export function usePreviousSets(session: FullWorkoutSession | null) {
  const [previousSetsMap, setPreviousSetsMap] = useState<Record<string, SessionSet[]>>({});

  // Fetch previous sets mapping to show smart ghost targets
  useEffect(() => {
    if (session?.exercises?.length) {
      const uniqueNames: string[] = Array.from(new Set(session.exercises.map((e) => e.exerciseName)));
      uniqueNames.forEach(async (name) => {
        try {
          const res = await api.workouts.exercises.progress(name);
          if (res?.sessions?.length) {
            const completedSessions = res.sessions.filter((s) => s.sets?.length > 0);
            if (completedSessions.length) {
              const lastCompleted = completedSessions[completedSessions.length - 1];
              setPreviousSetsMap((prev) => ({
                ...prev,
                [name]: lastCompleted.sets,
              }));
            }
          }
        } catch (err) {
          console.error("Failed to load prev sets for", name, err);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.exercises?.length]);

  return [previousSetsMap, setPreviousSetsMap] as const;
}
