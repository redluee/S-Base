import { QUICK_START_ICON, isWorkoutIcon, type WorkoutIcon } from "@backend/shared/workout";

const ICON_KEYWORDS: Array<[WorkoutIcon, string[]]> = [
  ["flower", ["mobility", "mobiliteit", "stretch", "yoga", "flex"]],
  ["heart-pulse", ["cardio", "run", "hardlo", "conditie"]],
  ["bike", ["fiets", "bike", "cycl"]],
  ["footprints", ["leg", "been", "benen", "lower", "onder", "squat", "glute", "bil", "kuit", "calf"]],
  ["person", ["back", "rug", "pull", "trek"]],
  ["biceps", ["bicep", "arm"]],
  ["dumbbell", ["upper", "boven", "chest", "borst", "push", "schouder", "shoulder", "tricep"]],
];

export function guessWorkoutIcon(name: string, muscleGroups?: string | null): WorkoutIcon {
  const haystack = `${name} ${muscleGroups ?? ""}`.toLowerCase();
  for (const [icon, words] of ICON_KEYWORDS) {
    if (words.some((word) => haystack.includes(word))) return icon;
  }
  return "flame";
}

export function templateIcon(template: { icon?: string | null; name: string; targetMuscleGroups?: string | null }) {
  return isWorkoutIcon(template.icon) ? template.icon : guessWorkoutIcon(template.name, template.targetMuscleGroups);
}

export function sessionIcon(session: { templateId: number | null; templateIcon?: string | null; name?: string | null }) {
  if (session.templateId == null) return QUICK_START_ICON;
  return isWorkoutIcon(session.templateIcon) ? session.templateIcon : guessWorkoutIcon(session.name ?? "");
}

export function splitMuscleGroups(value?: string | null): string[] {
  if (!value) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of value.split(",")) {
    const label = part.trim();
    const key = label.toLowerCase();
    if (!label || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}
