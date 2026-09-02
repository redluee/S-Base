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
  exerciseCount?: number;
  completedSetsCount?: number;
  totalSetsCount?: number;
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

export interface MinorVacation {
  id: number;
  userId: number;
  name: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface MinorStoryType {
  id: number;
  userId: number;
  code: string;
  name: string;
  description: string | null;
  color: string | null;
  isDefault: boolean;
  createdAt: string;
}

export interface MinorStoryCriterion {
  id: number;
  storyId: number;
  type: "acceptance" | "quality";
  orderIndex: number;
  indent?: number;
  text: string;
  isCompleted: boolean;
}

export interface MinorStoryEvidence {
  id: number;
  storyId: number;
  type: "link" | "github" | "document" | "app";
  title: string;
  url: string;
  createdAt: string;
}

export interface MinorStory {
  id: number;
  sprintId: number;
  userId: number;
  storyTypeCode: string;
  storyNumber: string | null;
  title: string;
  asA: string | null;
  iWant: string | null;
  soThat: string | null;
  learningOutcomes: number[];
  status: "todo" | "in_progress" | "done";
  orderIndex: number;
  createdAt: string;
  criteria?: MinorStoryCriterion[];
  evidence?: MinorStoryEvidence[];
}

export interface MinorStoryWithSprint extends MinorStory {
  sprintNumber?: string;
  sprintName?: string;
  sprintStatus?: string;
}

export interface MinorSelfEvaluation {
  id: number;
  sprintId: number;
  learningOutcome: number;
  level: "V" | "NV" | "-";
  argumentation: string | null;
  updatedAt: string;
}

export interface MinorTeacherAssessment {
  id: number;
  sprintId: number;
  learningOutcome: number;
  assessment: "V" | "O" | "-";
  notes: string | null;
  evaluatedAt: string | null;
}

export interface MinorFeedbackEntry {
  id: number;
  sprintId: number;
  date: string;
  fromWhom: string;
  feedback: string;
  action: string;
  orderIndex: number;
  createdAt: string;
}

export interface MinorReflection {
  id: number;
  sprintId: number;
  date: string;
  whatLearned: string | null;
  whatRetained: string | null;
  whatChange: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MinorSprint {
  id: number;
  userId: number;
  sprintNumber: string;
  name: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  showAndGrowDate: string;
  extendedDays: number;
  extensionReason: string | null;
  status: "planned" | "active" | "completed" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface MinorSprintFull extends MinorSprint {
  stories: MinorStory[];
  selfEvaluations: MinorSelfEvaluation[];
  teacherAssessments: MinorTeacherAssessment[];
  feedback: MinorFeedbackEntry[];
  reflection: MinorReflection | null;
}

export interface MinorPeerHelp {
  id: number;
  userId: number;
  sprintId: number | null;
  date: string;
  peerName: string;
  description: string;
  links: string | null;
  createdAt: string;
}

export interface MinorDashboardStats {
  activeSprint: MinorSprint | null;
  nextShowAndGrowDate: string | null;
  daysUntilShowAndGrow: number | null;
  officialPasses: Record<number, number>;
  projectedPasses: Record<number, number>;
  totalSprints: number;
  activeSprintWarnings: {
    fewLearningOutcomes: boolean;
    missingLU5: boolean;
    uniqueLUsCount: number;
  } | null;
  recentPeerHelp: MinorPeerHelp[];
}

