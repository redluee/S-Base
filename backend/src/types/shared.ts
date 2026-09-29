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
  sortOrder: number;
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
  isAssisted?: number | null;
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
  isAssisted?: number | null;
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
    isAssisted?: number | null;
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

export interface MinorDefaultQualityCriterion {
  text: string;
  indent?: number;
}

export interface MinorStoryType {
  id: number;
  userId: number;
  code: string;
  name: string;
  description: string | null;
  color: string | null;
  isDefault: boolean;
  defaultQualityCriteria?: MinorDefaultQualityCriterion[];
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

export interface MinorStoryPresentationImage {
  url: string;
  caption?: string;
}

export interface MinorStoryPresentationDocument {
  title: string;
  url: string;
}

export interface MinorStoryPresentationLink {
  url: string;
  title?: string;
  name?: string;
}

export interface MinorStoryPresentationData {
  enabled?: boolean;
  layout?: "auto" | "split" | "media" | "bullets" | "demo";
  bullets?: string[];
  listStyle?: "bullets" | "steps";
  summary?: string;
  demoUrl?: string;
  demoTitle?: string;
  images?: MinorStoryPresentationImage[];
  links?: MinorStoryPresentationLink[];
  websites?: MinorStoryPresentationLink[];
  documents?: MinorStoryPresentationDocument[];
  notes?: string;
}

export interface MinorStory {
  id: number;
  sprintId: number | null;
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
  presentationData?: MinorStoryPresentationData | null;
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
  status: "planned" | "active" | "completed";
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

export interface MinorSprintExportStory {
  storyTypeCode: string;
  storyNumber?: string | null;
  title: string;
  asA?: string | null;
  iWant?: string | null;
  soThat?: string | null;
  learningOutcomes: number[];
  status: "todo" | "in_progress" | "done";
  orderIndex?: number;
  presentationData?: MinorStoryPresentationData | null;
  acceptanceCriteria?: Array<{ text: string; isCompleted: boolean; indent?: number }>;
  qualityCriteria?: Array<{ text: string; isCompleted: boolean; indent?: number }>;
  evidence?: Array<{ type: "link" | "github" | "document" | "app"; title: string; url: string }>;
}

export interface MinorSprintExportData {
  version?: number;
  sprintNumber: string;
  name: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  showAndGrowDate: string;
  extendedDays?: number;
  extensionReason?: string | null;
  status: "planned" | "active" | "completed";
  stories: MinorSprintExportStory[];
  feedback?: Array<{ date: string; fromWhom: string; feedback: string; action: string; orderIndex?: number }>;
  selfEvaluations?: Array<{ learningOutcome: number; level: "V" | "NV" | "-"; argumentation?: string | null }>;
  teacherAssessments?: Array<{ learningOutcome: number; assessment: "V" | "O" | "-"; notes?: string | null; evaluatedAt?: string | null }>;
  reflection?: { date: string; whatLearned?: string | null; whatRetained?: string | null; whatChange?: string | null } | null;
}

export interface MinorSettings {
  userId: number;
  portfolioUrl: string | null;
  lastName: string | null;
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


export interface ResumeLink {
  label: string;
  url: string;
}

export interface ResumeProfile {
  fullName: string;
  headline: string;
  photoPath: string | null;
  photoShape: "circle" | "square";
  residence: string;
  phone: string;
  email: string;
  birthDate: string;
  drivingLicense: string;
  links: ResumeLink[];
  skills: string[];
  languages: string[];
  hobbies: string[];
}

export interface ResumePeriod {
  startMonth: number;
  startYear: number;
  endMonth: number | null;
  endYear: number | null;
  isCurrent: boolean;
}

export interface ResumeExperience extends ResumePeriod {
  id: number;
  company: string;
  place: string;
  jobTitle: string;
  description: string;
  logoPath: string | null;
}

export interface ResumeEducation extends ResumePeriod {
  id: number;
  institution: string;
  place: string;
  degree: string;
  description: string;
  logoPath: string | null;
}

export interface Resume {
  id: number;
  name: string;
  titleFont: string;
  textFont: string;
  accentColor: string;
  leftWidthPct: number;
  swapColumns: boolean;
  titleScalePct: number;
  textScalePct: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeItemInput {
  kind: "experience" | "education";
  refId: number;
  descriptionOverride?: string | null;
}

export interface ResumeEntry extends ResumePeriod {
  kind: "experience" | "education";
  refId: number;
  title: string;
  organization: string;
  place: string;
  description: string;
  hasDescriptionOverride: boolean;
  logoPath: string | null;
}

export interface ResumeFull {
  resume: Resume;
  profile: ResumeProfile;
  experiences: ResumeEntry[];
  educations: ResumeEntry[];
  selected: ResumeItemInput[];
}

export interface ResumeGoogleFont {
  family: string;
  regularUrl: string;
  boldUrl: string;
}
