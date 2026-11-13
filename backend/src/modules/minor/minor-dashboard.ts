import { eq, inArray } from "drizzle-orm";
import db from "../../db/client";
import { minorSelfEvaluations, minorStories, minorTeacherAssessments } from "../../db/schema";
import { today as localToday } from "../../shared/dates";
import type { MinorDashboardStats, MinorSprint } from "../../types/shared";
import {
  FEW_LEARNING_OUTCOMES,
  isLearningOutcome,
  isOfficialPass,
  isProjectedPass,
  LEARNING_OUTCOMES,
  parseDate,
} from "../../shared/minor";
import type { MinorPeerHelpLog } from "./minor-peer-help";
import type { MinorSprints } from "./minor-sprints";
import { parseLearningOutcomes } from "./minor-story-mapper";

function emptyCounts(): Record<number, number> {
  return Object.fromEntries(LEARNING_OUTCOMES.map((lu) => [lu, 0]));
}

function coveredLearningOutcomes(sprintId: number): Set<number> {
  const covered = new Set<number>();
  for (const story of db.select().from(minorStories).where(eq(minorStories.sprintId, sprintId)).all()) {
    for (const lu of parseLearningOutcomes(story.learningOutcomes)) {
      if (isLearningOutcome(lu)) covered.add(lu);
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
    const today = localToday();
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
      const assessments = db
        .select()
        .from(minorTeacherAssessments)
        .where(inArray(minorTeacherAssessments.sprintId, sprintIds))
        .all();
      const selfEvaluations = db
        .select()
        .from(minorSelfEvaluations)
        .where(inArray(minorSelfEvaluations.sprintId, sprintIds))
        .all();
      for (const sprintId of sprintIds) {
        for (const lu of LEARNING_OUTCOMES) {
          const teacher = assessments.find((a) => a.sprintId === sprintId && a.learningOutcome === lu)?.assessment;
          const self = selfEvaluations.find((e) => e.sprintId === sprintId && e.learningOutcome === lu)?.level;
          if (isOfficialPass(teacher)) officialPasses[lu] += 1;
          if (isProjectedPass(self, teacher)) projectedPasses[lu] += 1;
        }
      }
    }

    let activeSprintWarnings = null;
    if (activeSprint) {
      const uniqueLUs = coveredLearningOutcomes(activeSprint.id);
      activeSprintWarnings = {
        fewLearningOutcomes: uniqueLUs.size < FEW_LEARNING_OUTCOMES,
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
