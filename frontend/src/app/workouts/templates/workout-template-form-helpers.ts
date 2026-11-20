/* eslint-disable @typescript-eslint/no-explicit-any */
import { buildTemplateMeta, type TemplateMetaForm } from "@/app/workouts/templates/template-payload";
import { parseDecimal, toInputString } from "@/app/workouts/number-input";
import { t } from "@/lib/lang";
import { DEFAULT_CATEGORY, DEFAULT_REPS, DEFAULT_REST_SECONDS, DEFAULT_SETS, normalizeCategory, normalizeEquipment, type ExerciseCategory } from "@backend/shared/workout";
import { defaultTracking, type TrackingFields } from "@/app/workouts/(main)/exercises/tracking-fields";
import { formatClockInput, parseClock } from "@/app/workouts/duration";

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



export function getInitialTracking(e: any, category: ExerciseCategory): TrackingFields {
  const defaults = defaultTracking(category);
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
    category: DEFAULT_CATEGORY,
    sets: String(DEFAULT_SETS),
    reps: String(DEFAULT_REPS),
    weight: "",
    distance: "",
    distanceUnit: "km",
    duration: "",
    heartRate: "",
    rpe: "",
    defaultRestTime: formatClockInput(DEFAULT_REST_SECONDS),
    equipment: "",
    perSide: false,
    isAssisted: false,
    trackingFields: { reps: true, time: false, weight: true, distance: false },
  };
}

export function buildInitialExercises(initial: any): ExerciseRow[] {
  return (
    initial?.exercises?.map((e: any, i: number) => {
      const cat = normalizeCategory(e.category);
      return {
        id: `ex-${i}`,
        name: e.exerciseName,
        category: cat,
        sets: e.defaultSets?.toString() || String(DEFAULT_SETS),
        reps: e.defaultReps?.toString() ?? String(DEFAULT_REPS),
        weight: e.defaultWeight != null ? toInputString(Math.abs(e.defaultWeight)) : "",
        distance: toInputString(e.defaultDistance),
        distanceUnit: "km",
        duration: formatClockInput(e.defaultDuration),
        heartRate: e.defaultHeartRate?.toString() ?? "",
        rpe: e.defaultRpe?.toString() ?? "",
        defaultRestTime: formatClockInput(e.defaultRestTime ?? DEFAULT_REST_SECONDS),
        equipment: normalizeEquipment(e.equipment) ?? "",
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
  meta: TemplateMetaForm,
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
            duration: ex.trackingFields.time ? (parseClock(ex.duration) ?? null) : null,
            heartRate: parsedHeartRate !== null ? parsedHeartRate : undefined,
            rpe: parsedRpe !== null ? parsedRpe : undefined,
            defaultRestTime: parseClock(ex.defaultRestTime) ?? DEFAULT_REST_SECONDS,
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
