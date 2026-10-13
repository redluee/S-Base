/* eslint-disable @typescript-eslint/no-explicit-any */
import { buildTemplateMeta } from "@/lib/template-payload";
import { parseDecimal, toInputString } from "@/lib/number-input";
import { t } from "@/lib/lang";

export function mapCategory(cat: string) {
  if (cat === "resistance") return "Free Weights";
  if (cat === "bodyweight") return "Bodyweight";
  if (cat === "cardio") return "Cardio";
  if (cat === "isometric") return "Functional";
  return cat || "Free Weights";
}

export function mapEquipment(eq: string) {
  if (eq === "none") return "Bodyweight";
  if (eq === "barbell") return "Barbell";
  if (eq === "dumbbell") return "Dumbbell";
  if (eq === "kettlebell") return "Kettlebell";
  if (eq === "cable") return "Cable";
  if (eq === "machine") return "Machine";
  if (eq === "band") return "Resistance Band";
  if (eq === "ball" || eq === "bal") return "Medicine Ball";
  return eq || "Dumbbell";
}

export interface TrackingFields {
  reps: boolean;
  time: boolean;
  weight: boolean;
  distance: boolean;
}

export interface ExerciseRow {
  id: string;
  name: string;
  category: string;
  sets: string;
  reps: string;
  weight: string;
  distance: string;
  distanceUnit: string;
  duration: string;
  heartRate: string;
  rpe: string;
  defaultRestTime: string;
  equipment: string;
  perSide: boolean;
  isAssisted: boolean;
  trackingFields: TrackingFields;
}

export function parseDuration(val: string): number | undefined {
  if (!val || !val.trim()) return undefined;
  if (val.includes(":")) {
    const parts = val.split(":");
    const min = parseInt(parts[0], 10) || 0;
    const sec = parseInt(parts[1], 10) || 0;
    return min * 60 + sec;
  }
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? undefined : parsed;
}

export function formatDuration(secVal: number | null | undefined): string {
  if (secVal === null || secVal === undefined) return "";
  const min = Math.floor(secVal / 60);
  const sec = secVal % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function getDefaultTracking(category: string): TrackingFields {
  if (category === "Cardio") return { reps: false, time: true, weight: false, distance: true };
  if (category === "Functional") return { reps: true, time: false, weight: true, distance: false };
  return { reps: true, time: false, weight: true, distance: false };
}

export function getInitialTracking(e: any, category: string): TrackingFields {
  const defaults = getDefaultTracking(category);
  if (!e) return defaults;
  
  return {
    reps: (e.defaultReps !== null && e.defaultReps > 0) ? true : (e.defaultReps === 0 ? false : defaults.reps),
    time: (e.defaultDuration !== null && e.defaultDuration > 0) ? true : defaults.time,
    weight: (e.defaultWeight !== null && e.defaultWeight !== undefined) ? true : defaults.weight,
    distance: (e.defaultDistance !== null && e.defaultDistance > 0) ? true : defaults.distance,
  };
}

export function createBlankExercise(id: string): ExerciseRow {
  return {
    id,
    name: "",
    category: "Free Weights",
    sets: "3",
    reps: "8",
    weight: "",
    distance: "",
    distanceUnit: "km",
    duration: "",
    heartRate: "",
    rpe: "",
    defaultRestTime: "01:30",
    equipment: "",
    perSide: false,
    isAssisted: false,
    trackingFields: { reps: true, time: false, weight: true, distance: false },
  };
}

export function buildInitialExercises(initial: any): ExerciseRow[] {
  return (
    initial?.exercises?.map((e: any, i: number) => {
      const cat = mapCategory(e.category);
      return {
        id: `ex-${i}`,
        name: e.exerciseName,
        category: cat,
        sets: e.defaultSets?.toString() || "3",
        reps: e.defaultReps?.toString() ?? "8",
        weight: e.defaultWeight != null ? toInputString(Math.abs(e.defaultWeight)) : "",
        distance: toInputString(e.defaultDistance),
        distanceUnit: "km",
        duration: formatDuration(e.defaultDuration),
        heartRate: e.defaultHeartRate?.toString() ?? "",
        rpe: e.defaultRpe?.toString() ?? "",
        defaultRestTime: formatDuration(e.defaultRestTime ?? 90),
        equipment: mapEquipment(e.equipment),
        perSide: Boolean(e.perSide),
        isAssisted: Boolean(e.isAssisted),
        trackingFields: getInitialTracking(e, cat),
      };
    }) ?? [createBlankExercise("ex-0")]
  );
}

export function validateTemplate(name: string, exercises: ExerciseRow[]): Record<string, string> {
  const newErrors: Record<string, string> = {};

  if (!name.trim()) {
    newErrors.name = t("Template name is required.");
  }

  exercises.forEach((ex) => {
    if (ex.name.trim()) {
      if (!ex.sets.trim() || isNaN(Number(ex.sets)) || Number(ex.sets) < 1) {
        newErrors[`${ex.id}-sets`] = t("Sets must be at least 1.");
      }
      if (ex.trackingFields.reps) {
        if (!ex.reps.trim() || isNaN(Number(ex.reps)) || Number(ex.reps) < 0) {
          newErrors[`${ex.id}-reps`] = t("Reps must be a valid number.");
        }
      }
    }
  });
  return newErrors;
}

export function buildTemplatePayload(
  meta: { name: string; description: string; targetMuscleGroups: string; estimatedTime: string },
  exercises: ExerciseRow[]
) {
  return {
    ...buildTemplateMeta(meta),
    exercises: exercises
        .filter((ex) => ex.name.trim())
        .map((ex) => {
          const parsedWeight = parseDecimal(ex.weight);
          const parsedRpe = parseDecimal(ex.rpe);
          const parsedHeartRate = parseDecimal(ex.heartRate);
          let dist = parseDecimal(ex.distance) ?? undefined;
          if (dist !== undefined && ex.distanceUnit === "m") {
            dist = dist / 1000;
          }

          return {
            exerciseName: ex.name.trim(),
            category: ex.category,
            sets: Number(ex.sets),
            reps: ex.trackingFields.reps ? Number(ex.reps) : 0,
            weight: (ex.trackingFields.weight && parsedWeight !== null)
              ? (ex.isAssisted ? -Math.abs(parsedWeight) : Math.abs(parsedWeight))
              : null,
            distance: (ex.trackingFields.distance && dist) ? dist : null,
            duration: ex.trackingFields.time ? (parseDuration(ex.duration) ?? null) : null,
            heartRate: parsedHeartRate !== null ? parsedHeartRate : undefined,
            rpe: parsedRpe !== null ? parsedRpe : undefined,
            defaultRestTime: parseDuration(ex.defaultRestTime) ?? 90,
            equipment: ex.equipment || "none",
            perSide: ex.perSide ? 1 : 0,
            isAssisted: ex.isAssisted ? 1 : 0,
          };
        }),
    };
}

export function scrollToExercise(movedId: string) {
  setTimeout(() => {
    const el =
      document.getElementById(`template-exercise-${movedId}`) ||
      document.querySelector(`[data-exercise-id="${movedId}"]`);
    if (el) {
      const rect = el.getBoundingClientRect();
      const isVeryTall = rect.height > window.innerHeight * 0.75;
      el.scrollIntoView({
        behavior: "smooth",
        block: isVeryTall ? "start" : "center",
      });
    }
  }, 60);
}
