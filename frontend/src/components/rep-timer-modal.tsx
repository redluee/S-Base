"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Check, X, Plus, Minus, Timer as TimerIcon, Target, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/lang";
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
} from "@/lib/sound";

interface RepTimerModalProps {
  exerciseName: string;
  setNumber: number;
  targetDurationSeconds?: number | null;
  onFinish: (elapsedSeconds: number) => void;
  onClose: () => void;
}

function playLoudBeep(freq = 880, type: OscillatorType = "sine", duration = 0.18) {
  if (!isSoundEnabled()) return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const osc = ctx.createOscillator();
    const harmonicOsc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    harmonicOsc.type = "sine";
    harmonicOsc.frequency.setValueAtTime(freq * 2, ctx.currentTime);

    gain.gain.setValueAtTime(0.01, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    harmonicOsc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    harmonicOsc.start();
    osc.stop(ctx.currentTime + duration);
    harmonicOsc.stop(ctx.currentTime + duration);

    // Close context after playback to release audio focus (prevents background music ducking)
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, duration * 1000 + 150);
  } catch {
    // Web Audio API safety
  }
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
  exerciseName,
  setNumber,
  targetDurationSeconds,
  onFinish,
  onClose,
}: RepTimerModalProps) {
  const initialTarget = targetDurationSeconds && targetDurationSeconds > 0 ? targetDurationSeconds : 30;

  const [targetTime, setTargetTime] = useState<number>(initialTarget);
  const [isRunning, setIsRunning] = useState(true);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [soundEnabled, setSoundEnabledState] = useState(() => isSoundEnabled());

  const startTimeRef = useRef<number | null>(null);
  const accumulatedMsRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  
  // Track chime triggers
  const last3BeepSecRef = useRef<number | null>(null);
  const targetChimeTriggeredRef = useRef(false);

  function toggleSound() {
    const next = !soundEnabled;
    setSoundEnabledState(next);
    setSoundEnabled(next);
    if (isRunning && targetDurationSeconds && targetDurationSeconds > 0 && !targetChimeTriggeredRef.current) {
      const currentElapsedSec = Math.floor(accumulatedMsRef.current / 1000);
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

  // Schedule background sound & vibration notification whenever running state or target changes
  useEffect(() => {
    if (isRunning && targetDurationSeconds && targetDurationSeconds > 0 && !targetChimeTriggeredRef.current) {
      const currentElapsedSec = Math.floor(accumulatedMsRef.current / 1000);
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
      if (document.visibilityState === "visible" && isRunning && startTimeRef.current !== null) {
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
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isRunning, targetTime, targetDurationSeconds, exerciseName, setNumber]);

  // High precision timer loop via requestAnimationFrame
  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = Date.now();

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
              playLoudBeep(750, "sine", 0.15);
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
        accumulatedMsRef.current += Date.now() - startTimeRef.current;
        startTimeRef.current = null;
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
  };

  const handleAdjustTime = (delta: number) => {
    if (isCountdown) {
      setTargetTime((prev) => Math.max(5, prev + delta));
    } else {
      accumulatedMsRef.current = Math.max(0, accumulatedMsRef.current + delta * 1000);
      if (!isRunning) {
        setElapsedMs(accumulatedMsRef.current);
      }
    }
  };

  const handleCompleteWithSeconds = (secs: number) => {
    clearActiveNotifications();
    onFinish(Math.max(1, secs));
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-zinc-900/95 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl flex flex-col items-center gap-4 text-zinc-100">
        
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
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              {soundEnabled ? (
                <Volume2 className="size-5 text-brand" />
              ) : (
                <VolumeX className="size-5 text-zinc-500" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
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
            <span className={`text-5xl font-mono font-extrabold tracking-tight drop-shadow-[0_0_15px_rgba(0,227,164,0.4)] ${
              isCountdown && displaySeconds <= 0 ? "text-amber-400" : "text-white"
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
            size="sm"
            variant="outline"
            onClick={() => handleAdjustTime(-10)}
            className="h-8 border-white/10 bg-white/5 hover:bg-white/10 text-xs gap-1"
          >
            <Minus className="size-3.5" /> 10s
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAdjustTime(10)}
            className="h-8 border-white/10 bg-white/5 hover:bg-white/10 text-xs gap-1"
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
          >
            <RotateCcw className="size-5" />
          </Button>

          <Button
            onClick={handleTogglePlay}
            className={`size-16 rounded-full shadow-lg transition-transform active:scale-95 ${
              isRunning
                ? "bg-amber-500 hover:bg-amber-600 text-black shadow-amber-500/20"
                : "bg-brand hover:bg-brand/90 text-black shadow-brand/20"
            }`}
          >
            {isRunning ? <Pause className="size-7 fill-current" /> : <Play className="size-7 fill-current ml-1" />}
          </Button>

          <Button
            onClick={() => handleCompleteWithSeconds(elapsedSeconds)}
            className="size-12 rounded-full border border-brand/40 bg-brand/20 text-brand hover:bg-brand/30"
            title={t("Finish & Save Set")}
          >
            <Check className="size-6 stroke-[3px]" />
          </Button>
        </div>

        {/* Complete & Save Buttons */}
        <div className="w-full flex items-center gap-2 pt-1">
          <Button
            onClick={() => handleCompleteWithSeconds(elapsedSeconds)}
            className="flex-1 bg-brand text-black font-semibold hover:bg-brand/90 h-11 rounded-xl shadow-[0_0_20px_rgba(0,227,164,0.3)] text-xs sm:text-sm gap-1.5 px-2"
          >
            <Check className="size-4 stroke-[2.5px] shrink-0" />
            <span>({formatSecs(elapsedSeconds)}) opslaan</span>
          </Button>

          {isCountdown && (
            <Button
              variant="outline"
              onClick={() => handleCompleteWithSeconds(targetTime)}
              className="flex-1 border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 h-11 rounded-xl text-xs gap-1.5 px-2 font-medium"
            >
              <Target className="size-4 text-brand shrink-0" />
              <span>Doeltijd opslaan ({formatSecs(targetTime)})</span>
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}
