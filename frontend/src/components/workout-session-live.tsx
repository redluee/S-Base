/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ExerciseAutocomplete } from "@/components/exercise-autocomplete";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Check,
  X,
  Trophy,
  Timer,
  MoreVertical,
  Pause,
  Play,
  History,
  Trash2,
  Edit2,
  Sparkles,
  ChevronRight,
  Trash,
  Dumbbell,
  ChevronUp,
  ChevronDown
} from "lucide-react";

function BarbellIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 5h2v14H6zM16 5h2v14h-2zM2 12h4M18 12h4M6 12h12" />
      <path d="M3 8h1v8H3zM20 8h1v8h-1z" />
    </svg>
  );
}

function KettlebellIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3a4.5 4.5 0 0 0-4.5 4.5V10h9V7.5A4.5 4.5 0 0 0 12 3z" />
      <path d="M6 10h12a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3z" />
    </svg>
  );
}

function CableIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2v13" />
      <path d="M8 15h8M8 15v3a4 4 0 0 0 8 0v-3" />
      <path d="M12 18v4" />
      <circle cx="12" cy="2" r="1" fill="currentColor" />
    </svg>
  );
}

function MachineIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 20V4h16v16M4 8h16M4 12h16M4 16h16" />
      <circle cx="12" cy="6" r="1.5" />
    </svg>
  );
}

function BandIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <ellipse cx="12" cy="12" rx="7" ry="4" transform="rotate(-15 12 12)" />
    </svg>
  );
}

function NoneIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="m4.9 4.9 14.2 14.2" />
    </svg>
  );
}

const rpeColors = [
  "",
  "bg-blue-500",
  "bg-sky-400",
  "bg-sky-400",
  "bg-green-500",
  "bg-green-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-yellow-500",
  "bg-orange-500",
  "bg-red-500",
];

function EquipmentIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case "barbell":
      return <BarbellIcon className={className} />;
    case "dumbbell":
      return <Dumbbell className={className} />;
    case "kettlebell":
      return <KettlebellIcon className={className} />;
    case "cable":
      return <CableIcon className={className} />;
    case "machine":
      return <MachineIcon className={className} />;
    case "band":
      return <BandIcon className={className} />;
    default:
      return <NoneIcon className={className} />;
  }
}

interface SetRow {
  setId?: number;
  setNumber: number;
  reps?: number | null;
  weight?: number | null;
  distance?: number | null;
  duration?: number | null;
  rpe?: number | null;
  heartRate?: number | null;
  completed: number;
}

interface ExerciseWithSets {
  sessionExerciseId?: number;
  exerciseName: string;
  sortOrder: number;
  category?: string;
  equipment?: string;
  sets: SetRow[];
  templateExercise?: {
    defaultReps?: number | null;
    defaultWeight?: number | null;
    defaultDistance?: number | null;
    defaultDuration?: number | null;
    defaultRpe?: number | null;
    defaultHeartRate?: number | null;
  } | null;
}

