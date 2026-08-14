// Web Audio & HTML5 Audio background rest timer sound utility

let audioCtx: AudioContext | null = null;
let scheduledTimeoutId: ReturnType<typeof setTimeout> | null = null;
let activeScheduledOscillators: OscillatorNode[] = [];
let hasTriggeredCurrentTimer = false;

// Audio elements for background-safe playback
let silentAudioElement: HTMLAudioElement | null = null;
let chimeAudioElement: HTMLAudioElement | null = null;
let stopSilentTimeoutId: ReturnType<typeof setTimeout> | null = null;

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

function createWavDataUri(samples: Float32Array, sampleRate = 44100): string {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = samples.length * (bitsPerSample / 8);
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const int16 = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, int16, true);
    offset += 2;
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return "data:audio/wav;base64," + btoa(binary);
}

function getSilentWavUri(): string {
  // 0.5s of silence at 8000Hz mono = very tiny payload
  const samples = new Float32Array(4000);
  return createWavDataUri(samples, 8000);
}

function getChimeWavUri(): string {
  // Rich 4-tone chime (E5 -> G#5 -> B5 -> E6)
  const sampleRate = 44100;
  const totalDuration = 0.85;
  const samples = new Float32Array(Math.floor(sampleRate * totalDuration));
  const notes = [
    { freq: 659.25, duration: 0.12, delay: 0 },
    { freq: 830.61, duration: 0.12, delay: 0.1 },
    { freq: 987.77, duration: 0.12, delay: 0.2 },
    { freq: 1318.51, duration: 0.45, delay: 0.32 },
  ];

  notes.forEach((note) => {
    const startIdx = Math.floor(note.delay * sampleRate);
    const len = Math.floor(note.duration * sampleRate);
    for (let i = 0; i < len; i++) {
      const t = i / sampleRate;
      const progress = i / len;
      // Attack and exponential decay envelope
      const attack = Math.min(1, progress / 0.05);
      const decay = Math.exp(-progress * 3.5);
      const env = attack * decay;

      const fundamental = Math.sin(2 * Math.PI * note.freq * t) * 0.7;
      const harmonic = Math.sin(2 * Math.PI * note.freq * 2 * t) * 0.25;
      const val = (fundamental + harmonic) * env;

      if (startIdx + i < samples.length) {
        samples[startIdx + i] += val;
      }
    }
  });

  return createWavDataUri(samples, sampleRate);
}

function initAudioElements(): void {
  if (typeof window === "undefined") return;

  if (!silentAudioElement) {
    try {
      silentAudioElement = new Audio(getSilentWavUri());
      silentAudioElement.loop = true;
      silentAudioElement.volume = 0.01;
    } catch {}
  }

  if (!chimeAudioElement) {
    try {
      chimeAudioElement = new Audio(getChimeWavUri());
      chimeAudioElement.volume = 1.0;
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

function startAudioKeepAlive(): void {
  if (typeof window === "undefined") return;
  initAudioElements();

  if (stopSilentTimeoutId) {
    clearTimeout(stopSilentTimeoutId);
    stopSilentTimeoutId = null;
  }

  if (silentAudioElement) {
    try {
      silentAudioElement.currentTime = 0;
      const playPromise = silentAudioElement.play();
      if (playPromise) {
        playPromise.catch(() => {});
      }
    } catch {}
  }
}

function stopAudioKeepAlive(delayMs = 1500): void {
  if (typeof window === "undefined") return;

  if (stopSilentTimeoutId) {
    clearTimeout(stopSilentTimeoutId);
    stopSilentTimeoutId = null;
  }

  stopSilentTimeoutId = setTimeout(() => {
    if (silentAudioElement) {
      try {
        silentAudioElement.pause();
        silentAudioElement.currentTime = 0;
      } catch {}
    }
    stopSilentTimeoutId = null;
  }, delayMs);
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
 * Call on user gesture (click/tap) to unlock browser audio restrictions.
 */
export function unlockAudio(): void {
  initAudioElements();

  // Unlock HTML5 Audio
  if (silentAudioElement) {
    try {
      const p = silentAudioElement.play();
      if (p) {
        p.then(() => {
          if (!hasActiveTimer()) {
            silentAudioElement?.pause();
          }
        }).catch(() => {});
      }
    } catch {}
  }

  if (chimeAudioElement) {
    try {
      chimeAudioElement.load();
    } catch {}
  }

  // Unlock Web Audio API
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}

function hasActiveTimer(): boolean {
  return scheduledTimeoutId !== null;
}

/**
 * Plays the 4-tone chime using both HTML5 Audio (background safe) & Web Audio synthesis.
 */
export function playRestTimerEndSound(): void {
  if (!isSoundEnabled()) return;

  // 1. Primary: HTML5 Audio element (works even in background tabs when audio session was alive)
  if (chimeAudioElement) {
    try {
      chimeAudioElement.currentTime = 0;
      const playPromise = chimeAudioElement.play();
      if (playPromise) {
        playPromise.catch(() => {});
      }
    } catch {}
  }

  // 2. Secondary: Web Audio API synthesis for extra richness and low-latency foreground playback
  try {
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === "suspended") {
        ctx.resume().then(() => playChimeSequence(ctx)).catch(() => {});
      } else {
        playChimeSequence(ctx);
      }
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
  startAudioKeepAlive();

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

  stopAudioKeepAlive(0);

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
export function scheduleSetEndSound(
  delaySeconds: number,
  exerciseName?: string,
  setNumber?: number
): void {
  cancelScheduledSound();
  hasTriggeredCurrentTimer = false;

  if (delaySeconds <= 0) return;

  unlockAudio();
  startAudioKeepAlive();

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
