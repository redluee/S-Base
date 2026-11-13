import { ModuleShell } from "@/components/module-shell";
import { WorkoutSearchBar } from "@/app/workouts/workout-search";

export default function WorkoutsLayout({ children }: { children: React.ReactNode }) {
  return <ModuleShell module="workout" search={<WorkoutSearchBar />}>{children}</ModuleShell>;
}