function formatSecs(secVal: number | null | undefined): string {
  if (secVal === null || secVal === undefined || isNaN(secVal)) return "";
  const min = Math.floor(secVal / 60);
  const sec = secVal % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

function parseSecs(val: string): number | null {
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

function parseUtcDate(dateStr: string): Date {
  if (!dateStr) return new Date(0);
  return new Date(dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T") + "Z");
}

export function WorkoutSessionLive({
  session: initialSession,
  userId,
}: {
  session?: any;
  userId: number;
}) {
  const router = useRouter();
  const [session, setSession] = useState<any>(initialSession ?? null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Timer state
  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Rest Timer State
  const [restSecondsLeft, setRestSecondsLeft] = useState(0);
  const [restTotalSeconds, setRestTotalSeconds] = useState(0);
  const [restActive, setRestActive] = useState(false);
  const [restExerciseName, setRestExerciseName] = useState("");
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [activeRestExerciseIdx, setActiveRestExerciseIdx] = useState<number | null>(null);
  const [activeRestSetIdx, setActiveRestSetIdx] = useState<number | null>(null);

  // Pop Burst satisfaction animation state
  const [lastCompletedSet, setLastCompletedSet] = useState<{ exIdx: number; setIdx: number } | null>(null);

  // RPE picker state
  const [rpePickerPos, setRpePickerPos] = useState<{ exIdx: number; setIdx: number; top: number; left: number; width: number } | null>(null);

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
  const [historyData, setHistoryData] = useState<any>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Previous sets mapping (for ghost text/placeholders)
  const [previousSetsMap, setPreviousSetsMap] = useState<Record<string, any[]>>({});

  // Finished / Summary View state
  const [isSummaryView, setIsSummaryView] = useState(false);
  const [showFinishedWarning, setShowFinishedWarning] = useState(false);
  const [summaryNotes, setSummaryNotes] = useState("");
  const [summaryHours, setSummaryHours] = useState("0");
  const [summaryMinutes, setSummaryMinutes] = useState("0");
  const [summarySeconds, setSummarySeconds] = useState("0");
  const [personalRecords, setPersonalRecords] = useState<any[]>([]);

  // Leave confirmation state
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const bypassWarningRef = useRef(false);

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
      createSession();
    }
  }, [session, createSession]);

  // Set session name when session loads
  useEffect(() => {
    if (session?.name) {
      setSessionName(session.name);
    }
  }, [session?.name]);

  // Fetch exercise progress for placeholders
  const fetchProgressForExercises = useCallback(async (exercisesList: any[]) => {
    const uniqueNames = Array.from(new Set(exercisesList.map((e) => e.exerciseName)));
    for (const name of uniqueNames) {
      if (previousSetsMap[name] !== undefined) continue;
      try {
        const progress = await api.workouts.exercises.progress(name);
        const lastSession = progress.sessions?.[progress.sessions.length - 1];
        setPreviousSetsMap((prev) => ({
          ...prev,
          [name]: lastSession?.sets ?? [],
        }));
      } catch (err) {
        console.error("Failed to fetch exercise progress for " + name, err);
      }
    }
  }, [previousSetsMap]);

  useEffect(() => {
    if (session?.exercises?.length) {
      fetchProgressForExercises(session.exercises);
    }
  }, [session?.exercises, fetchProgressForExercises]);

  // Timer implementation (resilient to page reload)
  useEffect(() => {
    if (!session?.sessionId) return;
    const key = `sbase_timer_${session.sessionId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const { elapsed: storedElapsed, isPaused: storedPaused, lastTick } = JSON.parse(stored);
        setIsPaused(storedPaused);
        if (storedPaused) {
          setElapsed(storedElapsed);
        } else {
          const passed = Math.floor((Date.now() - lastTick) / 1000);
          setElapsed(storedElapsed + Math.max(0, passed));
        }
      } catch {
        // Fallback
        const start = parseUtcDate(session.startedAt).getTime();
        setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
      }
    } else {
      const start = parseUtcDate(session.startedAt).getTime();
      setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    }
  }, [session?.sessionId, session?.startedAt]);

  // Rest timer countdown effect
  useEffect(() => {
    if (restActive && restSecondsLeft > 0) {
      restIntervalRef.current = setInterval(() => {
        setRestSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(restIntervalRef.current!);
            setRestActive(false);
            setActiveRestExerciseIdx(null);
            setActiveRestSetIdx(null);
            // Audio beep feedback
            try {
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = "sine";
              osc.frequency.setValueAtTime(800, ctx.currentTime);
              gain.gain.setValueAtTime(0.08, ctx.currentTime);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start();
              osc.stop(ctx.currentTime + 0.3);
            } catch (e) {
              console.log("AudioContext failed", e);
            }
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

  // Helper to fetch rest time
  const getExerciseRestTime = (ex: any, exIdx: number) => {
    if (typeof window === "undefined") return 90;
    const key = `sbase_rest_${session?.sessionId}_${exIdx}`;
    const stored = localStorage.getItem(key);
    if (stored) return Number(stored);
    return ex.templateExercise?.defaultRestTime ?? 90;
  };

  const updateExerciseRestTime = async (exIdx: number, restTime: number) => {
    if (!session) return;
    const key = `sbase_rest_${session.sessionId}_${exIdx}`;
    localStorage.setItem(key, String(restTime));
    
    const exercises = [...(session.exercises ?? [])];
    const ex = { ...exercises[exIdx] };
    ex.templateExercise = {
      ...(ex.templateExercise ?? {}),
      defaultRestTime: restTime,
    };
    exercises[exIdx] = ex;
    setSession({ ...session, exercises });
  };

  useEffect(() => {
    if (!session?.sessionId || isPaused || isSummaryView) return;
    const interval = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        const key = `sbase_timer_${session.sessionId}`;
        localStorage.setItem(
          key,
          JSON.stringify({
            elapsed: next,
            isPaused: false,
            lastTick: Date.now(),
          })
        );
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [session?.sessionId, isPaused, isSummaryView]);

  // Intercept window reload/close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (session && !bypassWarningRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [session]);

  // Intercept browser back/popstate navigation
  useEffect(() => {
    if (!session) return;

    window.history.pushState({ type: "workout-session" }, "", window.location.href);

    const handlePopState = () => {
      if (bypassWarningRef.current) return;

      window.history.pushState({ type: "workout-session" }, "", window.location.href);
      setShowLeaveWarning(true);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [session]);

  const handleConfirmLeave = () => {
    bypassWarningRef.current = true;
    setShowLeaveWarning(false);
    router.push("/workouts");
  };

  const togglePause = () => {
    if (!session?.sessionId) return;
    const nextPaused = !isPaused;
    setIsPaused(nextPaused);
    const key = `sbase_timer_${session.sessionId}`;
    localStorage.setItem(
      key,
      JSON.stringify({
        elapsed,
        isPaused: nextPaused,
        lastTick: Date.now(),
      })
    );
  };

  function formatTime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  // Fetch history for modal
  useEffect(() => {
    if (!historyExerciseName) {
      setHistoryData(null);
      return;
    }
    async function loadHistory() {
      setLoadingHistory(true);
      try {
        const data = await api.workouts.exercises.progress(historyExerciseName!);
        setHistoryData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingHistory(false);
      }
    }
    loadHistory();
  }, [historyExerciseName]);

  // Save session exercises to DB
  async function saveExercises(exercises: ExerciseWithSets[]) {
    setSaving(true);
    try {
      const updated = await api.workouts.sessions.update(session.sessionId, {
        exercises: exercises.map((ex) => ({
          sessionExerciseId: ex.sessionExerciseId,
          exerciseName: ex.exerciseName,
          sortOrder: ex.sortOrder,
          category: ex.category ?? "resistance",
          equipment: ex.equipment ?? "none",
          sets: ex.sets.map((s) => ({
            setId: s.setId,
            setNumber: s.setNumber,
            reps: s.reps ?? 0,
            weight: s.weight,
            distance: s.distance,
            duration: s.duration,
            rpe: s.rpe,
            heartRate: s.heartRate,
            completed: s.completed,
          })),
        })),
      });
      setSession(updated);
    } catch (err) {
      console.error("Failed to save session", err);
    } finally {
      setSaving(false);
    }
  }

  // Save custom workout session title
  async function saveWorkoutTitle() {
    if (!session || !sessionName.trim()) return;
    setIsEditingName(false);
    try {
      const updated = await api.workouts.sessions.update(session.sessionId, {
        name: sessionName.trim(),
      });
      setSession(updated);
    } catch (err) {
      console.error("Failed to save session title", err);
    }
  }

  // Add set to an exercise
  async function addSet(exerciseIndex: number) {
    if (!session) return;
    const exercises = [...(session.exercises ?? [])];
    const ex = { ...exercises[exerciseIndex] };
    const sets = [...(ex.sets ?? [])];
    const lastSet = sets[sets.length - 1];

    const newSet = {
      setNumber: sets.length + 1,
      reps: lastSet?.reps ?? 10,
      weight: lastSet?.weight ?? null,
      distance: lastSet?.distance ?? null,
      duration: lastSet?.duration ?? null,
      rpe: lastSet?.rpe ?? null,
      heartRate: lastSet?.heartRate ?? null,
      completed: 0,
    };

    ex.sets = [...sets, newSet];
    exercises[exerciseIndex] = ex;
    setSession({ ...session, exercises });
    await saveExercises(exercises);
  }

  // Remove set from an exercise
  async function removeSet(exerciseIndex: number, setIndex: number) {
    if (!session) return;
    const exercises = [...(session.exercises ?? [])];
    const ex = { ...exercises[exerciseIndex] };
    let sets = [...(ex.sets ?? [])];
    sets = sets.filter((_, i) => i !== setIndex);
    // Reindex set numbers
    ex.sets = sets.map((s, idx) => ({ ...s, setNumber: idx + 1 }));
    exercises[exerciseIndex] = ex;
    setSession({ ...session, exercises });
    await saveExercises(exercises);
  }

  // Update set weight, reps, or completed status
  async function updateSet(exerciseIndex: number, setIndex: number, field: keyof SetRow, value: any) {
    if (!session) return;
    const exercises = [...(session.exercises ?? [])];
    const ex = { ...exercises[exerciseIndex] };
    const sets = [...(ex.sets ?? [])];
    sets[setIndex] = { ...sets[setIndex], [field]: value };
    
    // Copy the updated value to subsequent incomplete sets in the same exercise
    for (let i = setIndex + 1; i < sets.length; i++) {
      if (sets[i].completed !== 1) {
        sets[i] = { ...sets[i], [field]: value };
      }
    }

    ex.sets = sets;
    exercises[exerciseIndex] = ex;
    setSession({ ...session, exercises });

    // Instantly sync to backend
    await api.workouts.sessions.update(session.sessionId, {
      exercises: exercises.map((ex2) => ({
        sessionExerciseId: ex2.sessionExerciseId,
        exerciseName: ex2.exerciseName,
        sortOrder: ex2.sortOrder,
        category: ex2.category ?? "resistance",
        equipment: ex2.equipment ?? "none",
        sets: ex2.sets?.map((s: SetRow) => ({
          setId: s.setId,
          setNumber: s.setNumber,
          reps: s.reps ?? 0,
          weight: s.weight,
          distance: s.distance,
          duration: s.duration,
          rpe: s.rpe,
          heartRate: s.heartRate,
          completed: s.completed,
        })),
      })),
    });
  }

  // Done status toggle (Smart Defaults)
  async function toggleSetCompleted(exerciseIndex: number, setIndex: number) {
    if (!session) return;
    const exercises = [...(session.exercises ?? [])];
    const ex = { ...exercises[exerciseIndex] };
    const sets = [...(ex.sets ?? [])];
    const set = { ...sets[setIndex] };

    const nextCompleted = set.completed ? 0 : 1;
    set.completed = nextCompleted;

    // Apply smart default if marking done and weight/reps are empty
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

      // Start rest timer
      const restTime = getExerciseRestTime(ex, exerciseIndex);
      if (restTime > 0) {
        setRestSecondsLeft(restTime);
        setRestTotalSeconds(restTime);
        setRestExerciseName(ex.exerciseName);
        setRestActive(true);
        setActiveRestExerciseIdx(exerciseIndex);
        setActiveRestSetIdx(setIndex);
      }

      // Trigger checkbox pop animation
      setLastCompletedSet({ exIdx: exerciseIndex, setIdx: setIndex });
      setTimeout(() => setLastCompletedSet(null), 800);
    } else {
      // If uncompleting a set that is currently the active rest timer, cancel the timer
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

  // Add a new exercise to the bottom of the session
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
    await saveExercises(exercises);
  }

  // Remove exercise from the session
  async function removeExercise(sessionExerciseId: number) {
    if (!session) return;
    const exercises = session.exercises.filter((e: any) => e.sessionExerciseId !== sessionExerciseId);
    const reindexed = exercises.map((ex: any, i: number) => ({ ...ex, sortOrder: i }));
    await saveExercises(reindexed);
  }

  // Replace exercise name while keeping sets
  async function replaceExercise(sessionExerciseId: number, newName: string, categoryOverride?: string, equipmentOverride?: string) {
    if (!session || !newName.trim()) return;
    const exercises = session.exercises.map((e: any) => {
      if (e.sessionExerciseId === sessionExerciseId) {
        const cat = categoryOverride || e.category || "resistance";
        const eq = equipmentOverride || (cat === "resistance" ? "dumbbell" : "none");
        return { 
          ...e, 
          exerciseName: newName.trim(), 
          category: cat, 
          equipment: eq 
        };
      }
      return e;
    });
    setReplacingExerciseId(null);
    setReplaceName("");
    await saveExercises(exercises);
  }

  // Move exercise up directly in the workout session and save
  async function moveExerciseUpDirect(index: number) {
    if (index <= 0 || !session?.exercises) return;
    const items = [...session.exercises];
    const temp = items[index];
    items[index] = items[index - 1];
    items[index - 1] = temp;
    const reindexed = items.map((ex, idx) => ({ ...ex, sortOrder: idx }));

    const id1 = temp.sessionExerciseId;
    const id2 = items[index].sessionExerciseId;

    if (!id1 || !id2) {
      setSession({ ...session, exercises: reindexed });
      await saveExercises(reindexed);
      return;
    }

    const card1 = document.querySelector(`[data-ex-id="${id1}"]`) as HTMLElement;
    const card2 = document.querySelector(`[data-ex-id="${id2}"]`) as HTMLElement;
    const rect1 = card1?.getBoundingClientRect();
    const rect2 = card2?.getBoundingClientRect();

    flushSync(() => {
      setSession((prev: any) => ({ ...prev, exercises: reindexed }));
    });

    const newCard1 = document.querySelector(`[data-ex-id="${id1}"]`) as HTMLElement;
    const newCard2 = document.querySelector(`[data-ex-id="${id2}"]`) as HTMLElement;
    const newRect1 = newCard1?.getBoundingClientRect();
    const newRect2 = newCard2?.getBoundingClientRect();

    if (card1 && card2 && rect1 && rect2 && newRect1 && newRect2) {
      const delta1 = rect1.top - newRect1.top;
      const delta2 = rect2.top - newRect2.top;

      newCard1.animate(
        [
          { transform: `translateY(${delta1}px)` },
          { transform: "translateY(0)" }
        ],
        {
          duration: 250,
          easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        }
      );

      newCard2.animate(
        [
          { transform: `translateY(${delta2}px)` },
          { transform: "translateY(0)" }
        ],
        {
          duration: 250,
          easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        }
      );
    }

    await saveExercises(reindexed);
  }

  // Move exercise down directly in the workout session and save
  async function moveExerciseDownDirect(index: number) {
    if (!session?.exercises || index >= session.exercises.length - 1) return;
    const items = [...session.exercises];
    const temp = items[index];
    items[index] = items[index + 1];
    items[index + 1] = temp;
    const reindexed = items.map((ex, idx) => ({ ...ex, sortOrder: idx }));

    const id1 = temp.sessionExerciseId;
    const id2 = items[index].sessionExerciseId;

    if (!id1 || !id2) {
      setSession({ ...session, exercises: reindexed });
      await saveExercises(reindexed);
      return;
    }

    const card1 = document.querySelector(`[data-ex-id="${id1}"]`) as HTMLElement;
    const card2 = document.querySelector(`[data-ex-id="${id2}"]`) as HTMLElement;
    const rect1 = card1?.getBoundingClientRect();
    const rect2 = card2?.getBoundingClientRect();

    flushSync(() => {
      setSession((prev: any) => ({ ...prev, exercises: reindexed }));
    });

    const newCard1 = document.querySelector(`[data-ex-id="${id1}"]`) as HTMLElement;
    const newCard2 = document.querySelector(`[data-ex-id="${id2}"]`) as HTMLElement;
    const newRect1 = newCard1?.getBoundingClientRect();
    const newRect2 = newCard2?.getBoundingClientRect();

    if (card1 && card2 && rect1 && rect2 && newRect1 && newRect2) {
      const delta1 = rect1.top - newRect1.top;
      const delta2 = rect2.top - newRect2.top;

      newCard1.animate(
        [
          { transform: `translateY(${delta1}px)` },
          { transform: "translateY(0)" }
        ],
        {
          duration: 250,
          easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        }
      );

      newCard2.animate(
        [
          { transform: `translateY(${delta2}px)` },
          { transform: "translateY(0)" }
        ],
        {
          duration: 250,
          easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        }
      );
    }

    await saveExercises(reindexed);
  }

  // Discard workout session completely
  async function discardWorkout() {
    if (!session) return;
    if (!confirm(t("Are you sure you want to discard this workout session?"))) return;
    try {
      bypassWarningRef.current = true;
      await api.workouts.sessions.delete(session.sessionId);
      const key = `sbase_timer_${session.sessionId}`;
      localStorage.removeItem(key);
      router.push("/workouts");
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  }

  // Pre-calculate summary details (volume, PRs) and enter Summary State
  async function enterSummaryView() {
    setShowFinishedWarning(false);
    setIsSummaryView(true);

    // Populate duration inputs
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    setSummaryHours(String(h));
    setSummaryMinutes(String(m));
    setSummarySeconds(String(s));

    // Calculate Personal Records (PRs)
    const prsList: any[] = [];
    if (session.exercises) {
      for (const ex of session.exercises) {
        const completedSets = ex.sets?.filter((s: SetRow) => s.completed === 1) ?? [];
        if (completedSets.length === 0) continue;

        if (ex.category === "cardio") {
          const maxCurrentDist = Math.max(...completedSets.map((s: SetRow) => s.distance ?? 0));
          if (maxCurrentDist <= 0) continue;

          const prevHistory = previousSetsMap[ex.exerciseName] ?? [];
          const maxPrevDist = prevHistory.reduce((max: number, s: any) => Math.max(max, s.distance ?? 0), 0);

          if (maxPrevDist > 0 && maxCurrentDist > maxPrevDist) {
            prsList.push({
              exerciseName: ex.exerciseName,
              prevWeight: maxPrevDist,
              newWeight: maxCurrentDist,
              isDistance: true,
            });
          }
        } else {
          const maxCurrentWeight = Math.max(...completedSets.map((s: SetRow) => s.weight ?? 0));
          if (maxCurrentWeight <= 0) continue;

          const prevHistory = previousSetsMap[ex.exerciseName] ?? [];
          const maxPrevWeight = prevHistory.reduce((max: number, s: any) => Math.max(max, s.weight ?? 0), 0);

          if (maxPrevWeight > 0 && maxCurrentWeight > maxPrevWeight) {
            prsList.push({
              exerciseName: ex.exerciseName,
              prevWeight: maxPrevWeight,
              newWeight: maxCurrentWeight,
              isDistance: false,
            });
          }
        }
      }
    }
    setPersonalRecords(prsList);
  }

  // Finish button click handler
  function handleFinishClick() {
    // Check for unfinished sets
    let hasUnfinished = false;
    if (session?.exercises) {
      for (const ex of session.exercises) {
        if (ex.sets?.some((s: SetRow) => s.completed === 0)) {
          hasUnfinished = true;
          break;
        }
      }
    }

    if (hasUnfinished) {
      setShowFinishedWarning(true);
    } else {
      enterSummaryView();
    }
  }

  // Commit session save to history
  async function saveWorkoutSummary() {
    setSaving(true);
    try {
      bypassWarningRef.current = true;
      // Calculate adjusted completedAt
      const hours = Number(summaryHours) || 0;
      const minutes = Number(summaryMinutes) || 0;
      const seconds = Number(summarySeconds) || 0;
      const totalSeconds = hours * 3600 + minutes * 60 + seconds;

      const startedTime = parseUtcDate(session.startedAt).getTime();
      const adjustedCompletedTime = new Date(startedTime + totalSeconds * 1000);
      const completedAtISO = adjustedCompletedTime.toISOString();

      // 1. Save notes and title name
      await api.workouts.sessions.update(session.sessionId, {
        name: sessionName.trim() || undefined,
        notes: summaryNotes || undefined,
      });

      // 2. Complete the session
      await api.workouts.sessions.complete(session.sessionId, completedAtISO);

      // 3. Clear timer localStorage
      const key = `sbase_timer_${session.sessionId}`;
      localStorage.removeItem(key);

      router.push(`/workouts/history/${session.sessionId}`);
      router.refresh();
    } catch (err) {
      console.error("Failed to complete workout", err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin size-8 rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  if (!session) return null;

  const exercises = session.exercises ?? [];
  const allExercisesCompleted = exercises.length > 0 && exercises.every((ex: any) =>
    ex.sets?.length > 0 && ex.sets.every((s: any) => s.completed === 1)
  );

  // Calculate volume of completed sets
  function calculateTotalVolume() {
    let vol = 0;
    if (session.exercises) {
      for (const ex of session.exercises) {
        const completedSets = ex.sets?.filter((s: SetRow) => s.completed === 1) ?? [];
        vol += completedSets.reduce((sum: number, s: SetRow) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);
      }
    }
    return vol;
  }

  // Render Post-Workout Summary State
  if (isSummaryView) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-2 flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-foreground mb-1">
            {t("Workout Review & Edits")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("Review your session performance before saving to history.")}
          </p>
        </div>

        {/* Workout name and Notes */}
        <div className="bg-card ring-1 ring-foreground/10 rounded-xl p-4 sm:p-5 flex flex-col gap-4">
          <div className="grid gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("Workout title")}
            </label>
            <Input
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="bg-white/5 border-border text-base h-10"
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("Notes")}
            </label>
            <Textarea
              value={summaryNotes}
              onChange={(e) => setSummaryNotes(e.target.value)}
              placeholder={t("Write session feedback, how you felt, details...")}
              className="bg-white/5 border-border min-h-[90px] text-sm"
            />
          </div>
        </div>

        {/* Duration Editor */}
        <div className="bg-card ring-1 ring-foreground/10 rounded-xl p-4 sm:p-5">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t("Duration Editor")}
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block uppercase">{t("Hours")}</label>
              <Input
                type="number"
                value={summaryHours}
                onChange={(e) => setSummaryHours(e.target.value)}
                className="bg-white/5 border-border text-center text-lg h-10"
                min="0"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block uppercase">{t("Minutes")}</label>
              <Input
                type="number"
                value={summaryMinutes}
                onChange={(e) => setSummaryMinutes(e.target.value)}
                className="bg-white/5 border-border text-center text-lg h-10"
                min="0"
                max="59"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block uppercase">{t("Seconds")}</label>
              <Input
                type="number"
                value={summarySeconds}
                onChange={(e) => setSummarySeconds(e.target.value)}
                className="bg-white/5 border-border text-center text-lg h-10"
                min="0"
                max="59"
              />
            </div>
          </div>
        </div>

        {/* Performance Summary Details */}
        <div className="bg-card ring-1 ring-foreground/10 rounded-xl p-4 sm:p-5 flex flex-col gap-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t("Performance Summary")}
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
              <div className="text-2xl font-bold text-brand">{calculateTotalVolume()} kg</div>
              <div className="text-xs text-muted-foreground mt-1">{t("Total volume lifted")}</div>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center flex flex-col justify-center items-center">
              <div className="text-2xl font-bold text-amber-400">{personalRecords.length}</div>
              <div className="text-xs text-muted-foreground mt-1">{t("PRs (Personal Records)")}</div>
            </div>
          </div>

          {/* PR badges */}
          {personalRecords.length > 0 && (
            <div className="mt-2 flex flex-col gap-2">
              <h3 className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
                <Sparkles className="size-3.5" />
                {t("New PRs Set!")}
              </h3>
              <div className="flex flex-col gap-1.5">
                {personalRecords.map((pr, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center px-3 py-2 rounded-lg bg-amber-400/10 border border-amber-400/20 text-xs sm:text-sm text-amber-200"
                  >
                    <span className="font-medium">{pr.exerciseName}</span>
                    <span className="font-semibold text-amber-400">
                      🏆 {pr.newWeight} {pr.isDistance ? "km" : "kg"} (Beat {pr.prevWeight} {pr.isDistance ? "km" : "kg"}!)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5 mt-2">
          <Button
            onClick={saveWorkoutSummary}
            disabled={saving}
            className="w-full bg-brand hover:bg-brand-hover text-zinc-900 h-12 text-base font-semibold active:scale-[0.98] transition-all"
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin size-4 border-2 border-zinc-900 border-t-transparent rounded-full" />
                {t("Saving...")}
              </div>
            ) : (
              t("Save")
            )}
          </Button>

          <Button
            onClick={() => setIsSummaryView(false)}
            variant="outline"
            className="w-full h-11 text-zinc-400 border-border hover:text-foreground"
          >
            {t("Return to workout")}
          </Button>

          <Button
            onClick={discardWorkout}
            variant="ghost"
            className="w-full text-xs text-red-500 hover:text-red-400 hover:bg-red-950/20"
          >
            {t("Discard Workout")}
          </Button>
        </div>
      </div>
    );
  }

  // Render Active Workout View
  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Global Header (Sticky) */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-md z-20 pb-4 pt-1 border-b border-border/40 mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Editable Title */}
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
                <h1
                  onClick={() => setIsEditingName(true)}
                  className="font-display text-xl sm:text-2xl text-foreground truncate cursor-pointer hover:text-brand transition-colors"
                >
                  {sessionName}
                </h1>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Edit2 className="size-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Active Timer and Finish Button */}
          <div className="flex items-center gap-3 justify-between sm:justify-end shrink-0">
            {/* Timer card */}
            <div className="flex items-center gap-2 bg-card border border-border px-3 py-1.5 rounded-lg">
              <Timer className="size-4 text-brand" />
              <span className="font-mono text-base tabular-nums font-semibold text-zinc-200">
                {formatTime(elapsed)}
              </span>
              <button
                onClick={togglePause}
                className="ml-1 p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
              >
                {isPaused ? <Play className="size-3.5 text-brand" /> : <Pause className="size-3.5" />}
              </button>
            </div>

            {/* Finish Button */}
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

      {/* Exercises Scrollable List */}
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
                onSelect={(v, sets, reps, category, equipment) => {
                  addExercise(v, category, sets ?? undefined, reps ?? undefined, equipment);
                }}
                placeholder={t("Exercise") + "..."}
                className="border-border text-sm"
              />
              <Button
                onClick={() => addExercise()}
                className="bg-brand text-zinc-900 h-9 w-9 sm:h-8 sm:w-8 p-0 shrink-0 flex items-center justify-center rounded-lg cursor-pointer"
              >
                <Plus className="size-4" />
              </Button>
            </div>
          ) : (
            <Button onClick={() => setShowAddExercise(true)} variant="outline" size="sm">
              <Plus className="size-4 mr-1" />
              {t("Add exercise")}
            </Button>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-6 pb-20 max-[375px]:-mx-4">
          {exercises.map((ex: any, exIdx: number) => {
            const allSetsDone = ex.sets?.length > 0 && ex.sets.every((s: any) => s.completed === 1);
            return (
              <div
                key={ex.sessionExerciseId ?? exIdx}
                data-ex-id={ex.sessionExerciseId}
                className={`rounded-xl bg-card/60 border p-4 sm:p-5 relative transition-all duration-300 max-[375px]:border-0 max-[375px]:rounded-none max-[375px]:bg-transparent ${
                  allSetsDone
                    ? "border-brand shadow-[0_0_15px_rgba(0,227,164,0.15)] ring-1 ring-brand/35"
                    : "border-border"
                }`}
              >
                {/* Exercise Card Header */}
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    {replacingExerciseId === ex.sessionExerciseId ? (
                      <div className="flex gap-2 items-center w-full">
                        <div className="flex-1">
                          <ExerciseAutocomplete
                            value={replaceName}
                            onChange={setReplaceName}
                            onSelect={(v, sets, reps, category, equipment) => {
                              replaceExercise(ex.sessionExerciseId!, v, category, equipment);
                            }}
                            placeholder={t("Search exercise") + "..."}
                            className="w-full h-8 text-sm"
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setReplacingExerciseId(null);
                            setReplaceName("");
                          }}
                          className="h-8 text-xs text-muted-foreground hover:bg-white/5"
                        >
                          {t("Cancel")}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <h3 className="font-semibold text-foreground text-base sm:text-lg truncate flex items-center gap-2">
                          <span>{exIdx + 1}. {ex.exerciseName}</span>
                          {allSetsDone && (
                            <span className="inline-flex items-center justify-center size-5 rounded-full bg-brand/20 text-brand animate-scale-in shrink-0">
                              <Check className="size-3 stroke-[3px]" />
                            </span>
                          )}
                        </h3>
                        <select
                          value={ex.category ?? "resistance"}
                          onChange={async (e) => {
                            const updatedExs = [...session.exercises];
                            updatedExs[exIdx] = { ...updatedExs[exIdx], category: e.target.value };
                            setSession({ ...session, exercises: updatedExs });
                            await saveExercises(updatedExs);
                          }}
                          className="bg-transparent text-xs text-muted-foreground border-0 hover:text-foreground cursor-pointer focus:outline-none w-fit"
                        >
                          <option value="resistance" className="bg-zinc-900">{t("Resistance")}</option>
                          <option value="bodyweight" className="bg-zinc-900">{t("Bodyweight")}</option>
                          <option value="cardio" className="bg-zinc-900">{t("Cardio")}</option>
                          <option value="isometric" className="bg-zinc-900">{t("Isometric")}</option>
                        </select>
                      </div>
                    )}
                  </div>

                {/* Reordering Controls and Kebab Menu */}
                <div className="flex items-center gap-1 shrink-0">
                  {exercises.length > 1 && (
                    <div className="flex items-center gap-0.5 mr-0.5">
                      <button
                        type="button"
                        disabled={exIdx === 0 || saving}
                        onClick={() => moveExerciseUpDirect(exIdx)}
                        className="p-1 rounded-md text-muted-foreground hover:text-brand hover:bg-white/5 disabled:opacity-20 disabled:hover:text-muted-foreground disabled:hover:bg-transparent transition-colors cursor-pointer"
                        title={t("Move Up")}
                      >
                        <ChevronUp className="size-5" />
                      </button>
                      <button
                        type="button"
                        disabled={exIdx === exercises.length - 1 || saving}
                        onClick={() => moveExerciseDownDirect(exIdx)}
                        className="p-1 rounded-md text-muted-foreground hover:text-brand hover:bg-white/5 disabled:opacity-20 disabled:hover:text-muted-foreground disabled:hover:bg-transparent transition-colors cursor-pointer"
                        title={t("Move Down")}
                      >
                        <ChevronDown className="size-5" />
                      </button>
                    </div>
                  )}

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveEquipmentMenuExerciseId(
                          activeEquipmentMenuExerciseId === ex.sessionExerciseId ? null : ex.sessionExerciseId
                        )
                      }
                      className="p-1 rounded-md text-muted-foreground hover:text-brand hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-center"
                      title={t("Equipment")}
                    >
                      <EquipmentIcon type={ex.equipment ?? "none"} className="size-5" />
                    </button>

                    {activeEquipmentMenuExerciseId === ex.sessionExerciseId && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setActiveEquipmentMenuExerciseId(null)}
                        />
                        <div className="absolute right-0 mt-1 w-44 rounded-lg bg-zinc-900 border border-zinc-800 shadow-xl z-20 py-1 text-sm">
                          {[
                            { value: "none", label: t("none") },
                            { value: "barbell", label: t("barbell") },
                            { value: "dumbbell", label: t("dumbbell") },
                            { value: "kettlebell", label: t("kettlebell") },
                            { value: "cable", label: t("cable") },
                            { value: "machine", label: t("machine") },
                            { value: "band", label: t("band") },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              onClick={async () => {
                                const updatedExs = [...session.exercises];
                                updatedExs[exIdx] = {
                                  ...ex,
                                  equipment: opt.value,
                                };
                                setSession({ ...session, exercises: updatedExs });
                                setActiveEquipmentMenuExerciseId(null);
                                await saveExercises(updatedExs);
                              }}
                              className={`flex w-full items-center px-3 py-2 text-left transition-colors hover:bg-zinc-800 ${
                                (ex.equipment ?? "none") === opt.value
                                  ? "text-brand font-medium"
                                  : "text-zinc-300"
                              }`}
                            >
                              <span className="mr-2.5 shrink-0 text-brand">
                                <EquipmentIcon type={opt.value} className="size-4" />
                              </span>
                              <span className="truncate">{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      onClick={() =>
                        setActiveMenuExerciseId(
                          activeMenuExerciseId === ex.sessionExerciseId ? null : ex.sessionExerciseId
                        )
                      }
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5"
                    >
                      <MoreVertical className="size-5" />
                    </button>

                    {/* Dropdown Options */}
                    {activeMenuExerciseId === ex.sessionExerciseId && (
                      <>
                        {/* Backdrop to close click */}
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setActiveMenuExerciseId(null)}
                        />
                        <div className="absolute right-0 mt-1 w-48 rounded-lg bg-zinc-900 border border-zinc-800 shadow-xl z-20 py-1 text-sm">
                          <button
                            onClick={() => {
                              setReplacingExerciseId(ex.sessionExerciseId!);
                              setReplaceName("");
                              setActiveMenuExerciseId(null);
                            }}
                            className="flex w-full items-center px-4 py-2 text-zinc-300 hover:bg-zinc-800 text-left"
                          >
                            <Edit2 className="size-4 mr-2 text-zinc-500" />
                            {t("Replace Exercise")}
                          </button>
                          <button
                            onClick={() => {
                              setHistoryExerciseName(ex.exerciseName);
                              setActiveMenuExerciseId(null);
                            }}
                            className="flex w-full items-center px-4 py-2 text-zinc-300 hover:bg-zinc-800 text-left"
                          >
                            <History className="size-4 mr-2 text-zinc-500" />
                            {t("View History")}
                          </button>
                          <hr className="border-zinc-800 my-1" />
                          <button
                            onClick={() => {
                              if (confirm(t("Remove this exercise?"))) {
                                removeExercise(ex.sessionExerciseId!);
                              }
                              setActiveMenuExerciseId(null);
                            }}
                            className="flex w-full items-center px-4 py-2 text-red-400 hover:bg-zinc-800 text-left"
                          >
                            <Trash2 className="size-4 mr-2" />
                            {t("Remove")}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Sets Table */}
              {ex.sets?.length > 0 && (
                <div className="overflow-x-auto -mx-4 sm:mx-0 mb-4 max-[375px]:bg-card/60">
                  <table className="w-full text-xs sm:text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border/40 text-muted-foreground">
                        <th className="text-left py-2 px-2 font-normal w-8">{t("Set")}</th>
                        <th className="text-left py-2 px-3 font-normal">{t("Target")}</th>
                        {(ex.category === "resistance" || !ex.category) && (
                          <>
                            <th className="text-center py-2 px-3 font-normal w-28">kg</th>
                            <th className="text-center py-2 px-3 font-normal w-14">{t("Reps")}</th>
                            <th className="text-center py-2 px-3 font-normal w-14">{t("RPE")}</th>
                          </>
                        )}
                        {ex.category === "bodyweight" && (
                          <>
                            <th className="text-center py-2 px-3 font-normal w-28">{t("Added/Assisted (kg)")}</th>
                            <th className="text-center py-2 px-3 font-normal w-14">{t("Reps")}</th>
                          </>
                        )}
                        {ex.category === "cardio" && (
                          <>
                            <th className="text-center py-2 px-3 font-normal w-24">{t("Distance (km)")}</th>
                            <th className="text-center py-2 px-3 font-normal w-24">{t("Time (MM:SS)")}</th>
                            <th className="text-center py-2 px-3 font-normal w-24">{t("Avg HR (bpm)")}</th>
                          </>
                        )}
                        {ex.category === "isometric" && (
                          <>
                            <th className="text-center py-2 px-3 font-normal w-24">{t("Added weight (kg)")}</th>
                            <th className="text-center py-2 px-3 font-normal w-24">{t("Time (MM:SS)")}</th>
                          </>
                        )}
                        <th className="text-center py-2 px-3 font-normal w-16">{t("Done")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ex.sets.map((set: SetRow, setIdx: number) => {
                        const cat = ex.category ?? "resistance";
                        // Find previous set value for ghost text
                        const prevSets = previousSetsMap[ex.exerciseName];
                        const prevSet = prevSets?.[setIdx] ?? prevSets?.[prevSets.length - 1];
                        
                        let ghostText = "—";
                        let targetSource = null;
                        if (ex.templateExercise) {
                          targetSource = {
                            reps: ex.templateExercise.defaultReps,
                            weight: ex.templateExercise.defaultWeight,
                            distance: ex.templateExercise.defaultDistance,
                            duration: ex.templateExercise.defaultDuration,
                            rpe: ex.templateExercise.defaultRpe,
                            heartRate: ex.templateExercise.defaultHeartRate,
                          };
                        } else if (prevSet) {
                          targetSource = prevSet;
                        } else {
                          targetSource = set;
                        }
                        if (targetSource) {
                          if (cat === "resistance") {
                            const reps = targetSource.reps ?? 10;
                            const weight = targetSource.weight ?? 0;
                            ghostText = `${reps} x ${weight} KG`;
                          } else if (cat === "bodyweight") {
                            const reps = targetSource.reps ?? 10;
                            const weight = targetSource.weight;
                            if (weight != null && weight !== 0) {
                              const weightSign = weight > 0 ? "+" : "";
                              ghostText = `${weightSign}${weight} KG x ${reps}`;
                            } else {
                              ghostText = `${reps} reps`;
                            }
                          } else if (cat === "cardio") {
                            const dist = targetSource.distance ?? 0;
                            const dur = targetSource.duration ?? 0;
                            ghostText = `${dist} km x ${formatSecs(dur) || "0:00"}`;
                          } else if (cat === "isometric") {
                            const dur = targetSource.duration ?? 0;
                            const weight = targetSource.weight;
                            const durStr = `${dur} sec`;
                            
                            if (weight != null && weight !== 0) {
                              ghostText = `${weight} x ${durStr}`;
                            } else {
                              ghostText = durStr;
                            }
                          }
                        }

                        return (
                          <React.Fragment key={setIdx}>
                            <tr
                              className={`border-b border-border/20 last:border-0 transition-colors duration-150 ${
                                set.completed
                                  ? "bg-brand/5 opacity-70"
                                  : "hover:bg-white/[0.01]"
                              }`}
                            >
                              {/* Set # */}
                              <td className="py-2.5 px-3 font-medium text-zinc-400 align-middle">
                                {set.setNumber}
                              </td>
  
                              {/* Ghost/Target text */}
                              <td className="py-2.5 px-3 text-muted-foreground align-middle italic text-xs">
                                {ghostText}
                              </td>
  
                              {/* Dynamic Inputs based on Category */}
                              {(cat === "resistance") && (
                                <>
                                  <td className="py-2 px-2 align-middle">
                                    <Input
                                      type="number"
                                      min="0"
                                      step="any"
                                      inputMode="decimal"
                                      placeholder={prevSet?.weight != null ? String(prevSet.weight) : "0"}
                                      value={set.weight ?? ""}
                                      onChange={(e) => updateSet(exIdx, setIdx, "weight", e.target.value ? Math.max(0, Number(e.target.value)) : null)}
                                      className="bg-white/5 border-border/80 h-8 text-center text-sm font-semibold rounded-md focus-visible:border-brand/40"
                                    />
                                  </td>
                                  <td className="py-2 px-2 align-middle">
                                    <Input
                                      type="number"
                                      min="0"
                                      inputMode="numeric"
                                      placeholder={prevSet?.reps != null ? String(prevSet.reps) : "10"}
                                      value={set.reps ?? ""}
                                      onChange={(e) => updateSet(exIdx, setIdx, "reps", e.target.value ? Math.max(0, Number(e.target.value)) : 0)}
                                      className="bg-white/5 border-border/80 h-8 text-center text-sm font-semibold rounded-md focus-visible:border-brand/40"
                                    />
                                  </td>
                                  <td className="py-2 px-2 align-middle">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setRpePickerPos(
                                          rpePickerPos?.exIdx === exIdx && rpePickerPos?.setIdx === setIdx
                                            ? null
                                            : { exIdx, setIdx, top: rect.top, left: rect.left, width: rect.width }
                                        );
                                      }}
                                      className={`h-8 w-full rounded-md text-center text-sm font-semibold transition-all border ${
                                        set.rpe != null
                                          ? `${rpeColors[set.rpe as number]} text-white border-transparent`
                                          : "bg-white/5 border-border/80 text-muted-foreground hover:border-brand/40"
                                      }`}
                                    >
                                      {set.rpe ?? "—"}
                                    </button>

                                    {rpePickerPos?.exIdx === exIdx && rpePickerPos?.setIdx === setIdx && (
                                      <>
                                        <div className="fixed inset-0 z-40" onClick={() => setRpePickerPos(null)} />
                                        <div
                                          className="fixed z-50 flex gap-0.5 rounded-lg bg-zinc-900 border border-zinc-700 p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
                                          style={{
                                            top: rpePickerPos.top - 50,
                                            left: rpePickerPos.left + rpePickerPos.width / 2 - 110,
                                          }}
                                        >
                                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                                            <button
                                              key={val}
                                              type="button"
                                              onClick={() => {
                                                updateSet(exIdx, setIdx, "rpe", val);
                                                setRpePickerPos(null);
                                              }}
                                              className={`h-8 w-8 rounded-md text-xs font-bold text-white transition-all duration-100 active:scale-90 ${
                                                rpeColors[val]
                                              } ${set.rpe === val ? "ring-2 ring-white scale-110" : "hover:scale-110 hover:brightness-110"}`}
                                            >
                                              {val}
                                            </button>
                                          ))}
                                        </div>
                                      </>
                                    )}
                                  </td>
                                </>
                              )}
  
                              {cat === "bodyweight" && (
                                <>
                                  <td className="py-2 px-2 align-middle">
                                    <Input
                                      type="number"
                                      min="0"
                                      step="any"
                                      placeholder={prevSet?.weight != null ? String(prevSet.weight) : "0"}
                                      value={set.weight ?? ""}
                                      onChange={(e) => updateSet(exIdx, setIdx, "weight", e.target.value ? Math.max(0, Number(e.target.value)) : null)}
                                      className="bg-white/5 border-border/80 h-8 text-center text-sm font-semibold rounded-md focus-visible:border-brand/40"
                                    />
                                  </td>
                                  <td className="py-2 px-2 align-middle">
                                    <Input
                                      type="number"
                                      min="0"
                                      inputMode="numeric"
                                      placeholder={prevSet?.reps != null ? String(prevSet.reps) : "10"}
                                      value={set.reps ?? ""}
                                      onChange={(e) => updateSet(exIdx, setIdx, "reps", e.target.value ? Math.max(0, Number(e.target.value)) : 0)}
                                      className="bg-white/5 border-border/80 h-8 text-center text-sm font-semibold rounded-md focus-visible:border-brand/40"
                                    />
                                  </td>
                                </>
                              )}
  
                              {cat === "cardio" && (
                                <>
                                  <td className="py-2 px-2 align-middle">
                                    <Input
                                      type="number"
                                      min="0"
                                      step="any"
                                      placeholder={prevSet?.distance != null ? String(prevSet.distance) : "0.0"}
                                      value={set.distance ?? ""}
                                      onChange={(e) => updateSet(exIdx, setIdx, "distance", e.target.value ? Math.max(0, Number(e.target.value)) : null)}
                                      className="bg-white/5 border-border/80 h-8 text-center text-sm font-semibold rounded-md focus-visible:border-brand/40"
                                    />
                                  </td>
                                  <td className="py-2 px-2 align-middle">
                                    <Input
                                      type="text"
                                      placeholder={prevSet?.duration != null ? formatSecs(prevSet.duration) : "MM:SS"}
                                      value={set.duration != null ? formatSecs(set.duration) : ""}
                                      onChange={(e) => updateSet(exIdx, setIdx, "duration", parseSecs(e.target.value))}
                                      className="bg-white/5 border-border/80 h-8 text-center text-sm font-semibold rounded-md focus-visible:border-brand/40"
                                    />
                                  </td>
                                  <td className="py-2 px-2 align-middle">
                                    <Input
                                      type="number"
                                      min="0"
                                      placeholder={prevSet?.heartRate != null ? String(prevSet.heartRate) : "140"}
                                      value={set.heartRate ?? ""}
                                      onChange={(e) => updateSet(exIdx, setIdx, "heartRate", e.target.value ? Math.max(0, Number(e.target.value)) : null)}
                                      className="bg-white/5 border-border/80 h-8 text-center text-sm font-semibold rounded-md focus-visible:border-brand/40"
                                    />
                                  </td>
                                </>
                              )}
  
                              {cat === "isometric" && (
                                <>
                                  <td className="py-2 px-2 align-middle">
                                    <Input
                                      type="number"
                                      min="0"
                                      step="any"
                                      placeholder={prevSet?.weight != null ? String(prevSet.weight) : "0"}
                                      value={set.weight ?? ""}
                                      onChange={(e) => updateSet(exIdx, setIdx, "weight", e.target.value ? Math.max(0, Number(e.target.value)) : null)}
                                      className="bg-white/5 border-border/80 h-8 text-center text-sm font-semibold rounded-md focus-visible:border-brand/40"
                                    />
                                  </td>
                                  <td className="py-2 px-2 align-middle">
                                    <Input
                                      type="text"
                                      placeholder={prevSet?.duration != null ? formatSecs(prevSet.duration) : "MM:SS"}
                                      value={set.duration != null ? formatSecs(set.duration) : ""}
                                      onChange={(e) => updateSet(exIdx, setIdx, "duration", parseSecs(e.target.value))}
                                      className="bg-white/5 border-border/80 h-8 text-center text-sm font-semibold rounded-md focus-visible:border-brand/40"
                                    />
                                  </td>
                                </>
                              )}
  
                              {/* Done / Trash */}
                              <td className="py-2 px-2 text-center align-middle">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => toggleSetCompleted(exIdx, setIdx)}
                                    aria-label={t("Mark set as completed")}
                                    className={`size-7 sm:size-8 rounded-md flex items-center justify-center transition-all duration-75 active:scale-[0.9] border group/checkbtn relative ${
                                      set.completed
                                        ? "bg-brand border-brand text-zinc-900"
                                        : "bg-white/5 border-border text-zinc-500 hover:border-brand/40 hover:bg-brand/10 hover:text-brand"
                                    }`}
                                  >
                                    {set.completed ? (
                                      <>
                                        <Check className="size-4 stroke-[3px] animate-scale-in" />
                                        {lastCompletedSet?.exIdx === exIdx && lastCompletedSet?.setIdx === setIdx && (
                                          <>
                                            <span className="absolute size-1.5 rounded-full bg-brand animate-particle-1 pointer-events-none" />
                                            <span className="absolute size-1.5 rounded-full bg-brand animate-particle-2 pointer-events-none" />
                                            <span className="absolute size-1.5 rounded-full bg-brand animate-particle-3 pointer-events-none" />
                                            <span className="absolute size-1.5 rounded-full bg-brand animate-particle-4 pointer-events-none" />
                                          </>
                                        )}
                                      </>
                                    ) : (
                                      <Check className="size-4 opacity-25 group-hover/checkbtn:opacity-100 transition-opacity text-zinc-500 group-hover/checkbtn:text-brand" />
                                    )}
                                  </button>
                                  {ex.sets.length > 1 && set.completed !== 1 && (
                                    <button
                                      onClick={() => removeSet(exIdx, setIdx)}
                                      className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-950/20 transition-colors"
                                    >
                                      <Trash className="size-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                            {setIdx < ex.sets.length - 1 && (() => {
                              const isSetAboveCompleted = set.completed === 1;
                              const isCurrentRestTimer = activeRestExerciseIdx === exIdx && activeRestSetIdx === setIdx;
                              const hasActiveTimer = isCurrentRestTimer && restSecondsLeft > 0;
                              const isDone = isSetAboveCompleted && !hasActiveTimer;
                              const colSpanVal = (cat === "resistance" || cat === "cardio") ? 6 : 5;

                              return (
                                <tr className={`transition-all duration-300 ${
                                  isDone 
                                    ? "h-0 border-none bg-transparent overflow-hidden" 
                                    : `border-b border-border/10 ${isSetAboveCompleted ? "bg-zinc-950/50" : "bg-zinc-950/25"}`
                                }`}>
                                  <td colSpan={colSpanVal} className="p-0 transition-all duration-300 relative overflow-hidden">
                                    {/* Progress Background */}
                                    {hasActiveTimer && (
                                      <div 
                                        className="absolute inset-0 bg-brand/10 transition-all duration-1000 ease-linear pointer-events-none border-none border-0"
                                        style={{ width: `${(restSecondsLeft / restTotalSeconds) * 100}%` }}
                                      />
                                    )}

                                    <div 
                                      className={`transition-all duration-300 ease-in-out overflow-hidden relative w-full border-none border-0 ${
                                        isDone 
                                          ? "max-h-0 opacity-0 py-0 px-3 pointer-events-none" 
                                          : isSetAboveCompleted 
                                            ? "max-h-20 opacity-100 py-3 sm:py-3.5 px-3 min-h-[56px]" 
                                            : "max-h-12 opacity-100 py-1 px-3"
                                      }`}
                                    >
                                      <div className="relative z-10 flex items-center justify-between text-xs text-zinc-400 w-full">
                                        {isSetAboveCompleted ? (
                                          <>
                                            {/* Higher row: Active Timer or Start Timer Controls */}
                                            <div className="flex items-center gap-2">
                                              <Timer className={`size-4 ${hasActiveTimer && restActive ? "text-brand animate-pulse" : "text-zinc-500"}`} />
                                              {hasActiveTimer ? (
                                                <div className="flex flex-wrap items-center gap-3">
                                                  <span className="font-mono text-base font-bold text-brand tabular-nums">
                                                    {formatTime(restSecondsLeft)}
                                                  </span>
                                                  {/* Adjust buttons */}
                                                  <div className="flex items-center gap-1.5">
                                                    <button
                                                      onClick={() => {
                                                        setRestSecondsLeft((prev) => prev + 30);
                                                        setRestTotalSeconds((prev) => prev + 30);
                                                      }}
                                                      className="px-2.5 h-7 rounded border border-border/40 bg-zinc-900/80 text-xs text-zinc-300 hover:text-foreground hover:bg-zinc-800 transition-colors cursor-pointer flex items-center justify-center"
                                                    >
                                                      +30s
                                                    </button>
                                                    <button
                                                      onClick={() => {
                                                        setRestSecondsLeft((prev) => Math.max(0, prev - 30));
                                                      }}
                                                      className="px-2.5 h-7 rounded border border-border/40 bg-zinc-900/80 text-xs text-zinc-300 hover:text-foreground hover:bg-zinc-800 transition-colors cursor-pointer flex items-center justify-center"
                                                    >
                                                      -30s
                                                    </button>
                                                    <button
                                                      onClick={() => {
                                                        setRestActive(false);
                                                        setRestSecondsLeft(0);
                                                        setActiveRestExerciseIdx(null);
                                                        setActiveRestSetIdx(null);
                                                      }}
                                                      className="px-2.5 h-7 rounded border border-brand/30 bg-brand/10 text-xs text-brand hover:bg-brand/20 transition-colors cursor-pointer flex items-center justify-center"
                                                    >
                                                      {t("Skip")}
                                                    </button>
                                                  </div>
                                                </div>
                                              ) : (
                                                <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
                                                  <span>{t("Rest Time")}:</span>
                                                  <input
                                                    type="number"
                                                    min="0"
                                                    className="w-10 h-7 bg-zinc-900 border border-zinc-800 rounded px-1.5 text-center text-xs text-zinc-300 font-semibold focus:outline-none focus:border-brand/40"
                                                    value={getExerciseRestTime(ex, exIdx)}
                                                    onChange={(e) => updateExerciseRestTime(exIdx, Math.max(0, Number(e.target.value)))}
                                                  />
                                                  <span>s</span>
                                                </div>
                                              )}
                                            </div>

                                            {/* Pause/Play on the right */}
                                            <div>
                                              {hasActiveTimer && restActive ? (
                                                <button
                                                  onClick={() => setRestActive(false)}
                                                  className="h-8 w-8 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-200 transition-colors flex items-center justify-center cursor-pointer"
                                                  title={t("Pause")}
                                                >
                                                  <Pause className="size-4" />
                                                </button>
                                              ) : (
                                                <button
                                                  onClick={() => {
                                                    const restTime = getExerciseRestTime(ex, exIdx);
                                                    if (restTime > 0) {
                                                      setRestSecondsLeft(hasActiveTimer ? restSecondsLeft : restTime);
                                                      if (!hasActiveTimer) {
                                                        setRestTotalSeconds(restTime);
                                                        setRestExerciseName(ex.exerciseName);
                                                      }
                                                      setRestActive(true);
                                                      setActiveRestExerciseIdx(exIdx);
                                                      setActiveRestSetIdx(setIdx);
                                                    }
                                                  }}
                                                  className="h-8 w-8 rounded-lg bg-brand/20 border border-brand/40 hover:bg-brand/35 text-brand transition-colors flex items-center justify-center cursor-pointer"
                                                  title={t("Play")}
                                                >
                                                  <Play className="size-4" />
                                                </button>
                                              )}
                                            </div>
                                          </>
                                        ) : (
                                          /* Normal thin row style when set above is not completed */
                                          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 w-full py-0.5">
                                            <Timer className="size-3 text-zinc-500" />
                                            <span>{t("Rest Time")}:</span>
                                            <input
                                              type="number"
                                              min="0"
                                              className="w-12 bg-zinc-900 border border-zinc-800 rounded px-1 py-0.5 text-center text-[11px] text-zinc-300 font-semibold focus:outline-none focus:border-brand/40"
                                              value={getExerciseRestTime(ex, exIdx)}
                                              onChange={(e) => updateExerciseRestTime(exIdx, Math.max(0, Number(e.target.value)))}
                                            />
                                            <span>s</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })()}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Add set button inside Card */}
              <Button
                onClick={() => addSet(exIdx)}
                variant="outline"
                size="sm"
                className="w-full text-xs border-dashed border-border hover:bg-white/5 h-8 font-medium text-zinc-400"
              >
                <Plus className="size-3.5 mr-1" />
                {t("Add set")}
              </Button>
            </div>
          );
        })}

          {/* Floating Action / Global Footer for Add Exercise */}
          <div className="flex flex-col items-center gap-3 pt-4 border-t border-border/20">
            {showAddExercise ? (
              <div className="flex gap-2 w-full max-w-md bg-card/90 ring-1 ring-border p-3 rounded-xl">
                <div className="flex-1">
                  <ExerciseAutocomplete
                    value={newExerciseName}
                    onChange={setNewExerciseName}
                    onSelect={(v, sets, reps, category, equipment) => {
                      addExercise(v, category, sets ?? undefined, reps ?? undefined, equipment);
                    }}
                    placeholder={t("Search exercise") + "..."}
                    className="w-full h-9 text-sm"
                  />
                </div>
                <Button
                  onClick={() => addExercise()}
                  className="bg-brand hover:bg-brand-hover text-zinc-900 h-9 w-9 p-0 shrink-0 flex items-center justify-center rounded-lg cursor-pointer"
                >
                  <Plus className="size-4" />
                </Button>
                <Button
                  onClick={() => setShowAddExercise(false)}
                  variant="ghost"
                  size="sm"
                  className="h-9 hover:bg-white/5 text-muted-foreground"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => {
                  setNewExerciseName("");
                  setShowAddExercise(true);
                }}
                variant="outline"
                className="w-full max-w-md h-12 text-sm rounded-xl border-dashed active:scale-[0.98] transition-all"
              >
                <Plus className="size-4" />
                {t("Add Exercise")}
              </Button>
            )}
          </div>

          {allExercisesCompleted && (
            <div className="mt-4 p-4 bg-brand/10 border border-brand/20 rounded-xl flex flex-col items-center gap-3 text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-center size-10 rounded-full bg-brand/20 text-brand">
                <Trophy className="size-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm sm:text-base">{t("All exercises completed!")}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{t("Good job! Finish your workout to save your results.")}</p>
              </div>
              <Button
                onClick={handleFinishClick}
                className="w-full max-w-sm bg-brand hover:bg-brand-hover text-zinc-900 font-semibold h-11 text-xs sm:text-sm shadow-glow active:scale-[0.98] transition-all cursor-pointer border-0"
              >
                {t("Complete workout")}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Unfinished Sets Warning Dialog Overlay */}
      {showFinishedWarning && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4">
            <h2 className="text-lg font-bold text-foreground">
              {t("Unfinished Sets Warning")}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("You have unfinished sets. Mark them as skipped or return to workout?")}
            </p>
            <div className="flex flex-col gap-2.5 mt-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setShowFinishedWarning(false)}
                className="w-full sm:w-auto h-10 border-border text-zinc-400 hover:text-foreground"
              >
                {t("Return to workout")}
              </Button>
              <Button
                onClick={enterSummaryView}
                className="w-full sm:w-auto bg-brand hover:bg-brand-hover text-zinc-900 h-10 font-semibold"
              >
                {t("Finish anyway")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Warning Dialog Overlay */}
      {showLeaveWarning && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4">
            <h2 className="text-lg font-bold text-foreground">
              {t("Leave Workout")}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("You are currently in an active workout. Are you sure you want to leave?")}
            </p>
            <div className="flex flex-col gap-2.5 mt-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setShowLeaveWarning(false)}
                className="w-full sm:w-auto h-10 border-border text-zinc-400 hover:text-foreground"
              >
                {t("Cancel")}
              </Button>
              <Button
                onClick={handleConfirmLeave}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-500 text-white h-10 font-semibold"
              >
                {t("Leave")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise History View Modal Overlay */}
      {historyExerciseName && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl max-h-[85vh] overflow-y-auto flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-bold text-foreground truncate mr-2">
                {t("History for {name}", { name: historyExerciseName })}
              </h2>
              <button
                onClick={() => setHistoryExerciseName(null)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5"
              >
                <X className="size-5" />
              </button>
            </div>

            {loadingHistory ? (
              <div className="py-12 flex justify-center items-center">
                <div className="animate-spin size-6 border-2 border-brand border-t-transparent rounded-full" />
              </div>
            ) : historyData?.sessions?.length > 0 ? (
              <div className="flex flex-col gap-4">
                {/* Stats */}
                {(() => {
                  const allSets = historyData.sessions.flatMap((s: any) => s.sets);
                  const maxWeight = allSets.reduce((max: number, s: any) => Math.max(max, s.weight ?? 0), 0);
                  const totalVolume = allSets.reduce((sum: number, s: any) => sum + (s.weight ?? 0) * s.reps, 0);

                  return (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl text-center">
                        <div className="text-xl font-bold text-brand">{maxWeight} kg</div>
                        <div className="text-[10px] text-muted-foreground uppercase">{t("Best set")}</div>
                      </div>
                      <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl text-center">
                        <div className="text-xl font-bold text-amber-400">{totalVolume} kg</div>
                        <div className="text-[10px] text-muted-foreground uppercase">{t("Total volume")}</div>
                      </div>
                    </div>
                  );
                })()}

                {/* SVG chart */}
                {historyData.sessions.length > 0 && (
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5">
                    <div className="text-[10px] text-muted-foreground mb-2 uppercase">Volume (kg)</div>
                    <svg viewBox="0 0 300 100" className="w-full h-auto" preserveAspectRatio="none">
                      <line x1="0" y1="90" x2="300" y2="90" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                      {(() => {
                        const volumes = historyData.sessions.map((s: any) =>
                          s.sets.reduce((sum: number, set: any) => sum + (set.weight ?? 0) * set.reps, 0),
                        );
                        const maxVol = Math.max(...volumes, 1);
                        const points = volumes.map((v: number, i: number) => {
                          const x = historyData.sessions.length > 1 ? (i / (historyData.sessions.length - 1)) * 280 + 10 : 150;
                          const y = 90 - (v / maxVol) * 80;
                          return `${x},${y}`;
                        });

                        return (
                          <>
                            <polyline
                              fill="none"
                              stroke="#00e3a4"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              points={points.join(" ")}
                            />
                            {volumes.map((v: number, i: number) => {
                              const x = historyData.sessions.length > 1 ? (i / (historyData.sessions.length - 1)) * 280 + 10 : 150;
                              const y = 90 - (v / maxVol) * 80;
                              return (
                                <circle key={i} cx={x} cy={y} r="3" fill="#00e3a4" />
                              );
                            })}
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                )}

                {/* List */}
                <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto pr-1">
                  {[...historyData.sessions].reverse().map((sessionItem: any, idx: number) => {
                    const date = new Date(sessionItem.startedAt);
                    const vol = sessionItem.sets.reduce((sum: number, s: any) => sum + (s.weight ?? 0) * s.reps, 0);
                    return (
                      <div
                        key={idx}
                        className="bg-white/[0.01] border border-white/5 p-3 rounded-xl flex flex-col gap-2.5 transition-colors text-sm"
                      >
                        <div className="flex justify-between items-center w-full">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-zinc-200">
                              {date.toLocaleDateString("nl-NL", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {sessionItem.sets.length} sets
                            </span>
                          </div>
                          {vol > 0 && (
                            <div className="text-right flex flex-col gap-0.5">
                              <span className="font-semibold text-brand tabular-nums text-xs">{vol} kg</span>
                              <span className="text-[10px] text-muted-foreground">{t("Volume")}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Sets breakdown */}
                        <div className="pt-2 border-t border-white/5 grid grid-cols-2 xs:grid-cols-3 gap-1.5">
                          {sessionItem.sets.map((s: any, sIdx: number) => {
                            let detail = "";
                            if (s.reps && s.weight) {
                              detail = `${s.reps}x${s.weight}kg`;
                              if (s.rpe) detail += `@${s.rpe}`;
                            } else if (s.reps) {
                              detail = `${s.reps} herh`;
                            } else if (s.duration) {
                              const min = Math.floor(s.duration / 60);
                              const sec = s.duration % 60;
                              const durStr = `${min}:${String(sec).padStart(2, "0")}`;
                              detail = durStr;
                              if (s.weight) detail += ` w/${s.weight}kg`;
                            } else if (s.distance) {
                              detail = `${s.distance}km`;
                              if (s.duration) {
                                const min = Math.floor(s.duration / 60);
                                const sec = s.duration % 60;
                                detail += ` (${min}:${String(sec).padStart(2, "0")})`;
                              }
                            }
                            return (
                              <div key={sIdx} className="bg-white/5 border border-white/5 rounded px-2 py-1 text-[10px] font-mono text-zinc-300 flex justify-between">
                                <span className="text-muted-foreground font-semibold mr-1">S{s.setNumber}:</span>
                                <span className="truncate">{detail || "—"}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {t("No data yet for this exercise.")}
              </div>
            )}

            <Button
              onClick={() => setHistoryExerciseName(null)}
              className="w-full bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-200 h-10 font-semibold"
            >
              {t("Clear")}
            </Button>
          </div>
        </div>
      )}


    </div>
  );
}
