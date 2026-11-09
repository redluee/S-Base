import { eq, inArray } from "drizzle-orm";
import db from "../../db/client";
import { minorStories, minorTeacherAssessments } from "../../db/schema";
import type { MinorDashboardStats, MinorSprint } from "../../types/shared";
import { formatDate, parseDate } from "./minor-helpers";
import type { MinorPeerHelpLog } from "./minor-peer-help";
import type { MinorSprints } from "./minor-sprints";
import { parseLearningOutcomes } from "./minor-story-mapper";

const LU_NUMBERS = [1, 2, 3, 4, 5];

function emptyCounts(): Record<number, number> {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
}

function coveredLearningOutcomes(sprintId: number): Set<number> {
  const covered = new Set<number>();
  for (const story of db.select().from(minorStories).where(eq(minorStories.sprintId, sprintId)).all()) {
    for (const lu of parseLearningOutcomes(story.learningOutcomes)) {
      if (typeof lu === "number" && lu >= 1 && lu <= 5) covered.add(lu);
    }
  }
  return covered;
}

function pickActiveSprint(sprints: MinorSprint[], today: string): MinorSprint | null {
  const current =
    sprints.find((s) => s.status === "active" && s.startDate <= today && s.endDate >= today) ??
    sprints.find((s) => s.startDate <= today && s.endDate >= today);
  if (current) return current;

  const upcoming = sprints.filter((s) => s.startDate > today);
  if (upcoming.length > 0) return upcoming.find((s) => s.status === "active") ?? upcoming[0];

  if (sprints.length === 0) return null;
  const pastActive = sprints.filter((s) => s.status === "active");
  return pastActive.length > 0 ? pastActive[pastActive.length - 1] : sprints[sprints.length - 1];
}

export class MinorDashboard {
  constructor(
    private readonly sprints: MinorSprints,
    private readonly peerHelp: MinorPeerHelpLog,
  ) {}

  getStats(userId: number): MinorDashboardStats {
    const sprints = this.sprints.list(userId);
    const today = formatDate(new Date());
    const activeSprint = pickActiveSprint(sprints, today);

    let nextShowAndGrowDate: string | null = null;
    let daysUntilShowAndGrow: number | null = null;
    if (activeSprint) {
      nextShowAndGrowDate = activeSprint.showAndGrowDate;
      const diff = parseDate(activeSprint.showAndGrowDate).getTime() - parseDate(today).getTime();
      daysUntilShowAndGrow = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    const officialPasses = emptyCounts();
    const projectedPasses = emptyCounts();
    const sprintIds = sprints.map((s) => s.id);

    if (sprintIds.length > 0) {
      const allAssessments = db
        .select()
        .from(minorTeacherAssessments)
        .where(inArray(minorTeacherAssessments.sprintId, sprintIds))
        .all();

      for (const s of sprints) {
        const isFinished = s.status === "completed" || s.endDate < today;
        const assessments = allAssessments.filter((a) => a.sprintId === s.id);
        const passed = new Set<number>();

        for (const a of assessments) {
          if (a.assessment === "V" && LU_NUMBERS.includes(a.learningOutcome)) {
            officialPasses[a.learningOutcome] += 1;
            projectedPasses[a.learningOutcome] += 1;
            passed.add(a.learningOutcome);
          }
        }

        if (isFinished) continue;

        for (const lu of coveredLearningOutcomes(s.id)) {
          const assessedO = assessments.some((a) => a.learningOutcome === lu && a.assessment === "O");
          if (!passed.has(lu) && !assessedO) projectedPasses[lu] += 1;
        }
      }
    }

    let activeSprintWarnings = null;
    if (activeSprint) {
      const uniqueLUs = coveredLearningOutcomes(activeSprint.id);
      activeSprintWarnings = {
        fewLearningOutcomes: uniqueLUs.size < 3,
        missingLU5: !uniqueLUs.has(5),
        uniqueLUsCount: uniqueLUs.size,
      };
    }

    return {
      activeSprint,
      nextShowAndGrowDate,
      daysUntilShowAndGrow,
      officialPasses,
      projectedPasses,
      totalSprints: sprints.length,
      activeSprintWarnings,
      recentPeerHelp: this.peerHelp.list(userId).slice(0, 5),
    };
  }
}
