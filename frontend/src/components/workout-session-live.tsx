"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { InlineAlert } from "@/components/ui/inline-alert";
import { ExerciseAutocomplete } from "@/components/exercise-autocomplete";
import {
  ArrowLeft,
  Plus,
  Trophy,
  Timer,
  Pause,
  Play,
  Dumbbell,
  Save,
  FileText,
} from "lucide-react";
import { parseDateString } from "@/lib/utils";
import {
  unlockAudio,
  scheduleRestEndSound,
  cancelScheduledSound,
  triggerRestTimerCompletion,
  resetTimerTriggerState,
  requestNotificationPermission,
  isSoundEnabled,
  setSoundEnabled,
  requestScreenWakeLock,
  releaseScreenWakeLock,
  clearActiveNotifications,
} from "@/lib/sound";
import { WorkoutExerciseCard, normalizeCategory, isSetZero, isTimedExercise } from "@/components/workout-exercise-card";
import { ExerciseHistoryModal } from "@/components/exercise-history-modal";
import { WorkoutCompletionSummary } from "@/components/workout-completion-summary";
import { ExerciseEditBlock, type ExerciseRowData, mapCategory, unmapCategory, mapEquipment, formatDuration } from "@/components/exercise-edit-block";
import { RepTimerModal } from "@/components/rep-timer-modal";
import { SessionConflictDialog } from "@/components/session-conflict-dialog";
import { parseSessionConflict, type ActiveSessionInfo } from "@/lib/session-conflict";
import { pauseSession, resumeSession, sessionElapsedSeconds } from "@/lib/workout-time";
import { loadSetTimerSnapshot, clearSetTimerSnapshot, type SetTimerSnapshot } from "@/lib/set-timer";
import { applySetUpdate, type SetValueField } from "@/lib/set-values";
import { parseDecimal, toInputString } from "@/lib/number-input";
import type { FullWorkoutSession, SessionExercise, SessionSet, PersonalRecord } from "@backend/types/shared";
import {
  getOfflineSession,
  saveOfflineSession,
  clearOfflineSession,
  syncOfflineSession,
  recordSyncFailure,
  buildSessionExercisesPayload,
  createTempExerciseId,
  ensureExerciseIds,
  setExerciseAssisted,
} from "@/lib/offline-workout";


