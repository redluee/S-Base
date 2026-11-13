import type { WorkoutMeasurements } from "../modules/workout/workout-measurements";

export type Measurement = ReturnType<WorkoutMeasurements["getById"]>;
export type MeasurementPhoto = Measurement["photos"][number];
