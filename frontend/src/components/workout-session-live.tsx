"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExerciseAutocomplete } from "@/components/exercise-autocomplete";
import {
  ArrowLeft,
  Plus,
  Trophy,
  Timer,
  Pause,
  Play,
  Dumbbell
} from "lucide-react";
import { parseDateString } from "@/lib/utils";
import { WorkoutExerciseCard } from "@/components/workout-exercise-card";
import { ExerciseHistoryModal } from "@/components/exercise-history-modal";
import { WorkoutCompletionSummary } from "@/components/workout-completion-summary";
import type { FullWorkoutSession, SessionExercise, SessionSet, PersonalRecord } from "@backend/types/shared";


export function WorkoutSessionLive({
  session: initialSession,
  userId: _userId,
}: {
  session?: FullWorkoutSession | null;
  userId?: number;
}) {
  const router = useRouter();
  const [session, setSession] = useState<FullWorkoutSession | null>(initialSession ?? null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Timer state
  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Rest Timer State
  const [restSecondsLeft, setRestSecondsLeft] = useState(0);
  const [restTotalSeconds, setRestTotalSeconds] = useState(0);
  const [restActive, setRestActive] = useState(false);
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [activeRestExerciseIdx, setActiveRestExerciseIdx] = useState<number | null>(null);
  const [activeRestSetIdx, setActiveRestSetIdx] = useState<number | null>(null);

  // Pop Burst satisfaction animation state
  const [lastCompletedSet, setLastCompletedSet] = useState<{ exIdx: number; setIdx: number } | null>(null);

  // UI state
  const [sessionName, setSessionName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [activeMenuExerciseId, setActiveMenuExerciseId] = useState<number | null>(null);
  const [activeEquipmentMenuExerciseId, setActiveEquipmentMenuExerciseId] = useState<number | null>(null);
  const [replacingExerciseId, setReplacingExerciseId] = useState<number | null>(null);
  const [replaceName, setReplaceName] = useState("");

  // Exercise history modal state
  const [historyExerciseName, setHistoryExerciseName] = useState<string | null>(null);

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

  // Leave confirmation state
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const bypassWarningRef = useRef(false);

  // Synchronization queue and version tracking to avoid concurrent API race conditions
  const syncVersionRef = useRef(0);
  const syncPromiseChain = useRef<Promise<unknown>>(Promise.resolve());

  // Fetch initial session if not provided
  const createSession = useCallback(async () => {
    setLoading(true);
    try {
      const s = await api.workouts.sessions.create();
      setSession(s);
    } catch (err) {
      console.error("Failed to create session", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      createSession();
    }
  }, [session, createSession]);

  // Sync session details when loaded
  useEffect(() => {
    if (session) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSessionName(session.name || t("Workout Session"));
      setSummaryNotes(session.notes || "");
      
      const started = parseDateString(session.startedAt);
      const completed = session.completedAt ? parseDateString(session.completedAt) : null;
      const diffMs = completed ? completed.getTime() - started.getTime() : Date.now() - started.getTime();
      const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
      setElapsed(diffSecs);
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

  // Main timer tick
  useEffect(() => {
    if (!session?.sessionId || isPaused || isSummaryView || session?.completedAt) return;

    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.sessionId, isPaused, isSummaryView, session?.completedAt]);

  // Rest Timer countdown
  useEffect(() => {
    if (restActive && restSecondsLeft > 0) {
      restIntervalRef.current = setInterval(() => {
        setRestSecondsLeft((prev) => {
          if (prev <= 1) {
            setRestActive(false);
            if (restIntervalRef.current) clearInterval(restIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    }

    return () => {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    };
  }, [restActive, restSecondsLeft]);

  // Alert on window leave
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (bypassWarningRef.current || !session || isSummaryView || session.completedAt) return;
      e.preventDefault();
      e.returnValue = t("You have an active workout. Leaving will lose unsaved progress.");
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [session, isSummaryView]);

  // Stop / start functions
  function togglePause() {
    setIsPaused((p) => !p);
  }

  function getExerciseRestTime(ex: SessionExercise): number {
    return ex.templateExercise?.defaultRestTime ?? 90;
  }

  function startRestTimer(exIdx: number, setIdx: number, customTime?: number) {
    if (!session?.exercises) return;
    const ex = session.exercises[exIdx];
    const time = customTime || getExerciseRestTime(ex);
    setRestSecondsLeft(time);
    setRestTotalSeconds(time);
    setRestActive(true);
    setActiveRestExerciseIdx(exIdx);
    setActiveRestSetIdx(setIdx);
  }

  function stopRestTimer() {
    setRestActive(false);
    setRestSecondsLeft(0);
    setActiveRestExerciseIdx(null);
    setActiveRestSetIdx(null);
  }

  function adjustRestTimer(seconds: number) {
    setRestSecondsLeft((prev) => Math.max(0, prev + seconds));
    setRestTotalSeconds((prev) => Math.max(0, prev + seconds));
  }

  async function updateElapsedSeconds(newSeconds: number) {
    setElapsed(newSeconds);
    const h = Math.floor(newSeconds / 3600);
    const m = Math.floor((newSeconds % 3600) / 60);
    const s = newSeconds % 60;
    setSummaryHours(String(h));
    setSummaryMinutes(String(m));
    setSummarySeconds(String(s));

    if (!session) return;
    try {
      const startedTime = parseDateString(session.startedAt).getTime();
      const finalCompletedAt = new Date(startedTime + newSeconds * 1000).toISOString();
      const sRes = await api.workouts.sessions.update(session.sessionId, {
        completedAt: finalCompletedAt,
      });
      setSession(sRes);
    } catch (err) {
      console.error("Failed to update elapsed time", err);
    }
  }

  // API operations
  async function saveExercises(exercises: SessionExercise[]) {
    if (!session) return;
    setSaving(true);
    const currentVersion = ++syncVersionRef.current;

    syncPromiseChain.current = syncPromiseChain.current.then(async () => {
      try {
        const s = await api.workouts.sessions.update(session.sessionId, {
          exercises: exercises.map((ex) => ({
            sessionExerciseId: ex.sessionExerciseId,
            exerciseName: ex.exerciseName,
            sortOrder: ex.sortOrder,
            category: ex.category ?? "resistance",
            equipment: ex.equipment ?? "none",
            sets: ex.sets?.map((s: SessionSet) => ({
              setId: s.setId,
              setNumber: s.setNumber,
              reps: s.reps ?? null,
              weight: s.weight,
              distance: s.distance,
              duration: s.duration,
              rpe: s.rpe,
              heartRate: s.heartRate,
              completed: s.completed,
            })),
          })),
        });

        if (currentVersion === syncVersionRef.current) {
          setSession(s);
        }
      } catch (err) {
        console.error("Failed to sync exercises", err);
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
    try {
      const s = await api.workouts.sessions.update(session.sessionId, {
        name: sessionName.trim(),
      });
      setSession(s);
    } catch (err) {
      console.error("Failed to save title", err);
    }
  }

  async function updateCategory(exerciseIndex: number, category: string) {
    if (!session) return;
    const exercises = [...(session.exercises ?? [])];
    exercises[exerciseIndex] = { ...exercises[exerciseIndex], category };
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
    const sets = [...(ex.sets ?? [])];
    sets[setIndex] = { ...sets[setIndex], [field]: value } as SessionSet;
    
    // Copy the updated value to subsequent incomplete sets in the same exercise
    for (let i = setIndex + 1; i < sets.length; i++) {
      if (sets[i].completed !== 1) {
        sets[i] = { ...sets[i], [field]: value } as SessionSet;
      }
    }

    ex.sets = sets;
    exercises[exerciseIndex] = ex;
    setSession({ ...session, exercises });

    await saveExercises(exercises);
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
      const prevSets = previousSetsMap[ex.exerciseName];
      const prevSet = prevSets?.[setIndex] ?? prevSets?.[prevSets.length - 1];

      if (ex.category === "resistance") {
        set.weight = set.weight ?? prevSet?.weight ?? 0;
        set.reps = set.reps ?? prevSet?.reps ?? 10;
        set.rpe = set.rpe ?? prevSet?.rpe ?? null;
      } else if (ex.category === "bodyweight") {
        set.weight = set.weight ?? prevSet?.weight ?? 0;
        set.reps = set.reps ?? prevSet?.reps ?? 10;
      } else if (ex.category === "cardio") {
        set.distance = set.distance ?? prevSet?.distance ?? 0;
        set.duration = set.duration ?? prevSet?.duration ?? 0;
        set.heartRate = set.heartRate ?? prevSet?.heartRate ?? null;
      } else if (ex.category === "isometric") {
        set.duration = set.duration ?? prevSet?.duration ?? 0;
        set.weight = set.weight ?? prevSet?.weight ?? 0;
      }

      const restTime = getExerciseRestTime(ex);
      if (restTime > 0) {
        setRestSecondsLeft(restTime);
        setRestTotalSeconds(restTime);
        setRestActive(true);
        setActiveRestExerciseIdx(exerciseIndex);
        setActiveRestSetIdx(setIndex);
      }

      setLastCompletedSet({ exIdx: exerciseIndex, setIdx: setIndex });
      setTimeout(() => setLastCompletedSet(null), 800);
    } else {
      if (activeRestExerciseIdx === exerciseIndex && activeRestSetIdx === setIndex) {
        setRestActive(false);
        setRestSecondsLeft(0);
        setActiveRestExerciseIdx(null);
        setActiveRestSetIdx(null);
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

    const newSet: SessionSet = {
      setId: undefined as any,
      setNumber: newSetNum,
      reps: lastSet?.reps ?? 10,
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

  async function addExercise(nameOverride?: string, categoryOverride?: string, defaultSets?: number, defaultReps?: number, equipmentOverride?: string) {
    const name = nameOverride || newExerciseName.trim();
    if (!session || !name) return;
    const exercises = [...(session.exercises ?? [])];
    const cat = categoryOverride || "resistance";
    const eq = equipmentOverride || (cat === "resistance" ? "dumbbell" : "none");
    
    const numSets = defaultSets || 1;
    const numReps = defaultReps ?? 10;
    const initialSets = [];
    for (let i = 1; i <= numSets; i++) {
      initialSets.push({
        setNumber: i,
        reps: numReps,
        weight: null,
        distance: null,
        duration: null,
        rpe: null,
        heartRate: null,
        completed: 0,
      });
    }

    exercises.push({
      exerciseName: name,
      sortOrder: exercises.length,
      category: cat,
      equipment: eq,
      sets: initialSets,
    });

    setNewExerciseName("");
    setShowAddExercise(false);
    setSession({ ...session, exercises });
    await saveExercises(exercises);
  }

  async function removeExercise(id: number) {
    if (!session) return;
    const exercises = (session.exercises ?? []).filter((ex) => ex.sessionExerciseId !== id);
    const reindexed = exercises.map((ex, i) => ({ ...ex, sortOrder: i }));
    setSession({ ...session, exercises: reindexed });
    await saveExercises(reindexed);
  }

  async function replaceExercise(exerciseId: number, name: string, category?: string, equipment?: string) {
    if (!session) return;
    const exercises = [...(session.exercises ?? [])];
    const idx = exercises.findIndex((ex) => ex.sessionExerciseId === exerciseId);
    if (idx === -1) return;

    exercises[idx] = {
      ...exercises[idx],
      exerciseName: name,
      category: category ?? "resistance",
      equipment: equipment ?? "none",
    };

    setReplacingExerciseId(null);
    setReplaceName("");
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
    const temp = exercises[from];
    exercises[from] = exercises[to];
    exercises[to] = temp;
    const reindexed = exercises.map((ex, i) => ({ ...ex, sortOrder: i }));
    setSession({ ...session, exercises: reindexed });
    await saveExercises(reindexed);
  }

  // Handle final completion
  function handleFinishClick() {
    // Set duration fields first
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    setSummaryHours(String(h));
    setSummaryMinutes(String(m));
    setSummarySeconds(String(s));

    // Check if there are any completed sets with 0/null reps
    let hasZeroSets = false;
    if (session?.exercises) {
      for (const ex of session.exercises) {
        if (ex.sets?.some((s) => s.completed === 1 && (s.reps === 0 || s.reps === null))) {
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
    
    // Load PRs details
    const h = parseInt(summaryHours, 10) || 0;
    const m = Math.min(59, parseInt(summaryMinutes, 10) || 0);
    const s = Math.min(59, parseInt(summarySeconds, 10) || 0);
    const finalSecs = h * 3600 + m * 60 + s;

    if (session) {
      api.workouts.sessions.getPRs(session.sessionId, finalSecs).then((prs) => {
        setPersonalRecords(prs);
      }).catch(err => {
        console.error("Failed to load PRs", err);
        setPersonalRecords([]);
      });
    } else {
      setPersonalRecords([]);
    }

    setIsSummaryView(true);
  }

  async function saveWorkoutSummary() {
    if (!session) return;
    setSaving(true);
    try {
      // Calculate duration in seconds
      const h = parseInt(summaryHours, 10) || 0;
      const m = Math.min(59, parseInt(summaryMinutes, 10) || 0);
      const s = Math.min(59, parseInt(summarySeconds, 10) || 0);
      const finalSecs = h * 3600 + m * 60 + s;

      const startedTime = parseDateString(session.startedAt).getTime();
      const finalCompletedAt = new Date(startedTime + finalSecs * 1000).toISOString();

      bypassWarningRef.current = true;

      await api.workouts.sessions.update(session.sessionId, {
        name: sessionName.trim(),
        notes: summaryNotes.trim(),
      });

      await api.workouts.sessions.complete(session.sessionId, finalCompletedAt);

      router.push(`/workouts/history/${session.sessionId}?celebrate=true`);
      router.refresh();
    } catch (err) {
      console.error("Failed to complete session", err);
    } finally {
      setSaving(false);
    }
  }

  async function discardWorkout() {
    if (!session || !confirm(t("Are you sure you want to delete this active workout session? This cannot be undone."))) return;
    bypassWarningRef.current = true;
    try {
      await api.workouts.sessions.delete(session.sessionId);
      router.push("/workouts");
      router.refresh();
    } catch (err) {
      console.error("Failed to discard session", err);
    }
  }

  function handleBackClick(e: React.MouseEvent) {
    e.preventDefault();
    if (session?.completedAt) {
      bypassWarningRef.current = true;
      router.push(`/workouts/history/${session.sessionId}`);
    } else {
      setShowLeaveWarning(true);
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
              vol += s.weight * s.reps;
            }
          }
        }
      }
    }
    return vol;
  }

  const exercises = session?.exercises ?? [];

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
      <WorkoutCompletionSummary
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
        onDiscard={discardWorkout}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Global Header (Sticky) */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-md z-20 pb-4 pt-1 border-b border-border/40 mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  onBlur={saveWorkoutTitle}
                  onKeyDown={(e) => e.key === "Enter" && saveWorkoutTitle()}
                  autoFocus
                  className="bg-white/5 border-brand/40 text-xl font-semibold h-9"
                />
                <Button size="sm" onClick={saveWorkoutTitle} className="bg-brand text-zinc-900 h-9">
                  <Check className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group max-w-full">
                <button
                  onClick={handleBackClick}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 mr-1"
                >
                  <ArrowLeft className="size-5" />
                </button>
                <h1
                  onClick={() => setIsEditingName(true)}
                  className="font-display text-xl sm:text-2xl text-foreground truncate cursor-pointer hover:text-brand transition-colors"
                >
                  {sessionName}
                </h1>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 justify-between sm:justify-end shrink-0">
            <div className="flex items-center gap-2 bg-card border border-border px-3 py-1.5 rounded-lg">
              <Timer className="size-4 text-brand" />
              {session.completedAt ? (
                <div className="flex items-center gap-1 font-mono text-base font-semibold text-zinc-200">
                  <input
                    type="number"
                    value={Math.floor(elapsed / 3600)}
                    onChange={(e) => {
                      const h = Math.max(0, parseInt(e.target.value) || 0);
                      const m = Math.floor((elapsed % 3600) / 60);
                      const s = elapsed % 60;
                      updateElapsedSeconds(h * 3600 + m * 60 + s);
                    }}
                    className="w-7 bg-transparent border-b border-zinc-700 hover:border-zinc-500 focus:border-brand text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min="0"
                  />
                  <span className="text-zinc-500">:</span>
                  <input
                    type="number"
                    value={Math.floor((elapsed % 3600) / 60)}
                    onChange={(e) => {
                      const h = Math.floor(elapsed / 3600);
                      const m = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                      const s = elapsed % 60;
                      updateElapsedSeconds(h * 3600 + m * 60 + s);
                    }}
                    className="w-7 bg-transparent border-b border-zinc-700 hover:border-zinc-500 focus:border-brand text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min="0"
                    max="59"
                  />
                  <span className="text-zinc-500">:</span>
                  <input
                    type="number"
                    value={elapsed % 60}
                    onChange={(e) => {
                      const h = Math.floor(elapsed / 3600);
                      const m = Math.floor((elapsed % 3600) / 60);
                      const s = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                      updateElapsedSeconds(h * 3600 + m * 60 + s);
                    }}
                    className="w-7 bg-transparent border-b border-zinc-700 hover:border-zinc-500 focus:border-brand text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min="0"
                    max="59"
                  />
                </div>
              ) : (
                <>
                  <span className="font-mono text-base tabular-nums font-semibold text-zinc-200">
                    {formatTime(elapsed)}
                  </span>
                  <button
                    onClick={togglePause}
                    className="ml-1 p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isPaused ? <Play className="size-3.5 text-brand" /> : <Pause className="size-3.5" />}
                  </button>
                </>
              )}
            </div>

            <Button
              onClick={handleFinishClick}
              className="bg-brand hover:bg-brand-hover text-zinc-900 font-semibold px-4 h-9 shadow-glow-sm"
            >
              <Trophy className="size-4 mr-1.5" />
              {t("Finish")}
            </Button>
          </div>
        </div>
      </div>

      {exercises.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
          <Dumbbell className="size-12 text-zinc-600 mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            {t("No exercises yet. Add one to start.")}
          </p>
          {showAddExercise ? (
            <div className="flex gap-2 w-full max-w-xs px-4">
              <ExerciseAutocomplete
                value={newExerciseName}
                onChange={setNewExerciseName}
                onSelect={(name, sets, reps, category, equipment) => {
                  addExercise(name, category, sets, reps, equipment);
                }}
                placeholder={t("Search exercise") + "..."}
                className="flex-1 h-9 text-sm"
              />
              <Button
                variant="ghost"
                onClick={() => setShowAddExercise(false)}
                className="h-9 text-xs text-muted-foreground hover:bg-white/5"
              >
                {t("Cancel")}
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setShowAddExercise(true)}
              className="bg-brand hover:bg-brand-hover text-zinc-900 font-semibold"
            >
              <Plus className="size-4 mr-1.5" />
              {t("Add Exercise")}
            </Button>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-6 pb-20 max-[375px]:-mx-4">
          {exercises.map((ex: SessionExercise, exIdx: number) => (
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
              updateCategory={updateCategory}
              updateEquipment={updateEquipment}
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
              setHistoryExerciseName={setHistoryExerciseName}
              startRestTimer={startRestTimer}
              stopRestTimer={stopRestTimer}
              adjustRestTimer={adjustRestTimer}
              highlightZeroReps={highlightZeroReps}
            />
          ))}

          <div className="mt-4 flex flex-col items-center justify-center">
            {showAddExercise ? (
              <div className="flex gap-2 w-full max-w-sm px-4">
                <ExerciseAutocomplete
                  value={newExerciseName}
                  onChange={setNewExerciseName}
                  onSelect={(name, sets, reps, category, equipment) => {
                    addExercise(name, category, sets, reps, equipment);
                  }}
                  placeholder={t("Search exercise") + "..."}
                  className="flex-1 h-10 text-sm"
                />
                <Button
                  variant="ghost"
                  onClick={() => setShowAddExercise(false)}
                  className="h-10 text-xs text-zinc-400 hover:bg-white/5"
                >
                  {t("Cancel")}
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setShowAddExercise(true)}
                className="bg-brand/10 hover:bg-brand/20 border border-brand/20 text-brand font-semibold w-full sm:w-64 h-10"
              >
                <Plus className="size-4 mr-1.5" />
                {t("Add Exercise")}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Leave warning modal */}
      {showLeaveWarning && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 w-full max-w-sm flex flex-col gap-4 text-center">
            <h3 className="font-bold text-lg text-foreground">{t("Leave session?")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("You have an active workout session. Leaving will lose unsaved progress.")}
            </p>
            <div className="flex gap-2 justify-center mt-2">
              <Button onClick={() => setShowLeaveWarning(false)} className="bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 w-24">
                {t("Cancel")}
              </Button>
              <Button onClick={confirmLeave} className="bg-red-600 hover:bg-red-700 text-white w-24">
                {t("Leave")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Finished warning modal */}
      {showFinishedWarning && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 w-full max-w-sm flex flex-col gap-4 text-center">
            <h3 className="font-bold text-lg text-foreground">{t("Incomplete sets")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("You have sets that are not marked completed. Do you want to finish anyway?")}
            </p>
            <div className="flex gap-2 justify-center mt-2">
              <Button onClick={() => setShowFinishedWarning(false)} className="bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 w-24">
                {t("Cancel")}
              </Button>
              <Button onClick={proceedToSummary} className="bg-brand text-zinc-950 font-bold hover:bg-brand-hover w-24">
                {t("Finish")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Zero reps warning modal */}
      {showZeroRepsWarning && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 w-full max-w-sm flex flex-col gap-4 text-center">
            <h3 className="font-bold text-lg text-foreground">{t("Sets with 0 reps")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("You have completed sets with 0 reps. Do you want to finish anyway?")}
            </p>
            <div className="flex gap-2 justify-center mt-2">
              <Button onClick={() => setShowZeroRepsWarning(false)} className="bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 w-24">
                {t("Cancel")}
              </Button>
              <Button onClick={handleZeroRepsConfirm} className="bg-brand text-zinc-950 font-bold hover:bg-brand-hover w-24">
                {t("Finish")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise History View Modal Overlay */}
      {historyExerciseName && (
        <ExerciseHistoryModal
          exerciseName={historyExerciseName}
          onClose={() => setHistoryExerciseName(null)}
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
