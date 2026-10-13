import { useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { parseDateString } from "@/lib/utils";
import { isSetZero } from "@/components/workout-exercise-card";
import { clearSetTimerSnapshot } from "@/lib/set-timer";
import { sessionElapsedSeconds } from "@/lib/workout-time";
import {
  saveOfflineSession,
  clearOfflineSession,
  syncOfflineSession,
  buildSessionExercisesPayload,
} from "@/lib/offline-workout";
import type { FullWorkoutSession, PersonalRecord, SessionSet } from "@backend/types/shared";

interface FinishArgs {
  session: FullWorkoutSession | null;
  setSession: Dispatch<SetStateAction<FullWorkoutSession | null>>;
  sessionRef: MutableRefObject<FullWorkoutSession | null>;
  loadedSessionId: number | undefined;
  sessionName: string;
  previousSetsMap: Record<string, SessionSet[]>;
  elapsed: number;
  setElapsed: Dispatch<SetStateAction<number>>;
  isSummaryView: boolean;
  setIsSummaryView: Dispatch<SetStateAction<boolean>>;
  setSaving: Dispatch<SetStateAction<boolean>>;
  setActionError: Dispatch<SetStateAction<string | null>>;
  refreshUnsynced: () => void;
  syncVersionRef: MutableRefObject<number>;
  syncPromiseChain: MutableRefObject<Promise<unknown>>;
  bypassWarningRef: MutableRefObject<boolean>;
  autoFinish: boolean;
}

export function useSessionFinish({
  session,
  setSession,
  sessionRef,
  loadedSessionId,
  sessionName,
  previousSetsMap,
  elapsed,
  setElapsed,
  isSummaryView,
  setIsSummaryView,
  setSaving,
  setActionError,
  refreshUnsynced,
  syncVersionRef,
  syncPromiseChain,
  bypassWarningRef,
  autoFinish,
}: FinishArgs) {
  const router = useRouter();
  const elapsedSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingElapsedRef = useRef<number | null>(null);

  // Finished / Summary View state
  const [showFinishedWarning, setShowFinishedWarning] = useState(false);
  const [showZeroRepsWarning, setShowZeroRepsWarning] = useState(false);
  const [highlightZeroReps, setHighlightZeroReps] = useState(false);
  const [summaryNotes, setSummaryNotes] = useState("");
  const [summaryHours, setSummaryHours] = useState("0");
  const [summaryMinutes, setSummaryMinutes] = useState("0");
  const [summarySeconds, setSummarySeconds] = useState("0");
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);
  const [savedLocally, setSavedLocally] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [discarding, setDiscarding] = useState(false);

  useEffect(() => {
    return () => {
      if (elapsedSaveTimerRef.current) clearTimeout(elapsedSaveTimerRef.current);
    };
  }, []);

  async function persistElapsedSeconds(newSeconds: number) {
    const current = sessionRef.current;
    if (!current) return;
    pendingElapsedRef.current = null;
    try {
      const startedTime = parseDateString(current.startedAt).getTime();
      const finalCompletedAt = new Date(startedTime + newSeconds * 1000).toISOString();
      const sRes = await api.workouts.sessions.update(current.sessionId, {
        completedAt: finalCompletedAt,
      });
      setSession((prev) => (prev ? { ...prev, completedAt: sRes.completedAt } : prev));
    } catch (err) {
      console.error("Failed to update elapsed time", err);
      setActionError(t("Duur opslaan mislukt. Probeer het opnieuw."));
    }
  }

  function updateElapsedSeconds(newSeconds: number) {
    setElapsed(newSeconds);
    setSummaryHours(String(Math.floor(newSeconds / 3600)));
    setSummaryMinutes(String(Math.floor((newSeconds % 3600) / 60)));
    setSummarySeconds(String(newSeconds % 60));

    pendingElapsedRef.current = newSeconds;
    if (elapsedSaveTimerRef.current) clearTimeout(elapsedSaveTimerRef.current);
    elapsedSaveTimerRef.current = setTimeout(() => {
      elapsedSaveTimerRef.current = null;
      void persistElapsedSeconds(newSeconds);
    }, 700);
  }

  async function flushElapsedSeconds() {
    if (elapsedSaveTimerRef.current) {
      clearTimeout(elapsedSaveTimerRef.current);
      elapsedSaveTimerRef.current = null;
    }
    if (pendingElapsedRef.current !== null) await persistElapsedSeconds(pendingElapsedRef.current);
  }

  async function handleSaveHistoryEdit() {
    if (!session) return;
    setSaving(true);
    setActionError(null);
    try {
      await flushElapsedSeconds();
      const updatePayload: { name?: string; notes?: string } = {};
      if (sessionName.trim()) {
        updatePayload.name = sessionName.trim();
      }
      updatePayload.notes = summaryNotes.trim();
      await api.workouts.sessions.update(session.sessionId, updatePayload);
      await syncPromiseChain.current;
      bypassWarningRef.current = true;
      router.push(`/workouts/history/${session.sessionId}`);
      router.refresh();
    } catch (err) {
      console.error("Failed to save session edit", err);
      setActionError(t("Opslaan mislukt. Probeer het opnieuw."));
    } finally {
      setSaving(false);
    }
  }

  // Handle final completion
  function handleFinishClick() {
    const totalSecs = session ? sessionElapsedSeconds(session, Date.now()) : elapsed;
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    setSummaryHours(String(h));
    setSummaryMinutes(String(m));
    setSummarySeconds(String(s));

    // Check if there are any completed sets with 0/null values
    let hasZeroSets = false;
    if (session?.exercises) {
      for (const ex of session.exercises) {
        if (ex.sets?.some((s) => isSetZero(ex, s, previousSetsMap))) {
          hasZeroSets = true;
          break;
        }
      }
    }

    if (hasZeroSets) {
      setHighlightZeroReps(true);
      setShowZeroRepsWarning(true);
    } else {
      setHighlightZeroReps(false);
      checkIncompleteAndProceed();
    }
  }

  function handleZeroRepsConfirm() {
    setShowZeroRepsWarning(false);
    checkIncompleteAndProceed();
  }

  function checkIncompleteAndProceed() {
    // Check if there are any incomplete sets
    let hasIncomplete = false;
    if (session?.exercises) {
      for (const ex of session.exercises) {
        if (ex.sets?.some((s) => s.completed !== 1)) {
          hasIncomplete = true;
          break;
        }
      }
    }

    if (hasIncomplete) {
      setShowFinishedWarning(true);
    } else {
      proceedToSummary();
    }
  }

  function proceedToSummary() {
    setShowFinishedWarning(false);
    setIsSummaryView(true);
  }

  const autoFinishedRef = useRef(false);
  useEffect(() => {
    if (!autoFinish || autoFinishedRef.current || !session || session.completedAt) return;
    autoFinishedRef.current = true;
    handleFinishClick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFinish, session]);

  useEffect(() => {
    if (!isSummaryView || !loadedSessionId) return;
    let cancelled = false;
    const h = parseInt(summaryHours, 10) || 0;
    const m = Math.min(59, parseInt(summaryMinutes, 10) || 0);
    const s = Math.min(59, parseInt(summarySeconds, 10) || 0);
    const finalSecs = h * 3600 + m * 60 + s;

    const timer = setTimeout(async () => {
      try {
        await syncPromiseChain.current;
        const prs = await api.workouts.sessions.getPRs(loadedSessionId, finalSecs);
        if (!cancelled) setPersonalRecords(prs);
      } catch (err) {
        console.error("Failed to load PRs", err);
        if (!cancelled) setPersonalRecords([]);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isSummaryView, loadedSessionId, summaryHours, summaryMinutes, summarySeconds, syncPromiseChain]);

  async function saveWorkoutSummary() {
    if (!session) return;
    setSaving(true);
    setActionError(null);
    try {
      // Calculate duration in seconds
      const h = parseInt(summaryHours, 10) || 0;
      const m = Math.min(59, parseInt(summaryMinutes, 10) || 0);
      const s = Math.min(59, parseInt(summarySeconds, 10) || 0);
      const finalSecs = h * 3600 + m * 60 + s;

      const startedTime = parseDateString(session.startedAt).getTime();
      const finalCompletedAt = new Date(startedTime + finalSecs * 1000).toISOString();

      const completedSession: FullWorkoutSession = {
        ...session,
        name: sessionName.trim(),
        notes: summaryNotes.trim(),
        completedAt: finalCompletedAt,
      };

      ++syncVersionRef.current;
      setSession(completedSession);
      saveOfflineSession(completedSession, true, finalCompletedAt);

      bypassWarningRef.current = true;
      clearSetTimerSnapshot(session.sessionId);
      setSavedLocally(false);

      await syncPromiseChain.current.catch(() => undefined);

      let confirmed = false;
      try {
        await api.workouts.sessions.update(session.sessionId, {
          name: sessionName.trim(),
          notes: summaryNotes.trim(),
          exercises: buildSessionExercisesPayload(completedSession.exercises),
        });

        await api.workouts.sessions.complete(session.sessionId, finalCompletedAt);
        clearOfflineSession(session.sessionId);
        confirmed = true;
      } catch (err) {
        console.warn("Failed to complete session on server (saved offline for sync when online)", err);
        const synced = await syncOfflineSession(session.sessionId);
        confirmed = Boolean(synced?.completedAt);
      }

      if (!confirmed) {
        refreshUnsynced();
        setSavedLocally(true);
        return;
      }

      router.push(`/workouts/history/${session.sessionId}?celebrate=true`);
      router.refresh();
    } catch (err) {
      console.error("Failed to complete session summary", err);
      bypassWarningRef.current = false;
      setActionError(t("Opslaan mislukt. Probeer het opnieuw."));
    } finally {
      setSaving(false);
    }
  }

  async function discardWorkout() {
    if (!session || discarding) return;
    setDiscarding(true);
    setActionError(null);
    try {
      await api.workouts.sessions.delete(session.sessionId);
      bypassWarningRef.current = true;
      clearSetTimerSnapshot(session.sessionId);
      clearOfflineSession(session.sessionId);
      setShowDiscardConfirm(false);
      router.push("/workouts");
      router.refresh();
    } catch (err) {
      console.error("Failed to discard session", err);
      setShowDiscardConfirm(false);
      setActionError(t("Workout verwijderen mislukt. Probeer het opnieuw."));
    } finally {
      setDiscarding(false);
    }
  }

  return {
    showFinishedWarning,
    setShowFinishedWarning,
    showZeroRepsWarning,
    setShowZeroRepsWarning,
    highlightZeroReps,
    summaryNotes,
    setSummaryNotes,
    summaryHours,
    setSummaryHours,
    summaryMinutes,
    setSummaryMinutes,
    summarySeconds,
    setSummarySeconds,
    personalRecords,
    savedLocally,
    showDiscardConfirm,
    setShowDiscardConfirm,
    discarding,
    updateElapsedSeconds,
    handleSaveHistoryEdit,
    handleFinishClick,
    handleZeroRepsConfirm,
    proceedToSummary,
    saveWorkoutSummary,
    discardWorkout,
  };
}
