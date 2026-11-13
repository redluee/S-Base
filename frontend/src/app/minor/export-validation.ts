import type { MinorSprintFull } from "@/lib/api";
import { today } from "@backend/shared/dates";
import { isSprintFinished, LEARNING_OUTCOMES } from "@backend/shared/minor";

const filled = (value: string | null | undefined) => Boolean(value?.trim());

export function validateSprintForExport(sprint: MinorSprintFull, onDate: string = today()): string[] {
  const issues: string[] = [];
  const stories = sprint.stories ?? [];
  if (stories.length === 0) {
    issues.push("Geen user stories aanwezig in deze sprint");
  } else {
    const open = stories.filter((s) => s.status !== "done").length;
    if (open > 0) issues.push(`Niet alle stories zijn voltooid (${open} story/stories staan nog niet op status done)`);
  }

  if (!(sprint.feedback ?? []).some((f) => filled(f.feedback) && filled(f.fromWhom))) {
    issues.push("Minimaal 1 feedbackpunt van een medeleerling ontbreekt");
  }

  const missing = LEARNING_OUTCOMES.filter((lu) => {
    const evaluation = sprint.selfEvaluations?.find((e) => e.learningOutcome === lu);
    return !evaluation || evaluation.level === "-" || !filled(evaluation.argumentation);
  });
  if (missing.length > 0) {
    issues.push(`Niet alle zelfevaluatievelden (niveau en toelichting) zijn ingevuld voor LU ${missing.join(", ")}`);
  }

  const reflection = sprint.reflection;
  if (
    isSprintFinished(sprint, onDate) &&
    !(filled(reflection?.whatLearned) && filled(reflection?.whatRetained) && filled(reflection?.whatChange))
  ) {
    issues.push("Sprintreflectie is nog niet volledig ingevuld (wat geleerd, wat vasthouden, wat veranderen)");
  }
  return issues;
}
