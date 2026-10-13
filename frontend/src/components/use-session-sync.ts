import { useCallback, useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { cancelScheduledSound, clearActiveNotifications } from "@/lib/sound";
import { pauseSession, resumeSession, sessionElapsedSeconds } from "@/lib/workout-time";
import {
  getOfflineSession,
  saveOfflineSession,
  clearOfflineSession,
  syncOfflineSession,
  recordSyncFailure,
  buildSessionExercisesPayload,
} from "@/lib/offline-workout";
import type { FullWorkoutSession, SessionExercise } from "@backend/types/shared";

interface SessionSyncArgs {
  session: FullWorkoutSession | null;
  setSession: Dispatch<SetStateAction<FullWorkoutSession | null>>;
  sessionRef: MutableRefObject<FullWorkoutSession | null>;
  setSaving: Dispatch<SetStateAction<boolean>>;
  setElapsed: Dispatch<SetStateAction<number>>;
  sessionName: string;
  setIsEditingName: (editing: boolean) => void;
  isSummaryView: boolean;
}

export function useSessionSync({
  session,
  setSession,
  sessionRef,
  setSaving,
  setElapsed,
  sessionName,
  setIsEditingName,
  isSummaryView,
}: SessionSyncArgs) {
  const [unsynced, setUnsynced] = useState(false);
  const bypassWarningRef = useRef(false);

  // Synchronization queue and version tracking to avoid concurrent API race conditions
  const syncVersionRef = useRef(0);
  const syncPromiseChain = useRef<Promise<unknown>>(Promise.resolve());

  // Trigger sync if offline data is pending and connection is online
  useEffect(() => {
    if (session?.sessionId) {
      const offlineData = getOfflineSession(session.sessionId);
      if (offlineData?.pendingSync && navigator.onLine) {
        syncOfflineSession(session.sessionId).then((synced) => {
          if (synced) setSession(synced);
        });
      }
    }
  }, [session?.sessionId, setSession]);

  const refreshUnsynced = useCallback(() => {
    const id = sessionRef.current?.sessionId;
    setUnsynced(Boolean(id && getOfflineSession(id)?.pendingSync));
  }, [sessionRef]);

  // API operations
  async function saveExercises(exercises: SessionExercise[]) {
    if (!session) return;
    setSaving(true);
    const currentVersion = ++syncVersionRef.current;

    const updatedSession: FullWorkoutSession = {
      ...session,
      exercises,
    };
    saveOfflineSession(updatedSession, false);

    syncPromiseChain.current = syncPromiseChain.current.then(async () => {
      try {
        const s = await api.workouts.sessions.update(session.sessionId, {
          exercises: buildSessionExercisesPayload(exercises),
        });

        if (currentVersion === syncVersionRef.current) {
          setSession(s);
          clearOfflineSession(session.sessionId);
        }
        refreshUnsynced();
      } catch (err) {
        console.warn("Failed to sync exercises to server (saved offline)", err);
        const outcome = recordSyncFailure(session.sessionId, err);
        if (outcome === "dropped" && currentVersion === syncVersionRef.current) {
          const local = getOfflineSession(session.sessionId);
          if (local) setSession({ ...session, exercises: local.session.exercises });
        }
        refreshUnsynced();
      } finally {
        if (currentVersion === syncVersionRef.current) {
          setSaving(false);
        }
      }
    });

    await syncPromiseChain.current;
  }

  // Cleanup sound and timers on component unmount
  useEffect(() => {
    return () => {
      cancelScheduledSound();
      clearActiveNotifications();
    };
  }, []);

  // Warn on window leave only while changes exist that the server has not received yet
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      cancelScheduledSound();
      clearActiveNotifications();
      if (bypassWarningRef.current || !session || isSummaryView || session.completedAt) return;
      if (!getOfflineSession(session.sessionId)?.pendingSync) return;
      e.preventDefault();
      e.returnValue = t("Je laatste wijzigingen zijn nog niet naar de server gestuurd. Ze blijven op dit apparaat bewaard.");
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      cancelScheduledSound();
      clearActiveNotifications();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [session, isSummaryView]);

  // Stop / start functions
  async function togglePause() {
    if (!session || session.completedAt) return;
    const now = Date.now();
    const next = session.pausedAt ? resumeSession(session, now) : pauseSession(session, now);
    setSession(next);
    setElapsed(sessionElapsedSeconds(next, now));
    saveOfflineSession(next, false);

    const currentVersion = ++syncVersionRef.current;
    syncPromiseChain.current = syncPromiseChain.current.then(async () => {
      const synced = await syncOfflineSession(next.sessionId);
      if (synced && currentVersion === syncVersionRef.current) setSession(synced);
    });
    await syncPromiseChain.current;
  }

  async function saveWorkoutTitle() {
    if (!session || !sessionName.trim()) return;
    setIsEditingName(false);
    if (sessionName.trim() === session.name) return;
    const updatedSession: FullWorkoutSession = {
      ...session,
      name: sessionName.trim(),
    };
    setSession(updatedSession);
    saveOfflineSession(updatedSession, false);
    try {
      const s = await api.workouts.sessions.update(session.sessionId, {
        name: sessionName.trim(),
      });
      setSession(s);
      clearOfflineSession(session.sessionId);
    } catch (err) {
      console.warn("Failed to save title to server (saved offline)", err);
      recordSyncFailure(session.sessionId, err);
    }
  }

  return { unsynced, refreshUnsynced, saveExercises, togglePause, saveWorkoutTitle, syncVersionRef, syncPromiseChain, bypassWarningRef };
}
