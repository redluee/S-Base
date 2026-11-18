import type { CompletionPhase } from "./completion-row";

export const FILL_MS = 120;
export const WAVE_MS = 300;
export const SQUASH_MS = 180;
export const DUST_MS = 600;
export const COLLAPSE_MS = 420;
export const GAP_OPEN_MS = 240;
export const UNSQUASH_MS = 180;
export const DRAIN_MS = 300;
export const SWIPE_OUT_MS = 180;
export const RETURN_WINDOW_MS = 1500;

export const SQUASH_SCALE = 0.55;
export const WAVE_OPACITY = 0.28;
export const SPRING_EASING = "cubic-bezier(0.22, 1.2, 0.36, 1)";
export const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

export interface PhaseStep {
  phase: CompletionPhase;
  at: number;
  duration: number;
}

function sequence(steps: [CompletionPhase, number][]): PhaseStep[] {
  let at = 0;
  return steps.map(([phase, duration]) => {
    const step = { phase, at, duration };
    at += duration;
    return step;
  });
}

export function completionSteps(): PhaseStep[] {
  return sequence([
    ["filling", FILL_MS],
    ["waving", WAVE_MS],
    ["squashing", SQUASH_MS],
    ["dusting", COLLAPSE_MS],
  ]);
}

export function stepsEnd(steps: PhaseStep[]): number {
  const last = steps.at(-1);
  return last ? last.at + last.duration : 0;
}

export function returningDuration(): number {
  return GAP_OPEN_MS + UNSQUASH_MS + DRAIN_MS;
}

export function deletionDuration(): number {
  return SWIPE_OUT_MS + COLLAPSE_MS;
}
