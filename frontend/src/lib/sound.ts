// HTML5 Audio background rest timer sound utility
import { getChimeWavUri, getBeepWavUri } from "./sound-wav";

let scheduledTimeoutId: ReturnType<typeof setTimeout> | null = null;
let hasTriggeredCurrentTimer = false;

// Audio elements
let chimeAudioElement: HTMLAudioElement | null = null;
let beepAudioElement: HTMLAudioElement | null = null;

// Worker-based background timer
let backgroundWorker: Worker | null = null;

// Screen Wake Lock
let wakeLockSentinel: unknown = null;

const SOUND_PREF_KEY = "sbase_rest_timer_sound_enabled";

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const val = localStorage.getItem(SOUND_PREF_KEY);
  return val === null ? true : val === "true";
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SOUND_PREF_KEY, String(enabled));
}


function initAudioElements(): void {
  if (typeof window === "undefined") return;

  if (!chimeAudioElement) {
    try {
      chimeAudioElement = new Audio(getChimeWavUri());
      chimeAudioElement.volume = 1.0;
    } catch {}
  }
  
  if (!beepAudioElement) {
    try {
      beepAudioElement = new Audio(getBeepWavUri());
      beepAudioElement.volume = 1.0;
    } catch {}
  }
}

function getWorker(): Worker | null {
  if (typeof window === "undefined") return null;
  if (!backgroundWorker) {
    try {
      const workerCode = `
        let timerId = null;
        self.onmessage = function(e) {
          if (e.data && e.data.type === 'START') {
            if (timerId) clearTimeout(timerId);
            timerId = setTimeout(function() {
              self.postMessage({ type: 'COMPLETE', tag: e.data.tag });
              timerId = null;
            }, e.data.delayMs);
          } else if (e.data && e.data.type === 'STOP') {
            if (timerId) {
              clearTimeout(timerId);
              timerId = null;
            }
          }
        };
      `;
      const blob = new Blob([workerCode], { type: "application/javascript" });
      backgroundWorker = new Worker(URL.createObjectURL(blob));
      backgroundWorker.onmessage = (e) => {
        if (e.data && e.data.type === "COMPLETE") {
          if (e.data.tag === "set-timer") {
            triggerSetTimerCompletion();
          } else {
            triggerRestTimerCompletion();
          }
        }
      };
    } catch {
      backgroundWorker = null;
    }
  }
  return backgroundWorker;
}

/**
 * Call on user gesture to unlock browser audio if needed.
 */
export function unlockAudio(): void {
  initAudioElements();
  if (chimeAudioElement) {
    try {
      // Just load it into memory on user gesture
      chimeAudioElement.load();
    } catch {}
  }
  if (beepAudioElement) {
    try {
      beepAudioElement.load();
    } catch {}
  }
}

export function playLoudBeep(): void {
  if (!isSoundEnabled()) return;
  initAudioElements();
  if (beepAudioElement) {
    try {
      beepAudioElement.currentTime = 0;
      const playPromise = beepAudioElement.play();
      if (playPromise) {
        playPromise.catch(() => {});
      }
    } catch {}
  }
}

/**
 * Plays the 4-tone chime using HTML5 Audio.
 */
export function playRestTimerEndSound(): void {
  if (!isSoundEnabled()) return;
  initAudioElements();
  if (chimeAudioElement) {
    try {
      chimeAudioElement.currentTime = 0;
      const playPromise = chimeAudioElement.play();
      if (playPromise) {
        playPromise.catch(() => {});
      }
    } catch {}
  }
}

export function resetTimerTriggerState(): void {
  hasTriggeredCurrentTimer = false;
  cancelScheduledSound();
}

function notifyServiceWorkerSchedule(delaySeconds: number, title: string, body: string, tag: string): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const soundEnabled = isSoundEnabled();
  const targetTimestamp = Date.now() + delaySeconds * 1000;

  const message = {
    type: "SCHEDULE_TIMER",
    targetTimestamp,
    title,
    body,
    tag,
    soundEnabled,
  };

  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(message);
  } else {
    navigator.serviceWorker.ready
      .then((reg) => {
        reg.active?.postMessage(message);
      })
      .catch(() => {});
  }
}

function notifyServiceWorkerCancel(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const message = { type: "CANCEL_TIMER" };
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(message);
  } else {
    navigator.serviceWorker.ready
      .then((reg) => {
        reg.active?.postMessage(message);
      })
      .catch(() => {});
  }
}

/**
 * Schedules background rest timer completion.
 */
export function scheduleRestEndSound(delaySeconds: number): void {
  cancelScheduledSound();
  hasTriggeredCurrentTimer = false;

  if (delaySeconds <= 0) return;

  unlockAudio();

  const worker = getWorker();
  if (worker) {
    worker.postMessage({ type: "START", delayMs: delaySeconds * 1000, tag: "rest-timer" });
  }

  scheduledTimeoutId = setTimeout(() => {
    triggerRestTimerCompletion();
  }, delaySeconds * 1000);

  notifyServiceWorkerSchedule(
    delaySeconds,
    "Pauze voorbij! ⏱️",
    "Tijd voor je volgende set!",
    "sbase-workout-timer"
  );
}

