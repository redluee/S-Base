export interface Recipe {
  recipeId: number;
  name: string;
  cookingTime: number | null;
  kitchen: string | null;
  status: string;
  description: string | null;
  rating: number | null;
  createdAt: string;
}

export interface RecipeIngredient {
  ingredientId: number;
  name: string;
  quantity: number;
  unit: string | null;
  isOptional: boolean;
}

export interface RecipeStep {
  stepId: number;
  stepNumber: number;
  description: string;
}

export interface FullRecipe extends Recipe {
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
}

export interface WorkoutTemplate {
  templateId: number;
  userId: number;
  name: string;
  description: string | null;
  targetMuscleGroups: string | null;
  estimatedTime: number | null;
  createdAt: string;
}

export interface TemplateExercise {
  templateExerciseId: number;
  templateId: number;
  exerciseName: string;
  sortOrder: number;
  category: string;
  defaultSets: number;
  defaultReps: number;
  defaultWeight: number | null;
  defaultDistance: number | null;
  defaultDuration: number | null;
  defaultRpe: number | null;
  defaultHeartRate: number | null;
  defaultRestTime: number | null;
  equipment: string | null;
  perSide?: number | null;
}

export interface FullWorkoutTemplate extends WorkoutTemplate {
  exercises: TemplateExercise[];
}

export interface WorkoutSession {
  sessionId: number;
  templateId: number | null;
  userId: number;
  startedAt: string;
  completedAt: string | null;
  notes: string | null;
  name: string | null;
}

export interface SessionSet {
  setId?: number;
  sessionExerciseId?: number;
  setNumber: number;
  reps?: number | null;
  weight?: number | null;
  distance?: number | null;
  duration?: number | null;
  rpe?: number | null;
  heartRate?: number | null;
  completed: number;
}

export interface SessionExercise {
  sessionExerciseId?: number;
  sessionId?: number;
  exerciseName: string;
  sortOrder: number;
  category?: string;
  equipment?: string | null;
  perSide?: number | null;
  sets: SessionSet[];
  templateExercise?: {
    defaultReps?: number | null;
    defaultWeight?: number | null;
    defaultDistance?: number | null;
    defaultDuration?: number | null;
    defaultRpe?: number | null;
    defaultHeartRate?: number | null;
    defaultRestTime?: number | null;
    equipment?: string | null;
    perSide?: number | null;
  } | null;
}

export interface FullWorkoutSession extends WorkoutSession {
  exercises: SessionExercise[];
}

export interface PersonalRecord {
  type: 'weight' | 'reps' | 'sets' | 'volume' | 'distance' | 'duration' | 'session_volume' | 'session_duration' | 'session_exercises';
  exerciseName?: string;
  prevValue: number;
  newValue: number;
  unit: string;
}

