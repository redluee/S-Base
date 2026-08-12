// Web Audio API sound utility & background rest timer notifications

let audioCtx: AudioContext | null = null;
let scheduledTimeoutId: ReturnType<typeof setTimeout> | null = null;
let activeScheduledOscillators: OscillatorNode[] = [];
let hasTriggeredCurrentTimer = false;

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

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Call on user gesture (click/tap) to ensure browser autoplay restrictions are unlocked.
 */
export function unlockAudio(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}

/**
 * Plays a pleasant 4-tone chime (E5 -> G#5 -> B5 -> E6) using Web Audio API.
 */
export function playRestTimerEndSound(): void {
  if (!isSoundEnabled()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().then(() => playChimeSequence(ctx)).catch(() => {});
    } else {
      playChimeSequence(ctx);
    }
  } catch (e) {
    console.error("Failed to play rest timer chime:", e);
  }
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
    // Primary sine tone
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

    // Subtle octave harmonic for extra punch and clarity
    const harmonicOsc = ctx.createOscillator();
    const harmonicGain = ctx.createGain();
    harmonicOsc.type = "triangle";
    harmonicOsc.frequency.setValueAtTime(note.freq * 2, startTime + note.delay);

    harmonicGain.gain.setValueAtTime(0.001, noteStart);
    harmonicGain.gain.linearRampToValueAtTime(0.25, noteStart + 0.01);
    harmonicGain.gain.exponentialRampToValueAtTime(0.001, noteEnd);

    harmonicOsc.connect(harmonicGain);
    harmonicGain.connect(masterGain);

    if (startTimeOffsetSeconds > 0) {
      activeScheduledOscillators.push(osc);
      activeScheduledOscillators.push(harmonicOsc);
    }

    osc.start(noteStart);
    osc.stop(noteEnd + 0.05);
    harmonicOsc.start(noteStart);
    harmonicOsc.stop(noteEnd + 0.05);
  });
}

/**
 * Reset trigger state when starting or adjusting a timer.
 */
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
    navigator.serviceWorker.ready.then((reg) => {
      reg.active?.postMessage(message);
    }).catch(() => {});
  }
}

function notifyServiceWorkerCancel(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const message = { type: "CANCEL_TIMER" };
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(message);
  } else {
    navigator.serviceWorker.ready.then((reg) => {
      reg.active?.postMessage(message);
    }).catch(() => {});
  }
}

/**
 * Schedules background audio play at target time.
 * Automatically cancels any previously scheduled sound or timeouts.
 */
export function scheduleRestEndSound(delaySeconds: number): void {
  cancelScheduledSound();
  hasTriggeredCurrentTimer = false;

  if (delaySeconds <= 0) return;

  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  scheduledTimeoutId = setTimeout(() => {
    triggerRestTimerCompletion();
  }, delaySeconds * 1000);

  notifyServiceWorkerSchedule(
    delaySeconds,
    "Pauze voorbij! ⏱️",
    "Tijd voor je volgende set!",
    "rest-timer-done"
  );
}

/**
 * Cancels all pending sound timeouts and scheduled Web Audio oscillators.
 */
export function cancelScheduledSound(): void {
  if (scheduledTimeoutId) {
    clearTimeout(scheduledTimeoutId);
    scheduledTimeoutId = null;
  }

  activeScheduledOscillators.forEach((osc) => {
    try {
      osc.stop();
      osc.disconnect();
    } catch {}
  });
  activeScheduledOscillators = [];

  notifyServiceWorkerCancel();
}

/**
 * Triggers the rest timer completion actions ONCE (sound, vibrate, notification).
 */
export function triggerRestTimerCompletion(): void {
  if (hasTriggeredCurrentTimer) return;
  hasTriggeredCurrentTimer = true;

  cancelScheduledSound();

  playRestTimerEndSound();
  vibrateDevice();
  sendRestEndNotification();
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
  const options: NotificationOptions & { vibrate?: number[]; silent?: boolean } = {
    body,
    icon: "/favicon.ico",
    tag,
    silent: !soundOn,
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

export function sendRestEndNotification(): void {
  sendNotification("Pauze voorbij! ⏱️", "Tijd voor je volgende set!", "rest-timer-done");
}

export function sendSetEndNotification(exerciseName?: string, setNumber?: number): void {
  const details = exerciseName && setNumber ? `${exerciseName} - Set ${setNumber}` : "Tijd is om!";
  sendNotification("Set voltooid! ⏱️", details, "set-timer-done");
}

/**
 * Triggers completion actions for set countdown timer ONCE (sound, vibrate, notification).
 */
export function triggerSetTimerCompletion(exerciseName?: string, setNumber?: number): void {
  if (hasTriggeredCurrentTimer) return;
  hasTriggeredCurrentTimer = true;

  cancelScheduledSound();

  playRestTimerEndSound();
  vibrateDevice();
  sendSetEndNotification(exerciseName, setNumber);
}

/**
 * Schedules background set timer completion at target time.
 */
export function scheduleSetEndSound(delaySeconds: number, exerciseName?: string, setNumber?: number): void {
  cancelScheduledSound();
  hasTriggeredCurrentTimer = false;

  if (delaySeconds <= 0) return;

  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  scheduledTimeoutId = setTimeout(() => {
    triggerSetTimerCompletion(exerciseName, setNumber);
  }, delaySeconds * 1000);

  const details = exerciseName && setNumber ? `${exerciseName} - Set ${setNumber}` : "Tijd is om!";
  notifyServiceWorkerSchedule(
    delaySeconds,
    "Set voltooid! ⏱️",
    details,
    "set-timer-done"
  );
}


