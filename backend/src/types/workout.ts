import type { WorkoutExercises } from "../modules/workout/workout-exercises";
import type { WorkoutMeasurements } from "../modules/workout/workout-measurements";
import type { WorkoutSessions } from "../modules/workout/workout-sessions";
import type { WorkoutStats } from "../modules/workout/workout-stats";
import type { WorkoutSuggestions } from "../modules/workout/workout-suggestions";
import type { WorkoutTemplates } from "../modules/workout/workout-templates";

export type Measurement = ReturnType<WorkoutMeasurements["getById"]>;
export type MeasurementPhoto = Measurement["photos"][number];
export type WorkoutTemplate = ReturnType<WorkoutTemplates["list"]>[number];
export type FullWorkoutTemplate = ReturnType<WorkoutTemplates["get"]>;
export type WorkoutSession = ReturnType<WorkoutSessions["list"]>[number];
export type ExerciseListItem = ReturnType<WorkoutExercises["list"]>[number];
export type ExerciseProgressData = ReturnType<WorkoutExercises["progress"]>;
export type ExerciseProgressSession = ExerciseProgressData["sessions"][number];
export type ExerciseProgressSet = ExerciseProgressSession["sets"][number];
export type ExerciseSuggestion = ReturnType<WorkoutSuggestions["exercises"]>[number];
export type SearchSuggestion = ReturnType<WorkoutSuggestions["search"]>[number];
export type WorkoutStatsSummary = ReturnType<WorkoutStats["summary"]>;
