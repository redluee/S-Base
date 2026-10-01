export interface TemplateMetaForm {
  name: string;
  description: string;
  targetMuscleGroups: string;
  estimatedTime: string;
}

export function buildTemplateMeta(form: TemplateMetaForm) {
  const estimated = form.estimatedTime.trim();
  return {
    name: form.name,
    description: form.description.trim() ? form.description : null,
    targetMuscleGroups: form.targetMuscleGroups.trim() ? form.targetMuscleGroups : null,
    estimatedTime: estimated ? Number(estimated) : null,
  };
}
