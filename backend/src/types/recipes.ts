import type { RecipeWines } from "../modules/recipes/recipes-wines";
import type { WorkoutMeasurements } from "../modules/workout/workout-measurements";

export type Wine = ReturnType<RecipeWines["getById"]>;
export type Measurement = ReturnType<WorkoutMeasurements["getById"]>;
export type MeasurementPhoto = Measurement["photos"][number];
