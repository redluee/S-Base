import type { MinorSprintFull } from "@/lib/api";
import {
  draftArgumentation,
  learningOutcomeLevel,
  noStoriesArgumentation,
  type LearningOutcomeLevel,
} from "@backend/shared/minor";
import { LEARNING_OUTCOME_INFO, LEARNING_OUTCOMES, SPRINT_NUMBERS } from "../learning-outcomes";

export const LU_MASTER_DEFINITIONS = LEARNING_OUTCOMES.map((lu) => ({ lu, ...LEARNING_OUTCOME_INFO[lu] }));

export function findSprintByNumber(sprints: MinorSprintFull[], targetNum: number): MinorSprintFull | undefined {
  return sprints.find((s) => {
    const rawNum = s.sprintNumber ? parseInt(s.sprintNumber.replace(/\D/g, ""), 10) : NaN;
    if (!isNaN(rawNum) && rawNum === targetNum) return true;
    const nameNum = s.name ? parseInt(s.name.replace(/\D/g, ""), 10) : NaN;
    return !isNaN(nameNum) && nameNum === targetNum;
  });
}

export function resolveSprintLuLevel(sprint: MinorSprintFull | undefined, lu: number): LearningOutcomeLevel {
  if (!sprint) return "-";
  return learningOutcomeLevel(
    sprint.selfEvaluations?.find((e) => e.learningOutcome === lu)?.level,
    sprint.teacherAssessments?.find((a) => a.learningOutcome === lu)?.assessment,
  );
}

export function resolveSprintLuArgumentation(sprint: MinorSprintFull | undefined, lu: number): string {
  if (!sprint) return "";
  const stored = sprint.selfEvaluations?.find((e) => e.learningOutcome === lu)?.argumentation?.trim() ?? "";
  if (stored && stored !== noStoriesArgumentation(lu)) return stored;
  return draftArgumentation(lu, sprint.stories ?? []) ?? stored;
}

export function luLevelGrid(sprints: MinorSprintFull[]): Record<number, Record<number, LearningOutcomeLevel>> {
  return Object.fromEntries(
    SPRINT_NUMBERS.map((sprintNumber) => {
      const sprint = findSprintByNumber(sprints, sprintNumber);
      return [sprintNumber, Object.fromEntries(LEARNING_OUTCOMES.map((lu) => [lu, resolveSprintLuLevel(sprint, lu)]))];
    }),
  );
}
