export const TEMPLATE_DRAFT_VERSION = 2;

export interface TemplateDraftForm<E extends { id: string }> {
  name: string;
  description: string;
  targetMuscleGroups: string;
  estimatedTime: string;
  exercises: E[];
}

export interface TemplateDraft<E extends { id: string }> {
  version: number;
  savedAt: number;
  baseSignature: string;
  form: TemplateDraftForm<E>;
}

export function hashString(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

export function formSignature<E extends { id: string }>(form: TemplateDraftForm<E>): string {
  return hashString(
    JSON.stringify({
      name: form.name,
      description: form.description,
      targetMuscleGroups: form.targetMuscleGroups,
      estimatedTime: form.estimatedTime,
      exercises: form.exercises.map((ex) => {
        const rest: Record<string, unknown> = { ...ex };
        delete rest.id;
        return rest;
      }),
    })
  );
}

export function shouldPersistDraft<E extends { id: string }>(
  form: TemplateDraftForm<E>,
  baseSignature: string
): boolean {
  return formSignature(form) !== baseSignature;
}

export function buildDraft<E extends { id: string }>(
  form: TemplateDraftForm<E>,
  baseSignature: string,
  now = Date.now()
): TemplateDraft<E> {
  return { version: TEMPLATE_DRAFT_VERSION, savedAt: now, baseSignature, form };
}

export function parseDraft<E extends { id: string }>(raw: string | null): TemplateDraft<E> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const form = parsed.version === TEMPLATE_DRAFT_VERSION ? parsed.form : parsed;
    if (!form || typeof form !== "object") return null;
    const exercises = Array.isArray(form.exercises) ? form.exercises : [];
    return {
      version: TEMPLATE_DRAFT_VERSION,
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : 0,
      baseSignature: parsed.version === TEMPLATE_DRAFT_VERSION && typeof parsed.baseSignature === "string" ? parsed.baseSignature : "",
      form: {
        name: typeof form.name === "string" ? form.name : "",
        description: typeof form.description === "string" ? form.description : "",
        targetMuscleGroups: typeof form.targetMuscleGroups === "string" ? form.targetMuscleGroups : "",
        estimatedTime: typeof form.estimatedTime === "string" ? form.estimatedTime : "",
        exercises: exercises as E[],
      },
    };
  } catch {
    return null;
  }
}

export type DraftStatus = "fresh" | "stale" | "unchanged";

export function evaluateDraft<E extends { id: string }>(
  draft: TemplateDraft<E>,
  currentBaseSignature: string
): DraftStatus {
  if (formSignature(draft.form) === currentBaseSignature) return "unchanged";
  return draft.baseSignature === currentBaseSignature ? "fresh" : "stale";
}