/**
 * Cancels all pending sound timeouts, background workers, and audio loops.
 */
export function cancelScheduledSound(): void {
  if (scheduledTimeoutId) {
    clearTimeout(scheduledTimeoutId);
    scheduledTimeoutId = null;
  }

  const worker = getWorker();
  if (worker) {
    worker.postMessage({ type: "STOP" });
  }

  notifyServiceWorkerCancel();
}

/**
 * Triggers the rest timer completion actions ONCE (sound, vibrate, notification).
 */
export function triggerRestTimerCompletion(skipSound = false): void {
  if (hasTriggeredCurrentTimer) return;
  hasTriggeredCurrentTimer = true;

  cancelScheduledSound();

  if (!skipSound) {
    playRestTimerEndSound();
    vibrateDevice();
    sendRestEndNotification();
  }
}

export function vibrateDevice(): void {
  if (!isSoundEnabled()) return;
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate([300, 100, 300, 100, 400]);
    } catch {}
  }
}

export function requestNotificationPermission(): void {
  if (typeof window === "undefined") return;
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
}

async function sendNotification(title: string, body: string, tag: string): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const soundOn = isSoundEnabled();
  const options: NotificationOptions & { vibrate?: number[]; silent?: boolean; requireInteraction?: boolean } = {
    body,
    icon: "/favicon.ico",
    tag,
    silent: true,
    requireInteraction: true,
    ...(soundOn ? { vibrate: [300, 100, 300, 100, 400] } : { vibrate: [] }),
  };

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, options);
        return;
      }
    }
    new Notification(title, options);
  } catch {
    try {
      new Notification(title, options);
    } catch (err) {
      console.error("Failed to display notification:", err);
    }
  }
}

export function clearActiveNotifications(): void {
  if (typeof window === "undefined") return;

  const message = { type: "CLEAR_NOTIFICATIONS" };
  if ("serviceWorker" in navigator) {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(message);
    } else {
      navigator.serviceWorker.ready
        .then((reg) => {
          reg.active?.postMessage(message);
          if (reg.getNotifications) {
            reg.getNotifications().then((notifications) => {
              notifications.forEach((n) => n.close());
            }).catch(() => {});
          }
        })
        .catch(() => {});
    }
  }
}

export function sendRestEndNotification(): void {
  sendNotification("Pauze voorbij! ⏱️", "Tijd voor je volgende set!", "sbase-workout-timer");
}

export function sendSetEndNotification(exerciseName?: string, setNumber?: number): void {
  const details = exerciseName && setNumber ? `${exerciseName} - Set ${setNumber}` : "Tijd is om!";
  sendNotification("Set voltooid! ⏱️", details, "sbase-workout-timer");
}

/**
 * Triggers completion actions for set countdown timer ONCE (sound, vibrate, notification).
 */
export function triggerSetTimerCompletion(exerciseName?: string, setNumber?: number, skipSound = false): void {
  if (hasTriggeredCurrentTimer) return;
  hasTriggeredCurrentTimer = true;

  cancelScheduledSound();

  if (!skipSound) {
    playRestTimerEndSound();
    vibrateDevice();
    sendSetEndNotification(exerciseName, setNumber);
  }
}

/**
 * Schedules background set timer completion at target time.
 */
export function scheduleSetEndSound(
  delaySeconds: number,
  exerciseName?: string,
  setNumber?: number
): void {
  cancelScheduledSound();
  hasTriggeredCurrentTimer = false;

  if (delaySeconds <= 0) return;

  unlockAudio();

  const worker = getWorker();
  if (worker) {
    worker.postMessage({ type: "START", delayMs: delaySeconds * 1000, tag: "set-timer" });
  }

  scheduledTimeoutId = setTimeout(() => {
    triggerSetTimerCompletion(exerciseName, setNumber);
  }, delaySeconds * 1000);

  const details = exerciseName && setNumber ? `${exerciseName} - Set ${setNumber}` : "Tijd is om!";
  notifyServiceWorkerSchedule(
    delaySeconds,
    "Set voltooid! ⏱️",
    details,
    "sbase-workout-timer"
  );
}

/**
 * Screen Wake Lock helpers to keep the screen active during workouts.
 */
export async function requestScreenWakeLock(): Promise<void> {
  if (typeof window === "undefined" || !("wakeLock" in navigator)) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (wakeLockSentinel && !(wakeLockSentinel as any).released) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sentinel = await (navigator as any).wakeLock.request("screen");
    wakeLockSentinel = sentinel;
    if (sentinel) {
      sentinel.addEventListener("release", () => {
        if (wakeLockSentinel === sentinel) {
          wakeLockSentinel = null;
        }
      });
    }
  } catch {}
}

export function releaseScreenWakeLock(): void {
  if (wakeLockSentinel) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (wakeLockSentinel as any).release();
    } catch {}
    wakeLockSentinel = null;
  }
}
