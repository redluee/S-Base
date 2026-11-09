import { type Static, t } from "elysia";

const maybe = <T extends Parameters<typeof t.Nullable>[0]>(schema: T) => t.Optional(t.Nullable(schema));

export const idParams = t.Object({ id: t.Numeric() });

export const templateExerciseInput = t.Object({
  exerciseName: t.String(),
  category: maybe(t.String()),
  sets: t.Optional(t.Number()),
  reps: maybe(t.Number()),
  weight: maybe(t.Number()),
  distance: maybe(t.Number()),
  duration: maybe(t.Number()),
  rpe: maybe(t.Number()),
  heartRate: maybe(t.Number()),
  defaultRestTime: maybe(t.Number()),
  equipment: maybe(t.String()),
  perSide: maybe(t.Number()),
  isAssisted: maybe(t.Number()),
});

const templateFields = {
  description: maybe(t.String()),
  targetMuscleGroups: maybe(t.String()),
  estimatedTime: maybe(t.Number()),
  exercises: maybe(t.Array(templateExerciseInput)),
};

export const templateCreateBody = t.Object({ name: t.String(), ...templateFields });
export const templateUpdateBody = t.Object({ name: t.Optional(t.String()), ...templateFields });

const sessionSetInput = t.Object({
  setId: maybe(t.Number()),
  setNumber: t.Number(),
  reps: maybe(t.Number()),
  weight: maybe(t.Number()),
  distance: maybe(t.Number()),
  duration: maybe(t.Number()),
  rpe: maybe(t.Number()),
  heartRate: maybe(t.Number()),
  completed: maybe(t.Number()),
  editedFields: maybe(t.String()),
});

const sessionExerciseInput = t.Object({
  sessionExerciseId: maybe(t.Number()),
  exerciseName: t.String(),
  sortOrder: t.Number(),
  category: maybe(t.String()),
  equipment: maybe(t.String()),
  perSide: maybe(t.Number()),
  isAssisted: maybe(t.Number()),
  restTime: maybe(t.Number()),
  sets: maybe(t.Array(sessionSetInput)),
});

export const sessionUpdateBody = t.Object({
  name: maybe(t.String()),
  notes: maybe(t.String()),
  completedAt: maybe(t.String()),
  pausedAt: maybe(t.String()),
  pausedSeconds: maybe(t.Number()),
  exercises: t.Optional(t.Array(sessionExerciseInput)),
});

export const sessionCreateBody = t.Optional(
  t.Nullable(t.Object({ templateId: maybe(t.Number()), force: maybe(t.Boolean()) })),
);

export const sessionCompleteBody = t.Optional(t.Nullable(t.Object({ completedAt: maybe(t.String()) })));

export const measurementFields = {
  height: maybe(t.Number()),
  weight: maybe(t.Number()),
  bodyFat: maybe(t.Number()),
  skeletalMuscle: maybe(t.Number()),
  fatMass: maybe(t.Number()),
  waist: maybe(t.Number()),
  chest: maybe(t.Number()),
  hips: maybe(t.Number()),
  biceps: maybe(t.Number()),
  thighs: maybe(t.Number()),
  shoulders: maybe(t.Number()),
  neck: maybe(t.Number()),
  calves: maybe(t.Number()),
};

export const measurementSaveBody = t.Object({ date: t.String(), ...measurementFields });
export const measurementUpdateBody = t.Object({ date: t.Optional(t.String()), ...measurementFields });

export type TemplateExerciseInput = Static<typeof templateExerciseInput>;
export type TemplateCreateInput = Static<typeof templateCreateBody>;
export type TemplateUpdateInput = Static<typeof templateUpdateBody>;
export type SessionUpdateInput = Static<typeof sessionUpdateBody>;
export type SessionSetInput = Static<typeof sessionSetInput>;
export type MeasurementSaveInput = Static<typeof measurementSaveBody>;
export type MeasurementUpdateInput = Static<typeof measurementUpdateBody>;
