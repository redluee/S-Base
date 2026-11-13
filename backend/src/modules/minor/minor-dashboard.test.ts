import { beforeEach, describe, expect, it } from "bun:test";
import { setupTestDb } from "../../test-utils";
import db from "../../db/client";
import { users } from "../../db/schema";
import { MinorService } from "./index";

describe("MinorDashboard", () => {
  let minor: MinorService;
  let testerId: number;

  beforeEach(async () => {
    const ids = await setupTestDb();
    testerId = ids.testerId;
    minor = new MinorService();
  });

  it("validates learning outcomes and generates dashboard stats & warnings", () => {
    // Start a few days ago so the sprint reliably spans "today" regardless of when the test runs.
    const startObj = new Date();
    startObj.setDate(startObj.getDate() - 3);
    const startStr = `${startObj.getFullYear()}-${String(startObj.getMonth() + 1).padStart(2, "0")}-${String(startObj.getDate()).padStart(2, "0")}`;

    const sprint = minor.sprints.create(testerId, {
      startDate: startStr,
      status: "active",
    });

    minor.stories.create(testerId, sprint.id, {
      title: "Klein onderdeel",
      learningOutcomes: [1],
    });

    const stats = minor.dashboard.getStats(testerId);
    expect(stats.activeSprint).not.toBeNull();
    expect(stats.activeSprintWarnings?.fewLearningOutcomes).toBe(true);
    expect(stats.activeSprintWarnings?.missingLU5).toBe(true);
    expect(stats.activeSprintWarnings?.uniqueLUsCount).toBe(1);

    minor.evaluations.saveTeacherAssessments(sprint.id, testerId, [
      { learningOutcome: 1, assessment: "V", notes: "Goed gedaan!" },
    ]);

    const updatedStats = minor.dashboard.getStats(testerId);
    expect(updatedStats.officialPasses[1]).toBe(1);
    expect(updatedStats.officialPasses[2]).toBe(0);

    const reAssessed = minor.evaluations.saveTeacherAssessments(sprint.id, testerId, [
      { learningOutcome: 2, assessment: "V", notes: "Nu ook LU 2 behaald" },
    ]);
    const lu1Assess = reAssessed.find((a) => a.learningOutcome === 1);
    const lu2Assess = reAssessed.find((a) => a.learningOutcome === 2);
    expect(lu1Assess?.assessment).toBe("V");
    expect(lu2Assess?.assessment).toBe("V");

    const reAssessedStats = minor.dashboard.getStats(testerId);
    expect(reAssessedStats.officialPasses[1]).toBe(1);
    expect(reAssessedStats.officialPasses[2]).toBe(1);

    minor.evaluations.saveSelfEvaluations(sprint.id, testerId, [
      { learningOutcome: 3, level: "V", argumentation: "" },
      { learningOutcome: 4, level: "NV", argumentation: "" },
    ]);
    minor.evaluations.saveTeacherAssessments(sprint.id, testerId, [{ learningOutcome: 5, assessment: "O" }]);
    minor.evaluations.saveSelfEvaluations(sprint.id, testerId, [{ learningOutcome: 5, level: "V", argumentation: "" }]);

    const progStats = minor.dashboard.getStats(testerId);
    expect(progStats.officialPasses).toEqual({ 1: 1, 2: 1, 3: 0, 4: 0, 5: 0 });
    expect(progStats.projectedPasses).toEqual({ 1: 1, 2: 1, 3: 1, 4: 0, 5: 0 });
  });

  it("counts only teacher V as official and adds self-evaluated V to the prognosis, even for finished sprints", () => {
    const isolatedUser = db
      .insert(users)
      .values({
        username: `iso_user_${Date.now()}`,
        pswdHash: "hash",
        email: `iso_${Date.now()}@test.com`,
      })
      .returning()
      .get();
    const isoId = isolatedUser.userId;

    const pastSprint = minor.sprints.create(isoId, {
      startDate: "2026-01-01",
      endDate: "2026-01-15",
      status: "completed",
    });

    minor.evaluations.saveTeacherAssessments(pastSprint.id, isoId, [
      { learningOutcome: 1, assessment: "V" },
      { learningOutcome: 2, assessment: "-" },
    ]);

    minor.evaluations.saveSelfEvaluations(pastSprint.id, isoId, [
      { learningOutcome: 2, level: "V", argumentation: "" },
      { learningOutcome: 3, level: "-", argumentation: "" },
    ]);

    const stats = minor.dashboard.getStats(isoId);
    expect(stats.officialPasses).toMatchObject({ 1: 1, 2: 0, 3: 0 });
    expect(stats.projectedPasses).toMatchObject({ 1: 1, 2: 1, 3: 0 });

    minor.feedback.saveReflection(pastSprint.id, isoId, {
      whatLearned: "Geleerd",
      whatRetained: "Vastgehouden",
      whatChange: "Veranderen",
    });
    expect(minor.dashboard.getStats(isoId).officialPasses[1]).toBe(1);
  });

  it("preserves Sprint 1 teacher assessments as official passes when creating Sprint 2 with stories", () => {
    const user = db
      .insert(users)
      .values({
        username: `iso_sprint2_${Date.now()}`,
        pswdHash: "hash",
        email: `iso_s2_${Date.now()}@test.com`,
      })
      .returning()
      .get();
    const userId = user.userId;

    const sprint1 = minor.sprints.create(userId, {
      startDate: "2026-01-05",
      endDate: "2026-01-23",
      status: "completed",
    });

    minor.evaluations.saveTeacherAssessments(sprint1.id, userId, [
      { learningOutcome: 1, assessment: "V" },
      { learningOutcome: 2, assessment: "V" },
      { learningOutcome: 3, assessment: "-" },
      { learningOutcome: 4, assessment: "V" },
      { learningOutcome: 5, assessment: "V" },
    ]);

    let stats = minor.dashboard.getStats(userId);
    expect(stats.officialPasses[1]).toBe(1);
    expect(stats.officialPasses[2]).toBe(1);
    expect(stats.officialPasses[3]).toBe(0);
    expect(stats.officialPasses[4]).toBe(1);
    expect(stats.officialPasses[5]).toBe(1);

    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const activeStart = new Date();
    activeStart.setDate(activeStart.getDate() - 7);
    const activeEnd = new Date();
    activeEnd.setDate(activeEnd.getDate() + 14);
    const sprint2 = minor.sprints.create(userId, {
      startDate: fmt(activeStart),
      endDate: fmt(activeEnd),
    });

    minor.stories.create(userId, sprint2.id, {
      title: "User Story covering LU 1",
      learningOutcomes: [1],
      status: "in_progress",
    });
    minor.evaluations.saveSelfEvaluations(sprint2.id, userId, [{ learningOutcome: 1, level: "V", argumentation: "" }]);

    stats = minor.dashboard.getStats(userId);
    expect(stats.officialPasses[1]).toBe(1);
    expect(stats.officialPasses[2]).toBe(1);
    expect(stats.officialPasses[3]).toBe(0);
    expect(stats.officialPasses[4]).toBe(1);
    expect(stats.officialPasses[5]).toBe(1);

    expect(stats.projectedPasses[1]).toBe(2);
    expect(stats.projectedPasses[2]).toBe(1);
    expect(stats.projectedPasses[3]).toBe(0);
    expect(stats.projectedPasses[4]).toBe(1);
    expect(stats.projectedPasses[5]).toBe(1);

    const sprints = minor.sprints.list(userId);
    const s1 = sprints.find((s) => s.id === sprint1.id);
    expect(s1?.status).toBe("completed");
  });
});
