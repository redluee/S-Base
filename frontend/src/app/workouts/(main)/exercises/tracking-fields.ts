export interface TrackingFields {
  reps: boolean;
  time: boolean;
  weight: boolean;
  distance: boolean;
}

export type TrackingField = keyof TrackingFields;

export function toggleTrackingField(fields: TrackingFields, field: TrackingField): TrackingFields {
  const next = { ...fields, [field]: !fields[field] };
  if (next[field]) {
    if (field === "reps") next.time = false;
    if (field === "time") next.reps = false;
  }
  return next;
}
