import {
  Activity,
  BatteryCharging,
  BicepsFlexed,
  Bike,
  Crown,
  Dumbbell,
  Flame,
  Flower2,
  Footprints,
  Gauge,
  HeartPulse,
  Hourglass,
  Medal,
  Moon,
  Mountain,
  PersonStanding,
  Repeat,
  Rocket,
  Shield,
  Snowflake,
  Sun,
  Swords,
  Target,
  Timer,
  Trophy,
  Volleyball,
  Waves,
  Weight,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { WorkoutIcon as WorkoutIconKey } from "@backend/shared/workout";
import { cn } from "@/lib/utils";

export const WORKOUT_ICON_COMPONENTS: Record<WorkoutIconKey, LucideIcon> = {
  dumbbell: Dumbbell,
  biceps: BicepsFlexed,
  weight: Weight,
  person: PersonStanding,
  footprints: Footprints,
  snowflake: Snowflake,
  flower: Flower2,
  activity: Activity,
  "heart-pulse": HeartPulse,
  zap: Zap,
  flame: Flame,
  bike: Bike,
  waves: Waves,
  mountain: Mountain,
  timer: Timer,
  hourglass: Hourglass,
  gauge: Gauge,
  repeat: Repeat,
  target: Target,
  trophy: Trophy,
  medal: Medal,
  crown: Crown,
  rocket: Rocket,
  shield: Shield,
  swords: Swords,
  volleyball: Volleyball,
  sun: Sun,
  moon: Moon,
  wind: Wind,
  "battery-charging": BatteryCharging,
};

export function WorkoutIcon({ icon, className }: { icon: WorkoutIconKey; className?: string }) {
  const Icon = WORKOUT_ICON_COMPONENTS[icon];
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-brand", className)}
    >
      <Icon className="size-[45%]" strokeWidth={1.75} />
    </span>
  );
}