export function WorkoutSessionLive({
  session: initialSession,
  autoFinish = false,
}: {
  session?: FullWorkoutSession | null;
  userId?: number;
  autoFinish?: boolean;
}) {
  const router = useRouter();
  const [session, setSession] = useState<FullWorkoutSession | null>(() => {
    if (initialSession?.sessionId) {
      const offlineData = getOfflineSession(initialSession.sessionId);
      if (offlineData?.pendingSync && offlineData.session) {
        return {
          ...initialSession,
          ...offlineData.session,
          exercises: ensureExerciseIds(offlineData.session.exercises ?? initialSession.exercises ?? []),
        };
      }
    }
    return initialSession ?? null;
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [unsynced, setUnsynced] = useState(false);
  const touchedRef = useRef<Set<string>>(new Set());
  const elapsedSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingElapsedRef = useRef<number | null>(null);
  const nameCancelRef = useRef(false);

  // Timer state
  const [elapsed, setElapsed] = useState(0);
  const isPaused = Boolean(session?.pausedAt) && !session?.completedAt;
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Rep Timer state
  const [activeRepTimer, setActiveRepTimer] = useState<{
    exIdx: number;
    setIdx: number;
    exerciseName: string;
    setNumber: number;
    targetDurationSeconds?: number | null;
    restored?: SetTimerSnapshot | null;
  } | null>(null);

  // Rest Timer State
  const [restSecondsLeft, setRestSecondsLeft] = useState(0);
  const [restTotalSeconds, setRestTotalSeconds] = useState(0);
  const [restActive, setRestActive] = useState(false);
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restEndTimeRef = useRef<number | null>(null);
  const [activeRestExerciseIdx, setActiveRestExerciseIdx] = useState<number | null>(null);
  const [activeRestSetIdx, setActiveRestSetIdx] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabledState] = useState(() => isSoundEnabled());

  function toggleSound() {
    const next = !soundEnabled;
    setSoundEnabledState(next);
    setSoundEnabled(next);
    if (next) unlockAudio();
    if (restActive && restEndTimeRef.current) {
      const remaining = Math.max(0, Math.ceil((restEndTimeRef.current - Date.now()) / 1000));
      if (remaining > 0) {
        scheduleRestEndSound(remaining);
      }
    }
  }

  // Pop Burst satisfaction animation state
  const [lastCompletedSet, setLastCompletedSet] = useState<{ exIdx: number; setIdx: number } | null>(null);

  // UI state
  const [sessionName, setSessionName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [unknownExerciseDraft, setUnknownExerciseDraft] = useState<ExerciseRowData | null>(null);
  const [activeMenuExerciseId, setActiveMenuExerciseId] = useState<number | null>(null);
  const [activeEquipmentMenuExerciseId, setActiveEquipmentMenuExerciseId] = useState<number | null>(null);
  const [replacingExerciseId, setReplacingExerciseId] = useState<number | null>(null);
  const [replaceName, setReplaceName] = useState("");
  const [editingExerciseIdx, setEditingExerciseIdx] = useState<number | null>(null);
  const [editingExerciseDraft, setEditingExerciseDraft] = useState<ExerciseRowData | null>(null);

  // Exercise history modal state
  const [historyExerciseName, setHistoryExerciseName] = useState<string | null>(null);
  const [historyExerciseEquipment, setHistoryExerciseEquipment] = useState<string | null>(null);

  const handleSetHistoryExercise = (name: string | null, equipment?: string | null) => {
    setHistoryExerciseName(name);
    setHistoryExerciseEquipment(equipment || null);
  };

  // Previous sets mapping (for ghost text/placeholders)
  const [previousSetsMap, setPreviousSetsMap] = useState<Record<string, SessionSet[]>>({});

  // Finished / Summary View state
  const [isSummaryView, setIsSummaryView] = useState(false);
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

  // Leave confirmation state
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const bypassWarningRef = useRef(false);

  // Synchronization queue and version tracking to avoid concurrent API race conditions
  const syncVersionRef = useRef(0);
  const syncPromiseChain = useRef<Promise<unknown>>(Promise.resolve());

  const [startConflict, setStartConflict] = useState<ActiveSessionInfo | null>(null);
  const creatingRef = useRef(false);

  // Fetch initial session if not provided
  const createSession = useCallback(async (force = false) => {
    if (creatingRef.current) return;
    creatingRef.current = true;
    setLoading(true);
    setCreateError(null);
    try {
      const s = await api.workouts.sessions.create(undefined, force);
      setSession(s);
      router.replace(`/workouts/session/${s.sessionId}`);
    } catch (err) {
      const active = parseSessionConflict(err);
      if (active) {
        setStartConflict(active);
      } else {
        console.error("Failed to create session", err);
        setCreateError(t("Failed to start workout. Please try again."));
      }
    } finally {
      creatingRef.current = false;
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!session && !createError) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      createSession();
    }
  }, [session, createSession, createError]);

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
  }, [session?.sessionId]);

  // Sync name and notes only when a different session is loaded, never on set updates
  const loadedSessionId = session?.sessionId;
  useEffect(() => {
    const current = sessionRef.current;
    if (current) {
      setSessionName(current.name || t("Workout Session"));
      setSummaryNotes(current.notes || "");
    }
  }, [loadedSessionId]);

  // Derive elapsed time from the persisted timestamps and pause state
  useEffect(() => {
    if (session) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setElapsed(sessionElapsedSeconds(session, Date.now()));
    }
  }, [session]);

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

  // Screen wake lock during active workout or rest timer
  useEffect(() => {
    const shouldKeepAwake = (session?.sessionId && !isPaused && !isSummaryView && !session?.completedAt) || restActive;
    if (shouldKeepAwake) {
      requestScreenWakeLock();
    } else {
      releaseScreenWakeLock();
    }
    return () => {
      releaseScreenWakeLock();
    };
  }, [session?.sessionId, isPaused, isSummaryView, session?.completedAt, restActive]);

  // Main timer tick
  useEffect(() => {
    if (!session?.sessionId || isPaused || isSummaryView || session?.completedAt) return;

    const interval = setInterval(() => {
      const current = sessionRef.current;
      if (current) setElapsed(sessionElapsedSeconds(current, Date.now()));
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.sessionId, isPaused, isSummaryView, session?.completedAt]);

  // Rest Timer countdown
  useEffect(() => {
    if (restActive && restEndTimeRef.current) {
      const checkRestTimer = () => {
        if (!restEndTimeRef.current) return;
        const now = Date.now();
        const diffSeconds = Math.ceil((restEndTimeRef.current - now) / 1000);

        if (diffSeconds <= 0) {
          setRestSecondsLeft(0);
          setRestActive(false);
          restEndTimeRef.current = null;

          triggerRestTimerCompletion();
          if (restIntervalRef.current) clearInterval(restIntervalRef.current);
        } else {
          setRestSecondsLeft(diffSeconds);
        }
      };

      checkRestTimer();
      restIntervalRef.current = setInterval(checkRestTimer, 250);
    } else {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    }

    return () => {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    };
  }, [restActive]);

  // Sync rest timer and re-acquire wake lock when returning from background / screen off
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const shouldKeepAwake = (session?.sessionId && !isPaused && !isSummaryView && !session?.completedAt) || restActive;
        if (shouldKeepAwake) {
          requestScreenWakeLock();
        }

        if (restActive && restEndTimeRef.current) {
          const now = Date.now();
          const diffSeconds = Math.ceil((restEndTimeRef.current - now) / 1000);
          if (diffSeconds <= 0) {
            setRestSecondsLeft(0);
            setRestActive(false);
            restEndTimeRef.current = null;
            const skipSound = diffSeconds < -2; // Skip sound if it ended more than 2 seconds ago in background
            triggerRestTimerCompletion(skipSound);
          } else {
            setRestSecondsLeft(diffSeconds);
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [restActive, session?.sessionId, isPaused, isSummaryView, session?.completedAt]);

  // Cleanup sound and timers on component unmount
  useEffect(() => {
    return () => {
      cancelScheduledSound();
      clearActiveNotifications();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (elapsedSaveTimerRef.current) clearTimeout(elapsedSaveTimerRef.current);
    };
  }, []);

  const refreshUnsynced = useCallback(() => {
    const id = sessionRef.current?.sessionId;
    setUnsynced(Boolean(id && getOfflineSession(id)?.pendingSync));
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

  function getExerciseRestTime(ex: SessionExercise): number {
    return ex.restTime ?? ex.templateExercise?.defaultRestTime ?? 90;
  }

  function startRestTimer(exIdx: number, setIdx: number, customTime?: number) {
    if (!session?.exercises) return;
    unlockAudio();
    requestNotificationPermission();

    const ex = session.exercises[exIdx];
    const time = customTime || getExerciseRestTime(ex);

    resetTimerTriggerState();
    restEndTimeRef.current = Date.now() + time * 1000;
    setRestSecondsLeft(time);
    setRestTotalSeconds(time);
    setRestActive(true);
    setActiveRestExerciseIdx(exIdx);
    setActiveRestSetIdx(setIdx);

    scheduleRestEndSound(time);
  }

  function stopRestTimer() {
    cancelScheduledSound();
    clearActiveNotifications();
    resetTimerTriggerState();
    restEndTimeRef.current = null;
    setRestActive(false);
    setRestSecondsLeft(0);
    setActiveRestExerciseIdx(null);
    setActiveRestSetIdx(null);
  }

  function adjustRestTimer(seconds: number) {
    unlockAudio();
    resetTimerTriggerState();

    if (!restEndTimeRef.current) {
      restEndTimeRef.current = Date.now() + restSecondsLeft * 1000;
    }
    restEndTimeRef.current += seconds * 1000;

    const remaining = Math.max(0, Math.ceil((restEndTimeRef.current - Date.now()) / 1000));
    setRestSecondsLeft(remaining);
    setRestTotalSeconds((prev) => Math.max(0, prev + seconds));

    if (remaining <= 0) {
      stopRestTimer();
    } else {
      scheduleRestEndSound(remaining);
    }
  }

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
  }, [loadedSessionId]);

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
    await updateSetAndComplete(exIdx, setIdx, elapsedSeconds);
  }

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

  async function updateCategory(exerciseIndex: number, category: string) {
    if (!session) return;
    const exercises = [...(session.exercises ?? [])];
    const targetEx = exercises[exerciseIndex];
    if (!targetEx) return;

    exercises[exerciseIndex] = { ...targetEx, category };
    setSession({ ...session, exercises });
    await saveExercises(exercises);
  }

  async function updateEquipment(exerciseIndex: number, equipment: string) {
    if (!session) return;
    const exercises = [...(session.exercises ?? [])];
    exercises[exerciseIndex] = { ...exercises[exerciseIndex], equipment };
    setSession({ ...session, exercises });
    await saveExercises(exercises);
  }

  async function updateIsAssisted(exerciseIndex: number, isAssisted: boolean) {
    if (!session) return;
    const exercises = [...(session.exercises ?? [])];
    exercises[exerciseIndex] = setExerciseAssisted(exercises[exerciseIndex], isAssisted);
    setSession({ ...session, exercises });
    await saveExercises(exercises);
  }

  async function removeSet(exerciseIndex: number, setIndex: number) {
    if (!session) return;
    const exercises = [...(session.exercises ?? [])];
    const ex = { ...exercises[exerciseIndex] };
    let sets = [...(ex.sets ?? [])];
    sets = sets.filter((_, i) => i !== setIndex);
    ex.sets = sets.map((s, idx) => ({ ...s, setNumber: idx + 1 }));
    exercises[exerciseIndex] = ex;
    setSession({ ...session, exercises });
    await saveExercises(exercises);
  }

  async function updateSet(exerciseIndex: number, setIndex: number, field: keyof SessionSet, value: number | string | null | undefined) {
    if (!session) return;
    const exercises = [...(session.exercises ?? [])];
    const ex = { ...exercises[exerciseIndex] };
    const exKey = ex.sessionExerciseId ?? exerciseIndex;
    const keyFor = (i: number) => `${exKey}:${i}:${field}`;
    touchedRef.current.add(keyFor(setIndex));

    ex.sets = applySetUpdate(
      ex.sets ?? [],
      setIndex,
      field as SetValueField,
      (value ?? null) as number | null,
      (i) => touchedRef.current.has(keyFor(i))
    );
    exercises[exerciseIndex] = ex;
    setSession({ ...session, exercises });

    await saveExercises(exercises);
  }

  async function updateSetAndComplete(exerciseIndex: number, setIndex: number, durationSeconds: number) {
    if (!session) return;
    clearActiveNotifications();
    const exercises = [...(session.exercises ?? [])];
    const ex = { ...exercises[exerciseIndex] };
    const exKey = ex.sessionExerciseId ?? exerciseIndex;
    const keyFor = (i: number) => `${exKey}:${i}:duration`;
    touchedRef.current.add(keyFor(setIndex));

    const sets = applySetUpdate(
      ex.sets ?? [],
      setIndex,
      "duration",
      durationSeconds,
      (i) => touchedRef.current.has(keyFor(i))
    );
    sets[setIndex] = { ...sets[setIndex], completed: 1 };
    ex.sets = sets;
    exercises[exerciseIndex] = ex;
    setSession({ ...session, exercises });
    await saveExercises(exercises);

    const hasNextIncompleteSet = setIndex < sets.length - 1 && sets.slice(setIndex + 1).some((s) => s.completed === 0);
    const restTime = getExerciseRestTime(ex);
    if (restTime > 0 && hasNextIncompleteSet) {
      startRestTimer(exerciseIndex, setIndex, restTime);
    } else if (activeRestExerciseIdx === exerciseIndex) {
      stopRestTimer();
    }

    setLastCompletedSet({ exIdx: exerciseIndex, setIdx: setIndex });
    setTimeout(() => setLastCompletedSet(null), 800);
  }

  async function toggleSetCompleted(exerciseIndex: number, setIndex: number) {
    if (!session) return;
    const exercises = [...(session.exercises ?? [])];
    const ex = { ...exercises[exerciseIndex] };
    const sets = [...(ex.sets ?? [])];
    const set = { ...sets[setIndex] };

    const nextCompleted = set.completed ? 0 : 1;
    set.completed = nextCompleted;

    if (nextCompleted === 1) {
      clearActiveNotifications();
      const prevSets = previousSetsMap[ex.exerciseName];
      const prevSet = prevSets?.[setIndex] ?? prevSets?.[prevSets.length - 1];
      const templateEx = ex.templateExercise;

      const defaultWeight = prevSet?.weight ?? templateEx?.defaultWeight ?? 0;
      const defaultReps = prevSet?.reps ?? templateEx?.defaultReps ?? 10;
      const defaultDistance = prevSet?.distance ?? templateEx?.defaultDistance ?? 0;
      const defaultDuration = prevSet?.duration ?? templateEx?.defaultDuration ?? 0;
      const defaultRpe = prevSet?.rpe ?? templateEx?.defaultRpe ?? null;
      const defaultHeartRate = prevSet?.heartRate ?? templateEx?.defaultHeartRate ?? null;

      const cat = normalizeCategory(ex.category);
      const isTimed = isTimedExercise(ex, previousSetsMap);

      if (cat === "cardio") {
        set.distance = set.distance ?? defaultDistance;
        set.duration = set.duration ?? defaultDuration;
        set.heartRate = set.heartRate ?? defaultHeartRate;
      } else if (isTimed) {
        set.duration = set.duration ?? (defaultDuration > 0 ? defaultDuration : null);
        set.weight = set.weight ?? defaultWeight;
      } else {
        set.weight = set.weight ?? defaultWeight;
        set.reps = set.reps ?? defaultReps;
        set.rpe = set.rpe ?? defaultRpe;
      }

      const hasNextIncompleteSet = setIndex < sets.length - 1 && sets.slice(setIndex + 1).some((s) => s.completed === 0);
      const restTime = getExerciseRestTime(ex);
      if (restTime > 0 && hasNextIncompleteSet) {
        startRestTimer(exerciseIndex, setIndex, restTime);
      } else if (activeRestExerciseIdx === exerciseIndex) {
        stopRestTimer();
      }

      setLastCompletedSet({ exIdx: exerciseIndex, setIdx: setIndex });
      setTimeout(() => setLastCompletedSet(null), 800);
    } else {
      if (activeRestExerciseIdx === exerciseIndex && activeRestSetIdx === setIndex) {
        stopRestTimer();
      }
    }

    sets[setIndex] = set;
    ex.sets = sets;
    exercises[exerciseIndex] = ex;
    setSession({ ...session, exercises });
    await saveExercises(exercises);
  }

  async function addSet(exerciseIndex: number) {
    if (!session) return;
    const exercises = [...(session.exercises ?? [])];
    const ex = { ...exercises[exerciseIndex] };
    const sets = [...(ex.sets ?? [])];
    const lastSet = sets[sets.length - 1];
    const newSetNum = sets.length + 1;

    const isTimed = isTimedExercise(ex, previousSetsMap);

    const newSet: SessionSet = {
      setId: undefined as unknown as number,
      setNumber: newSetNum,
      reps: isTimed ? (lastSet?.reps ?? null) : (lastSet?.reps ?? 10),
      weight: lastSet?.weight ?? null,
      distance: lastSet?.distance ?? null,
      duration: lastSet?.duration ?? null,
      rpe: lastSet?.rpe ?? null,
      heartRate: lastSet?.heartRate ?? null,
      completed: 0,
    };

    sets.push(newSet);
    ex.sets = sets;
    exercises[exerciseIndex] = ex;
    setSession({ ...session, exercises });
    await saveExercises(exercises);
  }

  async function addExercise(
    nameOverride?: string,
    categoryOverride?: string,
    defaultSets?: number,
    defaultReps?: number,
    equipmentOverride?: string,
    perSideOverride?: boolean,
    isAssistedOverride?: boolean,
    defaultWeight?: number,
    defaultDistance?: number,
    defaultDuration?: number,
    lastSets?: Array<{
      setNumber: number;
      reps?: number | null;
      weight?: number | null;
      distance?: number | null;
      duration?: number | null;
      rpe?: number | null;
      heartRate?: number | null;
    }>,
    defaultRestTime?: number
  ) {
    const name = nameOverride || newExerciseName.trim();
    if (!session || !name) return;
    const exercises = [...(session.exercises ?? [])];
    const cat = categoryOverride || "resistance";
    const eq = equipmentOverride || (cat === "resistance" ? "dumbbell" : "none");

    let historySessionSets: SessionSet[] | null = (lastSets as unknown as SessionSet[]) || null;

    if (!historySessionSets || historySessionSets.length === 0) {
      try {
        const res = await api.workouts.exercises.progress(name);
        if (res?.sessions?.length) {
          const completedSessions = res.sessions.filter((s) => s.sets?.length > 0);
          if (completedSessions.length > 0) {
            const lastSession = completedSessions[completedSessions.length - 1];
            historySessionSets = lastSession.sets as unknown as SessionSet[];
          }
        }
      } catch (err) {
        console.error("Failed to load progress for added exercise", err);
      }
    }

    if (historySessionSets && historySessionSets.length > 0) {
      setPreviousSetsMap((prev) => ({
        ...prev,
        [name]: historySessionSets!,
      }));
    }

    let initialSets: SessionSet[] = [];
    if (historySessionSets && historySessionSets.length > 0) {
      initialSets = historySessionSets.map((s, i) => ({
        setNumber: i + 1,
        reps: s.reps ?? null,
        weight: s.weight ?? null,
        distance: s.distance ?? null,
        duration: s.duration ?? null,
        rpe: s.rpe ?? null,
        heartRate: s.heartRate ?? null,
        completed: 0,
      }));
    } else {
      const numSets = defaultSets || 3;
      const numReps = defaultReps ?? 10;
      for (let i = 1; i <= numSets; i++) {
        initialSets.push({
          setNumber: i,
          reps: numReps,
          weight: defaultWeight ?? null,
          distance: defaultDistance ?? null,
          duration: defaultDuration ?? null,
          rpe: null,
          heartRate: null,
          completed: 0,
        });
      }
    }

    exercises.push({
      sessionExerciseId: createTempExerciseId(),
      exerciseName: name,
      sortOrder: exercises.length,
      category: cat,
      equipment: eq,
      perSide: perSideOverride ? 1 : 0,
      isAssisted: isAssistedOverride ? 1 : 0,
      restTime: defaultRestTime ?? null,
      sets: initialSets,
    });

    setNewExerciseName("");
    setShowAddExercise(false);
    setSession({ ...session, exercises });
    await saveExercises(exercises);
  }

  async function addExerciseFromDraft(draft: ExerciseRowData) {
    if (!session || !draft.name.trim()) return;
    const exercises = [...(session.exercises ?? [])];
    const cat = unmapCategory(draft.category);
    const eq = draft.equipment || "none";

    const numSets = Math.max(1, parseInt(draft.sets, 10) || 3);
    const numReps = draft.trackingFields.reps ? (parseInt(draft.reps, 10) || 10) : null;
    const durationSecs = draft.trackingFields.time ? parseDurationHelper(draft.duration) : null;
    const parsedWeight = draft.trackingFields.weight ? parseDecimal(draft.weight) : null;
    const weightVal = parsedWeight !== null
      ? (draft.isAssisted ? -Math.abs(parsedWeight) : Math.abs(parsedWeight))
      : null;
    let distVal = draft.trackingFields.distance ? parseDecimal(draft.distance) : null;
    if (distVal !== null && draft.distanceUnit === "m") {
      distVal = distVal / 1000;
    }

    const initialSets = [];
    for (let i = 1; i <= numSets; i++) {
      initialSets.push({
        setNumber: i,
        reps: numReps,
        weight: weightVal,
        distance: distVal,
        duration: durationSecs,
        rpe: null,
        heartRate: null,
        completed: 0,
      });
    }

    exercises.push({
      sessionExerciseId: createTempExerciseId(),
      exerciseName: draft.name.trim(),
      sortOrder: exercises.length,
      category: cat,
      equipment: eq,
      perSide: draft.perSide ? 1 : 0,
      isAssisted: draft.isAssisted ? 1 : 0,
      restTime: parseDurationHelper(draft.defaultRestTime) ?? 90,
      sets: initialSets,
    });

    setUnknownExerciseDraft(null);
    setNewExerciseName("");
    setShowAddExercise(false);
    setSession({ ...session, exercises });
    await saveExercises(exercises);
  }

  async function removeExercise(id: number) {
    if (!session || id == null) return;
    const exercises = (session.exercises ?? []).filter((ex) => ex.sessionExerciseId !== id);
    const reindexed = exercises.map((ex, i) => ({ ...ex, sortOrder: i }));
    setSession({ ...session, exercises: reindexed });
    await saveExercises(reindexed);
  }

  async function replaceExercise(
    exerciseId: number,
    name: string,
    category?: string,
    equipment?: string,
    defaultRestTime?: number,
    defaultWeight?: number,
    defaultDistance?: number,
    defaultDuration?: number,
    perSide?: boolean,
    isAssisted?: boolean,
    lastSets?: Array<{
      setNumber: number;
      reps?: number | null;
      weight?: number | null;
      distance?: number | null;
      duration?: number | null;
      rpe?: number | null;
      heartRate?: number | null;
    }>
  ) {
    if (!session || !name.trim()) return;
    const exercises = [...(session.exercises ?? [])];
    const idx = exercises.findIndex((ex) => ex.sessionExerciseId === exerciseId);
    if (idx === -1) return;

    const trimmedName = name.trim();

    // Check if this exercise is known (category passed or found in history/progress)
    let isKnown = Boolean(category);
    let historySessionSets: SessionSet[] | null = (lastSets as unknown as SessionSet[]) || null;
    let historyCategory: string | undefined = undefined;
    let historyEquipment: string | undefined = undefined;

    // Try fetching progress/history for this exercise name if not already provided
    if (!historySessionSets || historySessionSets.length === 0) {
      try {
        const res = await api.workouts.exercises.progress(trimmedName);
        if (res?.sessions?.length) {
          const completedSessions = res.sessions.filter((s) => s.sets?.length > 0);
          if (completedSessions.length > 0) {
            isKnown = true;
            const lastSession = completedSessions[completedSessions.length - 1];
            historySessionSets = lastSession.sets as unknown as SessionSet[];
            if ((res as { category?: string }).category) {
              historyCategory = (res as { category?: string }).category;
            }
            if (lastSession.equipment) {
              historyEquipment = lastSession.equipment;
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch progress during exercise replacement", err);
      }
    }

    if (historySessionSets && historySessionSets.length > 0) {
      // Update previousSetsMap so ghost targets show up instantly
      setPreviousSetsMap((prev) => ({
        ...prev,
        [trimmedName]: historySessionSets!,
      }));
    }

    // If exercise is NOT known (does not exist yet in system):
    if (!isKnown) {
      setReplacingExerciseId(null);
      setReplaceName("");
      // Show the exercise creation block (ExerciseEditBlock) for this exercise index
      setEditingExerciseDraft({
        name: trimmedName,
        category: "Free Weights",
        sets: "3",
        reps: "8",
        weight: defaultWeight != null ? toInputString(Math.abs(defaultWeight)) : "",
        distance: toInputString(defaultDistance),
        distanceUnit: "km",
        duration: defaultDuration ? formatDuration(defaultDuration) : "",
        defaultRestTime: formatDuration(defaultRestTime ?? 90),
        equipment: equipment || "",
        perSide: Boolean(perSide),
        isAssisted: Boolean(isAssisted),
        trackingFields: { reps: true, time: false, weight: true, distance: false }
      });
      setEditingExerciseIdx(idx);
      return;
    }

    // Exercise IS known: take over settings from last time executed or default template settings
    const cat = category || historyCategory || "resistance";
    const eq = equipment || historyEquipment || "none";
    const isPerSide = perSide ? 1 : 0;

    let initialSets: SessionSet[] = [];

    if (historySessionSets && historySessionSets.length > 0) {
      // Take over settings from last executed session!
      initialSets = historySessionSets.map((s, i) => ({
        setNumber: i + 1,
        reps: s.reps ?? null,
        weight: s.weight ?? null,
        distance: s.distance ?? null,
        duration: s.duration ?? null,
        rpe: s.rpe ?? null,
        heartRate: s.heartRate ?? null,
        completed: 0,
      }));
    } else {
      // No past execution history, construct sets using default values
      const numSets = 3;
      const numReps = 10;
      for (let i = 1; i <= numSets; i++) {
        initialSets.push({
          setNumber: i,
          reps: numReps,
          weight: defaultWeight ?? null,
          distance: defaultDistance ?? null,
          duration: defaultDuration ?? null,
          rpe: null,
          heartRate: null,
          completed: 0,
        });
      }
    }

    exercises[idx] = {
      ...exercises[idx],
      exerciseName: trimmedName,
      category: cat,
      equipment: eq,
      perSide: isPerSide,
      isAssisted: isAssisted ? 1 : 0,
      restTime: defaultRestTime ?? null,
      templateExercise: null,
      sets: initialSets,
    };

    setReplacingExerciseId(null);
    setReplaceName("");
    setSession({ ...session, exercises });
    await saveExercises(exercises);
  }

  function startEditingExercise(exIdx: number) {
    if (!session?.exercises?.[exIdx]) return;
    const ex = session.exercises[exIdx];
    const cat = mapCategory(ex.category || "resistance");
    const eq = mapEquipment(ex.equipment || "");
    const firstSet = ex.sets?.[0];
    const numSets = ex.sets?.length ? String(ex.sets.length) : "3";

    const reps = firstSet?.reps != null ? String(firstSet.reps) : (ex.templateExercise?.defaultReps?.toString() ?? "8");
    const weight = firstSet?.weight != null ? toInputString(Math.abs(firstSet.weight)) : (ex.templateExercise?.defaultWeight != null ? toInputString(Math.abs(ex.templateExercise.defaultWeight)) : "");
    const distance = firstSet?.distance != null ? toInputString(firstSet.distance) : toInputString(ex.templateExercise?.defaultDistance);
    const duration = firstSet?.duration != null ? formatDuration(firstSet.duration) : formatDuration(ex.templateExercise?.defaultDuration);
    const defaultRestTime = formatDuration(getExerciseRestTime(ex));
    const perSide = ex.perSide != null ? Boolean(ex.perSide) : Boolean(ex.templateExercise?.perSide);
    const isAssisted = ex.isAssisted != null ? Boolean(ex.isAssisted) : Boolean(ex.templateExercise?.isAssisted);

    const hasReps = ex.sets?.some((s) => s.reps != null && s.reps > 0) ?? (cat !== "Cardio");
    const hasTime = ex.sets?.some((s) => s.duration != null && s.duration > 0) ?? (cat === "Cardio");
    const hasWeight = ex.sets?.some((s) => s.weight != null && s.weight !== undefined) ?? true;
    const hasDistance = ex.sets?.some((s) => s.distance != null && s.distance > 0) ?? (cat === "Cardio");

    setEditingExerciseDraft({
      name: ex.exerciseName,
      category: cat,
      sets: numSets,
      reps,
      weight,
      distance,
      distanceUnit: "km",
      duration,
      defaultRestTime,
      equipment: eq,
      perSide,
      isAssisted,
      trackingFields: {
        reps: hasReps,
        time: hasTime,
        weight: hasWeight,
        distance: hasDistance,
      },
    });
    setEditingExerciseIdx(exIdx);
  }

  async function saveEditedExercise(exIdx: number, draft: ExerciseRowData) {
    if (!session || !draft.name.trim()) return;
    const exercises = [...(session.exercises ?? [])];
    const targetEx = exercises[exIdx];
    if (!targetEx) return;

    const cat = unmapCategory(draft.category);
    const eq = draft.equipment || "none";

    const numSets = Math.max(1, parseInt(draft.sets, 10) || 3);
    const numReps = draft.trackingFields.reps ? (parseInt(draft.reps, 10) || 10) : null;
    const durationSecs = draft.trackingFields.time ? parseDurationHelper(draft.duration) : null;
    const parsedWeight = draft.trackingFields.weight ? parseDecimal(draft.weight) : null;
    const hasWeightInput = parsedWeight !== null;
    const weightVal = hasWeightInput ? (draft.isAssisted ? -Math.abs(parsedWeight) : Math.abs(parsedWeight)) : null;
    let distVal = draft.trackingFields.distance ? parseDecimal(draft.distance) : null;
    if (distVal !== null && draft.distanceUnit === "m") {
      distVal = distVal / 1000;
    }

    const isSameExercise = targetEx.exerciseName === draft.name.trim();
    const existingSets = isSameExercise ? (targetEx.sets ?? []) : [];
    const updatedSets: SessionSet[] = [];

    for (let i = 0; i < numSets; i++) {
      const setNum = i + 1;
      const existing = existingSets[i];
      if (existing) {
        updatedSets.push({
          ...existing,
          setNumber: setNum,
          reps: draft.trackingFields.reps ? (existing.reps ?? numReps) : null,
          weight: draft.trackingFields.weight ? (hasWeightInput ? weightVal : (draft.weight?.trim() === "" ? null : existing.weight)) : null,
          duration: draft.trackingFields.time ? (existing.duration ?? durationSecs) : null,
          distance: draft.trackingFields.distance ? (existing.distance ?? distVal) : null,
        });
      } else {
        updatedSets.push({
          setNumber: setNum,
          reps: draft.trackingFields.reps ? (numReps ?? 10) : null,
          weight: draft.trackingFields.weight ? weightVal : null,
          distance: draft.trackingFields.distance ? distVal : null,
          duration: draft.trackingFields.time ? durationSecs : null,
          rpe: null,
          heartRate: null,
          completed: 0,
        });
      }
    }

    const defaultRestTimeSecs = parseDurationHelper(draft.defaultRestTime) ?? 90;

    exercises[exIdx] = {
      ...targetEx,
      exerciseName: draft.name.trim(),
      category: cat,
      equipment: eq,
      perSide: draft.perSide ? 1 : 0,
      isAssisted: draft.isAssisted ? 1 : 0,
      restTime: defaultRestTimeSecs,
      sets: updatedSets,
      templateExercise: {
        ...(targetEx.templateExercise ?? {}),
        defaultReps: draft.trackingFields.reps ? (numReps ?? 10) : null,
        defaultDuration: draft.trackingFields.time ? durationSecs : null,
        defaultWeight: draft.trackingFields.weight ? weightVal : null,
        defaultDistance: draft.trackingFields.distance ? distVal : null,
        defaultRestTime: defaultRestTimeSecs,
        perSide: draft.perSide ? 1 : 0,
        isAssisted: draft.isAssisted ? 1 : 0,
      },
    };

    setEditingExerciseIdx(null);
    setEditingExerciseDraft(null);
    setSession({ ...session, exercises });
    await saveExercises(exercises);
  }

  async function moveExerciseUpDirect(idx: number) {
    if (idx === 0) return;
    swapExercises(idx, idx - 1);
  }

  async function moveExerciseDownDirect(idx: number) {
    if (!session || idx === (session.exercises?.length ?? 0) - 1) return;
    swapExercises(idx, idx + 1);
  }

  async function swapExercises(from: number, to: number) {
    if (!session) return;
    const exercises = [...(session.exercises ?? [])];
    const movedItem = exercises[from];
    const movedId = movedItem?.sessionExerciseId ?? to;
    const temp = exercises[from];
    exercises[from] = exercises[to];
    exercises[to] = temp;
    const reindexed = exercises.map((ex, i) => ({ ...ex, sortOrder: i }));
    setSession({ ...session, exercises: reindexed });
    await saveExercises(reindexed);

    setTimeout(() => {
      const el =
        document.getElementById(`session-exercise-${movedId}`) ||
        document.querySelector(`[data-ex-id="${movedId}"]`);
      if (el) {
        const rect = el.getBoundingClientRect();
        const isVeryTall = rect.height > window.innerHeight * 0.75;
        el.scrollIntoView({
          behavior: "smooth",
          block: isVeryTall ? "start" : "center",
        });
      }
    }, 60);
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
  }, [isSummaryView, loadedSessionId, summaryHours, summaryMinutes, summarySeconds]);

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

  function handleBackClick(e: React.MouseEvent) {
    e.preventDefault();
    if (session?.completedAt) {
      bypassWarningRef.current = true;
      router.push(`/workouts/history/${session.sessionId}`);
    } else if (unsynced) {
      setShowLeaveWarning(true);
    } else {
      bypassWarningRef.current = true;
      router.push("/workouts");
    }
  }

  function confirmLeave() {
    bypassWarningRef.current = true;
    router.push("/workouts");
  }

  function calculateTotalVolume(): number {
    let vol = 0;
    if (session?.exercises) {
      for (const ex of session.exercises) {
        if (ex.sets) {
          for (const s of ex.sets) {
            if (s.completed === 1 && s.weight && s.reps) {
              vol += Math.max(0, s.weight) * s.reps;
            }
          }
        }
      }
    }
    return vol;
  }

  const exercises = session?.exercises ?? [];

  if (!session && startConflict) {
    return (
      <SessionConflictDialog
        key={startConflict.sessionId}
        session={startConflict}
        busy={loading}
        onResume={() => router.replace(`/workouts/session/${startConflict.sessionId}`)}
        onStartNew={async () => {
          setStartConflict(null);
          await createSession();
        }}
        onCancel={() => router.push("/workouts")}
      />
    );
  }

  if (!session && createError) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
        <InlineAlert>{createError}</InlineAlert>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={() => createSession()} className="min-h-11 bg-brand text-zinc-950 hover:bg-brand-hover font-semibold">
            {t("Opnieuw proberen")}
          </Button>
          <Button variant="outline" onClick={() => router.push("/workouts")} className="min-h-11">
            {t("Terug naar workouts")}
          </Button>
        </div>
      </div>
    );
  }

  if (loading || !session) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <div className="animate-spin size-8 border-4 border-brand border-t-transparent rounded-full" />
        <span className="text-sm text-muted-foreground">{t("Starting workout session...")}</span>
      </div>
    );
  }

  if (isSummaryView) {
    return (
      <>
      <WorkoutCompletionSummary
        error={actionError}
        sessionName={sessionName}
        setSessionName={setSessionName}
        summaryNotes={summaryNotes}
        setSummaryNotes={setSummaryNotes}
        summaryHours={summaryHours}
        setSummaryHours={setSummaryHours}
        summaryMinutes={summaryMinutes}
        setSummaryMinutes={setSummaryMinutes}
        summarySeconds={summarySeconds}
        setSummarySeconds={setSummarySeconds}
        totalVolume={calculateTotalVolume()}
        personalRecords={personalRecords}
        saving={saving}
        onSave={saveWorkoutSummary}
        onCancel={() => setIsSummaryView(false)}
        onDiscard={() => setShowDiscardConfirm(true)}
        savedLocally={savedLocally}
        onLeave={() => {
          bypassWarningRef.current = true;
          router.push("/workouts");
        }}
      />
      <ConfirmDialog
        open={showDiscardConfirm}
        title={t("Discard Workout")}
        description={t("Are you sure you want to delete this active workout session? This cannot be undone.")}
        cancelLabel={t("Cancel")}
        confirmLabel={t("Delete")}
        onCancel={() => setShowDiscardConfirm(false)}
        onConfirm={discardWorkout}
        tone="destructive"
        busy={discarding}
      />
      </>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Global Header (Sticky) */}
      <div className="sticky top-0 bg-background z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 -mt-6 pt-6 pb-4 border-b border-border/40 mb-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={sessionName}
                  aria-label={t("Workout title")}
                  onChange={(e) => setSessionName(e.target.value)}
                  onBlur={() => {
                    if (nameCancelRef.current) {
                      nameCancelRef.current = false;
                      return;
                    }
                    saveWorkoutTitle();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveWorkoutTitle();
                    if (e.key === "Escape") {
                      nameCancelRef.current = true;
                      setSessionName(session.name || t("Workout Session"));
                      setIsEditingName(false);
                    }
                  }}
                  autoFocus
                  className="bg-white/5 border-brand/40 text-xl font-semibold h-11"
                />
                <Button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={saveWorkoutTitle}
                  aria-label={t("Opslaan")}
                  className="bg-brand text-zinc-900 min-h-11 min-w-11"
                >
                  <Check className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1 max-w-full">
                <button
                  type="button"
                  onClick={handleBackClick}
                  aria-label={t("Terug naar workouts")}
                  className="min-h-11 min-w-11 shrink-0 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <ArrowLeft className="size-5" />
                </button>
                <h1 className="font-display text-xl sm:text-2xl text-foreground min-w-0">
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    aria-label={`${t("Naam bewerken")}: ${sessionName}`}
                    title={t("Naam bewerken")}
                    className="min-h-11 max-w-full truncate text-left hover:text-brand transition-colors cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-md"
                  >
                    {sessionName}
                  </button>
                </h1>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 justify-between sm:justify-end sm:shrink-0 min-w-0">
            <div className="flex items-center gap-2 bg-card border border-border pl-3 pr-1 rounded-lg">
              <Timer className="size-4 text-brand shrink-0" aria-hidden="true" />
              {session.completedAt ? (
                <div className="flex items-center gap-1 text-base font-semibold text-zinc-200 tabular-nums">
                  {([
                    { label: t("Uren"), value: Math.floor(elapsed / 3600), max: undefined as number | undefined, compose: (n: number) => n * 3600 + (elapsed % 3600) },
                    { label: t("Minuten"), value: Math.floor((elapsed % 3600) / 60), max: 59, compose: (n: number) => Math.floor(elapsed / 3600) * 3600 + n * 60 + (elapsed % 60) },
                    { label: t("Seconden"), value: elapsed % 60, max: 59, compose: (n: number) => Math.floor(elapsed / 60) * 60 + n },
                  ]).map((part, i) => (
                    <React.Fragment key={part.label}>
                      {i > 0 && <span className="text-zinc-500" aria-hidden="true">:</span>}
                      <input
                        type="text"
                        inputMode="numeric"
                        aria-label={part.label}
                        value={part.value}
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
                          const n = Math.max(0, parseInt(digits, 10) || 0);
                          const clamped = part.max !== undefined ? Math.min(part.max, n) : n;
                          updateElapsedSeconds(part.compose(clamped));
                        }}
                        className="w-11 min-h-11 bg-transparent border-b border-zinc-700 hover:border-zinc-500 focus:border-brand text-center focus:outline-none"
                      />
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <>
                  <span className="text-base tabular-nums font-semibold text-zinc-200">
                    {formatTime(elapsed)}
                  </span>
                  <button
                    type="button"
                    onClick={togglePause}
                    aria-label={isPaused ? t("Resume") : t("Pause")}
                    className="min-h-11 min-w-11 inline-flex items-center justify-center rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {isPaused ? <Play className="size-4 text-brand" /> : <Pause className="size-4" />}
                  </button>
                </>
              )}
            </div>

            {session.completedAt ? (
              <Button
                onClick={handleSaveHistoryEdit}
                disabled={saving}
                className="bg-brand hover:bg-brand-hover text-zinc-900 font-semibold px-4 min-h-11"
              >
                <Save className="size-4 mr-1.5" />
                {t("Save")}
              </Button>
            ) : (
              <Button
                onClick={handleFinishClick}
                className="bg-brand hover:bg-brand-hover text-zinc-900 font-semibold px-4 min-h-11"
              >
                <Trophy className="size-4 mr-1.5" />
                {t("Finish")}
              </Button>
            )}
          </div>
        </div>
        {unsynced && (
          <p role="status" className="mt-2 text-xs text-muted-foreground">
            {t("Wijzigingen nog niet gesynchroniseerd. Ze zijn op dit apparaat bewaard.")}
          </p>
        )}
        {actionError && <InlineAlert className="mt-2">{actionError}</InlineAlert>}
      </div>

      {/* Workout Notes Card - Only in edit mode of a completed session */}
      {session?.completedAt ? (
        <div className="bg-card ring-1 ring-foreground/10 rounded-xl p-3.5 mb-6">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            <FileText className="size-3.5 text-brand" />
            <span>{t("Notes")}</span>
          </div>
          <Textarea
            value={summaryNotes}
            onChange={(e) => setSummaryNotes(e.target.value)}
            placeholder={t("Write session feedback, how you felt, details...")}
            className="bg-white/5 border-border min-h-[60px] text-xs text-foreground focus-visible:ring-brand"
          />
        </div>
      ) : null}

      {exercises.length === 0 ? (
        <div className="flex-1 flex flex-col gap-6 pb-20 max-[375px]:-mx-4">
          {unknownExerciseDraft ? (
            <div className="flex-1 flex flex-col gap-6 px-1 sm:px-0">
              <div className="flex items-center justify-between px-1 mb-2">
                <h2 className="text-sm font-medium text-muted-foreground">{t("Add New Exercise")}</h2>
              </div>
              <ExerciseEditBlock
                exercise={unknownExerciseDraft}
                index={0}
                onChange={(fields) => setUnknownExerciseDraft((prev) => prev ? { ...prev, ...fields } : null)}
                onSave={() => addExerciseFromDraft(unknownExerciseDraft)}
                onCancel={() => setUnknownExerciseDraft(null)}
                saveButtonLabel={t("Voeg toe aan training")}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
              <Dumbbell className="size-12 text-zinc-600 mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                {t("No exercises yet. Add one to start.")}
              </p>
              {showAddExercise ? (
                <div className="flex flex-col gap-3 w-full max-w-sm px-4">
                  <div className="flex gap-2 w-full">
                    <ExerciseAutocomplete
                      value={newExerciseName}
                      onChange={setNewExerciseName}
                      onSelect={(name, sets, reps, category, equipment, defaultRestTime, defaultWeight, defaultDistance, defaultDuration, perSide, isAssisted, lastSets) => {
                        if (category) {
                          addExercise(name, category, sets, reps, equipment, perSide, isAssisted, defaultWeight, defaultDistance, defaultDuration, lastSets, defaultRestTime);
                        } else {
                          setUnknownExerciseDraft({
                            name,
                            category: "Free Weights",
                            sets: (sets ?? 3).toString(),
                            reps: (reps ?? 8).toString(),
                            weight: defaultWeight != null ? toInputString(Math.abs(defaultWeight)) : "",
                            distance: toInputString(defaultDistance),
                            distanceUnit: "km",
                            duration: defaultDuration ? formatDuration(defaultDuration) : "",
                            defaultRestTime: formatDuration(defaultRestTime ?? 90),
                            equipment: equipment || "",
                            perSide: Boolean(perSide),
                            isAssisted: Boolean(isAssisted),
                            trackingFields: { reps: true, time: false, weight: true, distance: false }
                          });
                        }
                      }}
                      placeholder={t("Search exercise") + "..."}
                      className="flex-1 h-11 text-sm"
                    />
                    <Button
                      variant="ghost"
                      onClick={() => setShowAddExercise(false)}
                      className="min-h-11 text-xs text-muted-foreground hover:bg-white/5"
                    >
                      {t("Cancel")}
                    </Button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUnknownExerciseDraft({
                        name: newExerciseName,
                        category: "Free Weights",
                        sets: "3",
                        reps: "8",
                        weight: "",
                        distance: "",
                        distanceUnit: "km",
                        duration: "",
                        defaultRestTime: "01:30",
                        equipment: "",
                        perSide: false,
                        isAssisted: false,
                        trackingFields: { reps: true, time: false, weight: true, distance: false }
                      });
                    }}
                    className="min-h-11 text-xs text-brand hover:underline font-medium text-center"
                  >
                    + {t("Nieuwe oefening instellen")}
                  </button>
                </div>
              ) : (
                <Button
                  onClick={() => setShowAddExercise(true)}
                  className="bg-brand hover:bg-brand-hover text-zinc-900 font-semibold min-h-11"
                >
                  <Plus className="size-4 mr-1.5" />
                  {t("Add Exercise")}
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-6 pb-20 max-[375px]:-mx-4">
          <div className="flex items-center justify-between px-1 mb-2">
            <h2 className="text-sm font-medium text-muted-foreground">{t("Exercises")}</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-brand/10 text-brand">
              {exercises.length} {exercises.length === 1 ? t("exercise") : t("exercises")}
            </span>
          </div>
          {exercises.map((ex: SessionExercise, exIdx: number) => {
            if (editingExerciseIdx === exIdx && editingExerciseDraft) {
              return (
                <div key={ex.sessionExerciseId ?? exIdx} className="mb-4">
                  <ExerciseEditBlock
                    exercise={editingExerciseDraft}
                    index={exIdx}
                    onChange={(fields) =>
                      setEditingExerciseDraft((prev) => (prev ? { ...prev, ...fields } : null))
                    }
                    onSave={() => saveEditedExercise(exIdx, editingExerciseDraft)}
                    onCancel={() => {
                      setEditingExerciseIdx(null);
                      setEditingExerciseDraft(null);
                    }}
                    saveButtonLabel={t("Wijzigingen Opslaan")}
                  />
                </div>
              );
            }

            return (
              <WorkoutExerciseCard
                key={ex.sessionExerciseId ?? exIdx}
                ex={ex}
                exIdx={exIdx}
                totalExercises={exercises.length}
                saving={saving}
                replacingExerciseId={replacingExerciseId}
                setReplacingExerciseId={setReplacingExerciseId}
                replaceName={replaceName}
                setReplaceName={setReplaceName}
                replaceExercise={replaceExercise}
                onStartEditing={startEditingExercise}
                updateCategory={updateCategory}
                updateEquipment={updateEquipment}
                updateIsAssisted={updateIsAssisted}
                removeExercise={removeExercise}
                moveExerciseUpDirect={moveExerciseUpDirect}
                moveExerciseDownDirect={moveExerciseDownDirect}
                updateSet={updateSet}
                addSet={addSet}
                toggleSetCompleted={toggleSetCompleted}
                removeSet={removeSet}
                previousSetsMap={previousSetsMap}
                activeRestExerciseIdx={activeRestExerciseIdx}
                activeRestSetIdx={activeRestSetIdx}
                restSecondsLeft={restSecondsLeft}
                restTotalSeconds={restTotalSeconds}
                restActive={restActive}
                lastCompletedSet={lastCompletedSet}
                activeMenuExerciseId={activeMenuExerciseId}
                setActiveMenuExerciseId={setActiveMenuExerciseId}
                activeEquipmentMenuExerciseId={activeEquipmentMenuExerciseId}
                setActiveEquipmentMenuExerciseId={setActiveEquipmentMenuExerciseId}
                setHistoryExerciseName={handleSetHistoryExercise}
                startRestTimer={startRestTimer}
                stopRestTimer={stopRestTimer}
                adjustRestTimer={adjustRestTimer}
                onStartRepTimer={handleStartRepTimer}
                highlightZeroReps={highlightZeroReps}
                soundEnabled={soundEnabled}
                toggleSound={toggleSound}
              />
            );
          })}

          {/* Underneath other exercises: render ExerciseEditBlock if unknownExerciseDraft exists */}
          {unknownExerciseDraft ? (
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-medium text-muted-foreground">{t("Add New Exercise")}</h3>
              </div>
              <ExerciseEditBlock
                exercise={unknownExerciseDraft}
                index={exercises.length}
                onChange={(fields) => setUnknownExerciseDraft((prev) => prev ? { ...prev, ...fields } : null)}
                onSave={() => addExerciseFromDraft(unknownExerciseDraft)}
                onCancel={() => setUnknownExerciseDraft(null)}
                saveButtonLabel={t("Voeg toe aan training")}
              />
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center justify-center">
              {showAddExercise ? (
                <div className="flex flex-col gap-3 w-full max-w-sm px-4">
                  <div className="flex gap-2 w-full">
                    <ExerciseAutocomplete
                      value={newExerciseName}
                      onChange={setNewExerciseName}
                      onSelect={(name, sets, reps, category, equipment, defaultRestTime, defaultWeight, defaultDistance, defaultDuration, perSide, isAssisted, lastSets) => {
                        if (category) {
                          addExercise(name, category, sets, reps, equipment, perSide, isAssisted, defaultWeight, defaultDistance, defaultDuration, lastSets, defaultRestTime);
                        } else {
                          setUnknownExerciseDraft({
                            name,
                            category: "Free Weights",
                            sets: (sets ?? 3).toString(),
                            reps: (reps ?? 8).toString(),
                            weight: defaultWeight != null ? toInputString(Math.abs(defaultWeight)) : "",
                            distance: toInputString(defaultDistance),
                            distanceUnit: "km",
                            duration: defaultDuration ? formatDuration(defaultDuration) : "",
                            defaultRestTime: formatDuration(defaultRestTime ?? 90),
                            equipment: equipment || "",
                            perSide: Boolean(perSide),
                            isAssisted: Boolean(isAssisted),
                            trackingFields: { reps: true, time: false, weight: true, distance: false }
                          });
                        }
                      }}
                      placeholder={t("Search exercise") + "..."}
                      className="flex-1 h-11 text-sm"
                    />
                    <Button
                      variant="ghost"
                      onClick={() => setShowAddExercise(false)}
                      className="min-h-11 text-xs text-muted-foreground hover:bg-white/5"
                    >
                      {t("Cancel")}
                    </Button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUnknownExerciseDraft({
                        name: newExerciseName,
                        category: "Free Weights",
                        sets: "3",
                        reps: "8",
                        weight: "",
                        distance: "",
                        distanceUnit: "km",
                        duration: "",
                        defaultRestTime: "01:30",
                        equipment: "",
                        perSide: false,
                        isAssisted: false,
                        trackingFields: { reps: true, time: false, weight: true, distance: false }
                      });
                    }}
                    className="min-h-11 text-xs text-brand hover:underline font-medium text-center"
                  >
                    + {t("Nieuwe oefening instellen")}
                  </button>
                </div>
              ) : (
                <Button
                  onClick={() => setShowAddExercise(true)}
                  className="bg-brand/10 hover:bg-brand/20 border border-brand/20 text-brand font-semibold w-full sm:w-64 min-h-11"
                >
                  <Plus className="size-4 mr-1.5" />
                  {t("Add Exercise")}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={showLeaveWarning}
        title={t("Leave session?")}
        description={t("Je laatste wijzigingen zijn nog niet naar de server gestuurd. Ze blijven op dit apparaat bewaard en worden later alsnog gesynchroniseerd.")}
        cancelLabel={t("Cancel")}
        confirmLabel={t("Leave")}
        onCancel={() => setShowLeaveWarning(false)}
        onConfirm={confirmLeave}
        tone="destructive"
      />

      <ConfirmDialog
        open={showFinishedWarning}
        title={t("Incomplete sets")}
        description={t("You have sets that are not marked completed. Do you want to finish anyway?")}
        cancelLabel={t("Cancel")}
        confirmLabel={t("Finish")}
        onCancel={() => setShowFinishedWarning(false)}
        onConfirm={proceedToSummary}
      />

      <ConfirmDialog
        open={showZeroRepsWarning}
        title={t("Sets with 0 reps")}
        description={t("You have completed sets with 0 reps. Do you want to finish anyway?")}
        cancelLabel={t("Cancel")}
        confirmLabel={t("Finish")}
        onCancel={() => setShowZeroRepsWarning(false)}
        onConfirm={handleZeroRepsConfirm}
      />

      {/* Exercise History View Modal Overlay */}
      {historyExerciseName && (
        <ExerciseHistoryModal
          exerciseName={historyExerciseName}
          equipment={historyExerciseEquipment ?? undefined}
          onClose={() => handleSetHistoryExercise(null, null)}
        />
      )}

      {/* Active Rep Timer Modal Overlay */}
      {activeRepTimer && (
        <RepTimerModal
          key={`${activeRepTimer.exIdx}-${activeRepTimer.setIdx}`}
          sessionId={session.sessionId}
          exIdx={activeRepTimer.exIdx}
          setIdx={activeRepTimer.setIdx}
          restored={activeRepTimer.restored ?? null}
          exerciseName={activeRepTimer.exerciseName}
          setNumber={activeRepTimer.setNumber}
          targetDurationSeconds={activeRepTimer.targetDurationSeconds}
          onFinish={handleFinishRepTimer}
          onClose={closeRepTimer}
        />
      )}
    </div>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const paddedMinutes = String(minutes).padStart(2, "0");
  const paddedSeconds = String(seconds).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }
  return `${minutes}:${paddedSeconds}`;
}

function parseDurationHelper(val: string): number | null {
  if (!val || !val.trim()) return null;
  if (val.includes(":")) {
    const parts = val.split(":");
    const min = parseInt(parts[0], 10) || 0;
    const sec = parseInt(parts[1], 10) || 0;
    return min * 60 + sec;
  }
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? null : parsed;
}
