import { WorkoutExercises } from "./workout-exercises";
import { WorkoutMeasurements } from "./workout-measurements";
import { WorkoutSessions } from "./workout-sessions";
import { WorkoutStats } from "./workout-stats";
import { WorkoutSuggestions } from "./workout-suggestions";
import { WorkoutTemplates } from "./workout-templates";

export class WorkoutService {
  readonly templates = new WorkoutTemplates();
  readonly sessions = new WorkoutSessions(this.templates);
  readonly exercises = new WorkoutExercises();
  readonly stats = new WorkoutStats();
  readonly suggestions = new WorkoutSuggestions();
  readonly measurements = new WorkoutMeasurements();
}
