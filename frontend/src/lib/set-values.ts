export type SetValueField = "reps" | "weight" | "distance" | "duration" | "rpe" | "heartRate";

export interface EditableSet {
  completed?: number | null;
  reps?: number | null;
  weight?: number | null;
  distance?: number | null;
  duration?: number | null;
  rpe?: number | null;
  heartRate?: number | null;
}

export function applySetUpdate<T extends EditableSet>(
  sets: T[],
  setIndex: number,
  field: SetValueField,
  value: number | null,
  isTouched: (index: number) => boolean = () => false
): T[] {
  const previous = sets[setIndex]?.[field] ?? null;
  return sets.map((set, i) => {
    if (i === setIndex) return { ...set, [field]: value };
    if (i < setIndex || set.completed === 1 || isTouched(i)) return set;
    const current = set[field] ?? null;
    if (current === null || current === previous) return { ...set, [field]: value };
    return set;
  });
}

export function isUntouchedDefault(
  set: EditableSet,
  field: SetValueField,
  target: number | null | undefined
): boolean {
  if (set.completed === 1) return false;
  const current = set[field];
  if (current === null || current === undefined) return false;
  return target !== null && target !== undefined && current === target;
}
