"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Check, X, Plus, Minus, Timer as TimerIcon, Target, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { t } from "@/lib/lang";
import { pauseAccumulate, restoreSetTimer, saveSetTimerSnapshot, setTimerElapsedMs, type SetTimerSnapshot } from "@/lib/set-timer";
import {
  triggerSetTimerCompletion,
  scheduleSetEndSound,
  cancelScheduledSound,
  resetTimerTriggerState,
  unlockAudio,
  requestNotificationPermission,
  isSoundEnabled,
  setSoundEnabled,
  clearActiveNotifications,
  playLoudBeep,
  requestScreenWakeLock,
  releaseScreenWakeLock,
} from "@/lib/sound";

interface RepTimerModalProps {
  sessionId?: number;
  exIdx?: number;
  setIdx?: number;
  restored?: SetTimerSnapshot | null;
  exerciseName: string;
  setNumber: number;
  targetDurationSeconds?: number | null;
  onFinish: (elapsedSeconds: number) => void;
  onClose: () => void;
}

function formatSecs(secVal: number): string {
  const isNeg = secVal < 0;
  const absSec = Math.abs(secVal);
  const min = Math.floor(absSec / 60);
  const sec = absSec % 60;
  const timeStr = `${min}:${String(sec).padStart(2, "0")}`;
  return isNeg ? `-${timeStr}` : timeStr;
}

