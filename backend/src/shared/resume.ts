export interface StepRange {
  min: number;
  max: number;
  step: number;
}

export const COLUMN_WIDTH: StepRange = { min: 50, max: 80, step: 5 };
export const FONT_SCALE: StepRange = { min: 80, max: 140, step: 5 };
export const RESUME_SECTIONS_MAX = 5;

export const CURATED_FONT_IDS = [
  "carlito",
  "inter",
  "lato",
  "merriweather",
  "playfair-display",
  "source-serif",
  "space-grotesk",
  "epilogue",
] as const;
export type CuratedFontId = (typeof CURATED_FONT_IDS)[number];
export const GOOGLE_PREFIX = "google:";

export function snapToRange(value: number, range: StepRange): number {
  const snapped = Math.round(value / range.step) * range.step;
  return Math.min(range.max, Math.max(range.min, snapped));
}

export function isInRange(value: number, range: StepRange): boolean {
  return Number.isInteger(value) && value % range.step === 0 && value >= range.min && value <= range.max;
}
