import {
  isLearningOutcome,
  LEARNING_OUTCOME_TARGETS,
  LEARNING_OUTCOMES,
  TOTAL_REQUIRED_PASSES,
  type LearningOutcome,
} from "@backend/shared/minor";

export { LEARNING_OUTCOMES, TOTAL_REQUIRED_PASSES };

export const LEARNING_OUTCOME_INFO: Record<
  LearningOutcome,
  { short: string; label: string; name: string; target: number }
> = {
  1: { short: "Impact", label: "LU 1: Impact", name: "AI-impact op de beroepspraktijk analyseren en evalueren", target: LEARNING_OUTCOME_TARGETS[1] },
  2: {
    short: "Realisatie",
    label: "LU 2: Oplossing",
    name: "Praktijkgerichte AI oplossing ontwerpen, realiseren en presenteren",
    target: LEARNING_OUTCOME_TARGETS[2],
  },
  3: { short: "Ethiek & regelgeving", label: "LU 3: Ethiek", name: "Ethiek en verantwoordelijk AI-gebruik beoordelen", target: LEARNING_OUTCOME_TARGETS[3] },
  4: { short: "Tools & technieken", label: "LU 4: Tools", name: "AI Tools en technieken gebruiken", target: LEARNING_OUTCOME_TARGETS[4] },
  5: { short: "Zelfstandig werken", label: "LU 5: Zelfsturing", name: "Zelfstandig en zelfsturend werken", target: LEARNING_OUTCOME_TARGETS[5] },
};

export const SPRINT_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export function learningOutcomeShort(lu: number): string {
  return isLearningOutcome(lu) ? LEARNING_OUTCOME_INFO[lu].short : "";
}