export function RepTimerModal({
  sessionId,
  exIdx = 0,
  setIdx = 0,
  restored = null,
  exerciseName,
  setNumber,
  targetDurationSeconds,
  onFinish,
  onClose,
}: RepTimerModalProps) {
  const initialTarget = targetDurationSeconds && targetDurationSeconds > 0 ? targetDurationSeconds : 30;

  const [initialRestore] = useState(() => (restored ? restoreSetTimer(restored, Date.now()) : null));
  const [targetTime, setTargetTime] = useState<number>(restored?.targetTime ?? initialTarget);
  const [isRunning, setIsRunning] = useState(initialRestore ? initialRestore.isRunning : true);
  const [elapsedMs, setElapsedMs] = useState(initialRestore?.elapsedMs ?? 0);
  const [soundEnabled, setSoundEnabledState] = useState(() => isSoundEnabled());

  const startTimeRef = useRef<number | null>(initialRestore?.runStartMs ?? null);
  const accumulatedMsRef = useRef<number>(initialRestore?.accumulatedMs ?? 0);
  const animFrameRef = useRef<number | null>(null);
  
  // Track chime triggers
  const last3BeepSecRef = useRef<number | null>(null);
  const targetChimeTriggeredRef = useRef(
    Boolean(initialRestore && targetDurationSeconds && targetDurationSeconds > 0 && initialRestore.elapsedMs / 1000 >= (restored?.targetTime ?? 0))
  );

  const persist = () => {
    if (sessionId === undefined) return;
    saveSetTimerSnapshot({
      sessionId,
      exIdx,
      setIdx,
      exerciseName,
      setNumber,
      targetDurationSeconds: targetDurationSeconds ?? null,
      targetTime,
      accumulatedMs: accumulatedMsRef.current,
      runStartMs: startTimeRef.current,
    });
  };

  function toggleSound() {
    const next = !soundEnabled;
    setSoundEnabledState(next);
    setSoundEnabled(next);
    if (isRunning && targetDurationSeconds && targetDurationSeconds > 0 && !targetChimeTriggeredRef.current) {
      const currentElapsedSec = Math.floor(setTimerElapsedMs(accumulatedMsRef.current, startTimeRef.current, Date.now()) / 1000);
      const remainingSecs = targetTime - currentElapsedSec;
      if (remainingSecs > 0) {
        scheduleSetEndSound(remainingSecs, exerciseName, setNumber);
      }
    }
  }

  // Request permissions and unlock audio on initial render
  useEffect(() => {
    unlockAudio();
    requestNotificationPermission();
  }, []);

  // Screen Wake Lock while set timer is running
  useEffect(() => {
    if (isRunning) {
      requestScreenWakeLock();
    } else {
      releaseScreenWakeLock();
    }
    return () => {
      releaseScreenWakeLock();
    };
  }, [isRunning]);

  // Schedule background sound & vibration notification whenever running state or target changes
  useEffect(() => {
    if (isRunning && targetDurationSeconds && targetDurationSeconds > 0 && !targetChimeTriggeredRef.current) {
      const currentElapsedSec = Math.floor(setTimerElapsedMs(accumulatedMsRef.current, startTimeRef.current, Date.now()) / 1000);
      const remainingSecs = targetTime - currentElapsedSec;
      if (remainingSecs > 0) {
        scheduleSetEndSound(remainingSecs, exerciseName, setNumber);
      }
    } else if (!isRunning) {
      cancelScheduledSound();
    }
  }, [isRunning, targetTime, targetDurationSeconds, exerciseName, setNumber, soundEnabled]);


  // Handle returning from background / screen off
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (isRunning) {
          requestScreenWakeLock();
        }
        if (isRunning && startTimeRef.current !== null) {
          const now = Date.now();
          const currentTotalMs = accumulatedMsRef.current + (now - startTimeRef.current);
          setElapsedMs(currentTotalMs);

          const currentElapsedSec = Math.floor(currentTotalMs / 1000);
          if (targetDurationSeconds && targetDurationSeconds > 0) {
            const secsRemaining = targetTime - currentElapsedSec;
            if (secsRemaining <= 0 && !targetChimeTriggeredRef.current) {
              targetChimeTriggeredRef.current = true;
              const skipSound = secsRemaining < -2;
              triggerSetTimerCompletion(exerciseName, setNumber, skipSound);
            }
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isRunning, targetTime, targetDurationSeconds, exerciseName, setNumber]);

  // High precision timer loop via requestAnimationFrame
  useEffect(() => {
    if (isRunning) {
      if (startTimeRef.current === null) startTimeRef.current = Date.now();

      const updateLoop = () => {
        if (startTimeRef.current !== null) {
          const now = Date.now();
          const currentTotalMs = accumulatedMsRef.current + (now - startTimeRef.current);
          setElapsedMs(currentTotalMs);

          const currentElapsedSec = Math.floor(currentTotalMs / 1000);

            // 3, 2, 1 Countdown beeps before reaching targetTime
          if (targetDurationSeconds && targetDurationSeconds > 0) {
            const secsRemaining = targetTime - currentElapsedSec;
            if (secsRemaining <= 3 && secsRemaining > 0 && last3BeepSecRef.current !== secsRemaining) {
              last3BeepSecRef.current = secsRemaining;
              playLoudBeep();
            }

            // Completion chime and vibration when target is reached
            if (secsRemaining <= 0 && !targetChimeTriggeredRef.current) {
              targetChimeTriggeredRef.current = true;
              triggerSetTimerCompletion(exerciseName, setNumber);
            }
          }

          animFrameRef.current = requestAnimationFrame(updateLoop);
        }
      };

      animFrameRef.current = requestAnimationFrame(updateLoop);
    } else {
      if (startTimeRef.current !== null) {
        accumulatedMsRef.current = pauseAccumulate(accumulatedMsRef.current, startTimeRef.current, Date.now());
        startTimeRef.current = null;
        setElapsedMs(accumulatedMsRef.current);
      }
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    }

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isRunning, targetTime, targetDurationSeconds, exerciseName, setNumber]);

  // Persist timer state so it survives a page reload
  useEffect(() => {
    persist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, targetTime]);

  // Cleanup scheduled sound on component unmount
  useEffect(() => {
    return () => {
      cancelScheduledSound();
      clearActiveNotifications();
    };
  }, []);

  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const isCountdown = targetDurationSeconds != null && targetDurationSeconds > 0;
  const displaySeconds = isCountdown ? targetTime - elapsedSeconds : elapsedSeconds;

  // Smooth SVG progress ring percent calculation
  const totalTargetMs = targetTime * 1000;
  const progressPercent = isCountdown
    ? Math.min(100, Math.max(0, (elapsedMs / totalTargetMs) * 100))
    : Math.min(100, (elapsedMs % 60000) / 600);

  const handleTogglePlay = () => {
    unlockAudio();
    setIsRunning((prev) => !prev);
  };

  const handleReset = () => {
    cancelScheduledSound();
    clearActiveNotifications();
    resetTimerTriggerState();
    setIsRunning(false);
    startTimeRef.current = null;
    accumulatedMsRef.current = 0;
    setElapsedMs(0);
    last3BeepSecRef.current = null;
    targetChimeTriggeredRef.current = false;
    persist();
  };

  const handleAdjustTime = (delta: number) => {
    if (isCountdown) {
      setTargetTime((prev) => Math.max(5, prev + delta));
    } else {
      accumulatedMsRef.current = Math.max(0, accumulatedMsRef.current + delta * 1000);
      if (!isRunning) {
        setElapsedMs(accumulatedMsRef.current);
      }
      persist();
    }
  };

  const handleCompleteWithSeconds = (secs: number) => {
    clearActiveNotifications();
    onFinish(Math.max(1, secs));
  };

  return (
    <ModalOverlay
      open
      onClose={onClose}
      label={`${exerciseName} — ${t("Set")} ${setNumber}`}
          >
      <div className="relative w-full max-w-md bg-popover ring-1 ring-foreground/10 rounded-2xl p-5 sm:p-6 flex flex-col items-center gap-4 text-zinc-100">
        
        {/* Header */}
        <div className="w-full flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-brand/15 text-brand border border-brand/30">
              <TimerIcon className="size-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground leading-tight">{exerciseName}</h3>
              <p className="text-xs text-muted-foreground">{t("Set")} {setNumber} • {isCountdown ? t("Target Time") : t("Timed Rep")}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleSound}
              title={soundEnabled ? t("Geluid aan") : t("Geluid uit")}
              aria-label={soundEnabled ? t("Geluid aan") : t("Geluid uit")}
              className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              {soundEnabled ? (
                <Volume2 className="size-5 text-brand" />
              ) : (
                <VolumeX className="size-5 text-zinc-500" />
              )}
            </button>
            <button
              onClick={onClose}
              className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              aria-label={t("Sluiten")}
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Circular Timer Display */}
        <div className="relative size-52 flex items-center justify-center my-1">
          {/* SVG Progress Ring */}
          <svg className="size-full -rotate-90" viewBox="0 0 100 100">
            {/* Track */}
            <circle
              cx="50"
              cy="50"
              r="44"
              className="stroke-zinc-800"
              strokeWidth="6"
              fill="transparent"
            />
            {/* Smooth Progress */}
            <circle
              cx="50"
              cy="50"
              r="44"
              className="stroke-brand"
              strokeWidth="6"
              strokeDasharray={276.46}
              strokeDashoffset={276.46 - (276.46 * progressPercent) / 100}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Time digits */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-5xl font-extrabold tracking-tight tabular-nums ${
              isCountdown && displaySeconds <= 0 ? "text-brand" : "text-white"
            }`}>
              {formatSecs(displaySeconds)}
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              {isCountdown
                ? `${t("Elapsed") || "Verstreken"}: ${formatSecs(elapsedSeconds)}`
                : `${t("Stopwatch") || "Stopwatch"}`}
            </span>
          </div>
        </div>

        {/* Quick adjustments (+10s / -10s) */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => handleAdjustTime(-10)}
            className="min-h-11 min-w-20 border-white/10 bg-white/5 hover:bg-white/10 text-sm gap-1"
          >
            <Minus className="size-3.5" /> 10s
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAdjustTime(10)}
            className="min-h-11 min-w-20 border-white/10 bg-white/5 hover:bg-white/10 text-sm gap-1"
          >
            <Plus className="size-3.5" /> 10s
          </Button>
        </div>

        {/* Main Play/Pause & Reset Controls */}
        <div className="w-full flex items-center justify-center gap-4 pt-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            className="size-12 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300"
            title={t("Reset")}
            aria-label={t("Reset")}
          >
            <RotateCcw className="size-5" />
          </Button>

          <Button
            onClick={handleTogglePlay}
            aria-label={isRunning ? t("Pause") : t("Resume")}
            className={`size-16 rounded-full ${
              isRunning
                ? "bg-white/15 hover:bg-white/25 text-white"
                : "bg-brand hover:bg-brand/90 text-black"
            }`}
          >
            {isRunning ? <Pause className="size-7 fill-current" /> : <Play className="size-7 fill-current ml-1" />}
          </Button>

          <Button
            onClick={() => handleCompleteWithSeconds(elapsedSeconds)}
            className="size-12 rounded-full border border-brand/40 bg-brand/20 text-brand hover:bg-brand/30"
            title={t("Finish & Save Set")}
            aria-label={t("Finish & Save Set")}
          >
            <Check className="size-6 stroke-[3px]" />
          </Button>
        </div>

        {/* Complete & Save Buttons */}
        <div className="w-full flex flex-col sm:flex-row items-stretch gap-2 pt-1">
          <Button
            onClick={() => handleCompleteWithSeconds(elapsedSeconds)}
            className="flex-1 bg-brand text-black font-semibold hover:bg-brand/90 min-h-11 rounded-xl text-xs sm:text-sm gap-1.5 px-2"
          >
            <Check className="size-4 stroke-[2.5px] shrink-0" />
            <span>{t("Opslaan")} ({formatSecs(elapsedSeconds)})</span>
          </Button>

          {isCountdown && (
            <Button
              variant="outline"
              onClick={() => handleCompleteWithSeconds(targetTime)}
              className="flex-1 border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 min-h-11 rounded-xl text-xs gap-1.5 px-2 font-medium"
            >
              <Target className="size-4 text-brand shrink-0" />
              <span>{t("Doeltijd opslaan")} ({formatSecs(targetTime)})</span>
            </Button>
          )}
        </div>

      </div>
    </ModalOverlay>
  );
}
