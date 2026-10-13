import { useEffect, useRef, useState } from "react";
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
import { getExerciseRestTime } from "@/components/workout-session-helpers";
import type { SessionExercise } from "@backend/types/shared";

export function useSessionWakeLock(sessionActive: boolean, restActive: boolean) {
  const shouldKeepAwake = sessionActive || restActive;

  useEffect(() => {
    if (shouldKeepAwake) {
      requestScreenWakeLock();
    } else {
      releaseScreenWakeLock();
    }
    return () => {
      releaseScreenWakeLock();
    };
  }, [shouldKeepAwake]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && shouldKeepAwake) {
        requestScreenWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [shouldKeepAwake]);
}

export function useRestTimer(exercises: SessionExercise[] | undefined) {
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

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && restActive && restEndTimeRef.current) {
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
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [restActive]);

  function startRestTimer(exIdx: number, setIdx: number, customTime?: number) {
    if (!exercises) return;
    unlockAudio();
    requestNotificationPermission();

    const ex = exercises[exIdx];
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

  return {
    restSecondsLeft,
    restTotalSeconds,
    restActive,
    activeRestExerciseIdx,
    activeRestSetIdx,
    soundEnabled,
    toggleSound,
    startRestTimer,
    stopRestTimer,
    adjustRestTimer,
  };
}
