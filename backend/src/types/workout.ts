import type { WorkoutMeasurements } from "../modules/workout/workout-measurements";
import type { WorkoutSessions } from "../modules/workout/workout-sessions";
import type { WorkoutTemplates } from "../modules/workout/workout-templates";

export type Measurement = ReturnType<WorkoutMeasurements["getById"]>;
export type MeasurementPhoto = Measurement["photos"][number];
export type WorkoutTemplate = ReturnType<WorkoutTemplates["list"]>[number];
export type FullWorkoutTemplate = ReturnType<WorkoutTemplates["get"]>;
export type TemplateExercise = FullWorkoutTemplate["exercises"][number];
export type WorkoutSession = ReturnType<WorkoutSessions["list"]>[number];
