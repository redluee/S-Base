import type { MinorSprintFull } from "@/lib/api";

export const LU_MASTER_DEFINITIONS: Array<{
  lu: number;
  label: string;
  name: string;
  target: number;
}> = [
  {
    lu: 1,
    label: "LU 1: Impact",
    name: "AI-impact op de beroepspraktijk analyseren en evalueren",
    target: 2,
  },
  {
    lu: 2,
    label: "LU 2: Oplossing",
    name: "Praktijkgerichte AI oplossing ontwerpen, realiseren en presenteren",
    target: 4,
  },
  {
    lu: 3,
    label: "LU 3: Ethiek",
    name: "Ethiek en verantwoordelijk AI-gebruik beoordelen",
    target: 2,
  },
  {
    lu: 4,
    label: "LU 4: Tools",
    name: "AI Tools en technieken gebruiken",
    target: 4,
  },
  {
    lu: 5,
    label: "LU 5: Zelfsturing",
    name: "Zelfstandig en zelfsturend werken",
    target: 6,
  },
];

export function findSprintByNumber(sprints: MinorSprintFull[], targetNum: number): MinorSprintFull | undefined {
  return sprints.find((s) => {
    const rawNum = s.sprintNumber ? parseInt(s.sprintNumber.replace(/\D/g, ""), 10) : NaN;
    if (!isNaN(rawNum) && rawNum === targetNum) return true;
    const nameNum = s.name ? parseInt(s.name.replace(/\D/g, ""), 10) : NaN;
    if (!isNaN(nameNum) && nameNum === targetNum) return true;
    return false;
  });
}

export function isLuRealizedInSprint(sprint: MinorSprintFull | undefined, lu: number): boolean {
  if (!sprint || !Array.isArray(sprint.stories)) return false;
  return sprint.stories.some(
    (s) => s.status === "done" && Array.isArray(s.learningOutcomes) && s.learningOutcomes.some((o: number | string) => Number(o) === lu)
  );
}

export function isLuSelectedInSprint(sprint: MinorSprintFull | undefined, lu: number): boolean {
  if (!sprint || !Array.isArray(sprint.stories)) return false;
  return sprint.stories.some(
    (s) => Array.isArray(s.learningOutcomes) && s.learningOutcomes.some((o: number | string) => Number(o) === lu)
  );
}

export function resolveSprintLuLevel(sprint: MinorSprintFull | undefined, lu: number): string {
  if (!sprint) return "-";
  const evalItem = sprint.selfEvaluations?.find((e) => e.learningOutcome === lu);
  const teacherItem = sprint.teacherAssessments?.find((a) => a.learningOutcome === lu);

  if (teacherItem?.assessment?.trim().toUpperCase() === "V" || evalItem?.level?.trim().toUpperCase() === "V") {
    return "V";
  }

  const rawLevel = evalItem?.level?.trim().toUpperCase();
  const rawTeacher = teacherItem?.assessment?.trim().toUpperCase();
  if (rawLevel === "NV" || rawLevel === "O" || rawTeacher === "O") {
    return "O";
  }

  if (isLuRealizedInSprint(sprint, lu)) {
    return "V";
  }

  if (!isLuSelectedInSprint(sprint, lu)) {
    return "O";
  }

  return "-";
}

export function resolveSprintLuArgumentation(sprint: MinorSprintFull | undefined, lu: number): string {
  if (!sprint) return "";
  const evalItem = sprint.selfEvaluations?.find((e) => e.learningOutcome === lu);
  if (evalItem?.argumentation && evalItem.argumentation.trim() !== "" && !evalItem.argumentation.trim().startsWith("Geen stories")) {
    return evalItem.argumentation.trim();
  }

  if (Array.isArray(sprint.stories)) {
    const storiesForLu = sprint.stories.filter((s) => Array.isArray(s.learningOutcomes) && s.learningOutcomes.includes(lu));
    const completed = storiesForLu.filter((s) => s.status === "done");
    if (completed.length > 0) {
      const lines: string[] = [`Voltooide stories voor LU ${lu}:`];
      for (const st of completed) {
        const prefix = st.storyNumber ? `[${st.storyNumber}] ` : "";
        lines.push(`• ${prefix}${st.title}`);
        if (Array.isArray(st.evidence) && st.evidence.length > 0) {
          for (const ev of st.evidence) {
            lines.push(`   - Bewijs (${ev.type}): ${ev.title} (${ev.url})`);
          }
        }
      }
      return lines.join("\n");
    }
  }

  return evalItem?.argumentation?.trim() || "";
}
