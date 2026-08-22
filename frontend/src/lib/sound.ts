// Web Audio background rest timer sound utility

let scheduledTimeoutId: ReturnType<typeof setTimeout> | null = null;
let hasTriggeredCurrentTimer = false;

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
 * For one-off AudioContexts, unlocking isn't strictly necessary as long as the gesture occurs,
 * but this is kept for compatibility.
 */
export function unlockAudio(): void {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      if (ctx.state === "suspended") {
        ctx.resume().then(() => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          gain.gain.value = 0;
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.001);
          setTimeout(() => ctx.close().catch(() => {}), 100);
        }).catch(() => {});
      } else {
        ctx.close().catch(() => {});
      }
    }
  } catch {}
}

/**
 * Plays the 4-tone chime using Web Audio synthesis, closing context after to release audio focus (prevents ducking).
 */
export function playRestTimerEndSound(): void {
  if (!isSoundEnabled()) return;
  
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().then(() => playChimeSequence(ctx)).catch(() => {});
    } else {
      playChimeSequence(ctx);
    }
  } catch {}
}

function playChimeSequence(ctx: AudioContext, startTimeOffsetSeconds = 0): void {
  const startTime = ctx.currentTime + Math.max(0, startTimeOffsetSeconds);

  // Notes: E5 (659.25Hz), G#5 (830.61Hz), B5 (987.77Hz), E6 (1318.51Hz)
  const notes = [
    { freq: 659.25, duration: 0.12, delay: 0 },
    { freq: 830.61, duration: 0.12, delay: 0.1 },
    { freq: 987.77, duration: 0.12, delay: 0.2 },
    { freq: 1318.51, duration: 0.35, delay: 0.32 },
  ];

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.85, startTime);
  masterGain.connect(ctx.destination);

  notes.forEach((note) => {
    const osc = ctx.createOscillator();
    const noteGain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(note.freq, startTime + note.delay);

    const noteStart = startTime + note.delay;
    const noteEnd = noteStart + note.duration;

    noteGain.gain.setValueAtTime(0.001, noteStart);
    noteGain.gain.linearRampToValueAtTime(0.85, noteStart + 0.01);
    noteGain.gain.exponentialRampToValueAtTime(0.001, noteEnd);

    osc.connect(noteGain);
    noteGain.connect(masterGain);

    const harmonicOsc = ctx.createOscillator();
    const harmonicGain = ctx.createGain();
    harmonicOsc.type = "triangle";
    harmonicOsc.frequency.setValueAtTime(note.freq * 2, startTime + note.delay);

    harmonicGain.gain.setValueAtTime(0.001, noteStart);
    harmonicGain.gain.linearRampToValueAtTime(0.25, noteStart + 0.01);
    harmonicGain.gain.exponentialRampToValueAtTime(0.001, noteEnd);

    harmonicOsc.connect(harmonicGain);
    harmonicGain.connect(masterGain);

    osc.start(noteStart);
    osc.stop(noteEnd + 0.05);
    harmonicOsc.start(noteStart);
    harmonicOsc.stop(noteEnd + 0.05);
  });

  // Release audio focus by closing the context after chime sequence
  const totalDuration = startTimeOffsetSeconds + 1.0;
  setTimeout(() => {
    ctx.close().catch(() => {});
  }, totalDuration * 1000);
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
    wakeLockSentinel = await (navigator as any).wakeLock.request("screen");
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
