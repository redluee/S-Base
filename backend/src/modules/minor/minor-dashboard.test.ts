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

    // Story with only LU 1 (less than 3 LUs, missing LU 5)
    minor.stories.create(testerId, sprint.id, {
      title: "Klein onderdeel",
      learningOutcomes: [1],
    });

    const stats = minor.dashboard.getStats(testerId);
    expect(stats.activeSprint).not.toBeNull();
    expect(stats.activeSprintWarnings?.fewLearningOutcomes).toBe(true);
    expect(stats.activeSprintWarnings?.missingLU5).toBe(true);
    expect(stats.activeSprintWarnings?.uniqueLUsCount).toBe(1);

    // Record official teacher assessment for LU 1 as 'V'
    minor.evaluations.saveTeacherAssessments(sprint.id, testerId, [
      { learningOutcome: 1, assessment: "V", notes: "Goed gedaan!" },
    ]);

    const updatedStats = minor.dashboard.getStats(testerId);
    expect(updatedStats.officialPasses[1]).toBe(1);
    expect(updatedStats.officialPasses[2]).toBe(0);

    // Teacher can award 'V' on LU 2 as well (both LU 1 and LU 2 are 'V' in this sprint)
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

    // Prognosis with a new planned sprint with multiple stories covering multiple LUs:
    // Should allocate 1 projected pass per covered LU, not duplicated per story
    const futureObj = new Date();
    futureObj.setDate(futureObj.getDate() + 30);
    const futureStr = `${futureObj.getFullYear()}-${String(futureObj.getMonth() + 1).padStart(2, "0")}-${String(futureObj.getDate()).padStart(2, "0")}`;
    const sprint2 = minor.sprints.create(testerId, {
      startDate: futureStr,
      status: "planned",
    });
    minor.stories.create(testerId, sprint2.id, {
      title: "Story A",
      learningOutcomes: [1, 2, 3],
    });
    minor.stories.create(testerId, sprint2.id, {
      title: "Story B",
      learningOutcomes: [4, 5],
    });
    // Another story covering LU 1 in the same sprint (must not duplicate LU 1 pass)
    minor.stories.create(testerId, sprint2.id, {
      title: "Story C",
      learningOutcomes: [1],
    });

    const progStats = minor.dashboard.getStats(testerId);
    const totalOfficial = Object.values(progStats.officialPasses).reduce((a, b) => a + b, 0);
    const totalProjected = Object.values(progStats.projectedPasses).reduce((a, b) => a + b, 0);

    // Sprint 1 has 2 official V's (LU 1 and LU 2).
    // Sprint 2 covers LU 1, 2, 3, 4, 5 (all 5 LUs, max 1 each) -> adds 5 projected V's.
    expect(totalOfficial).toBe(2);
    expect(totalProjected).toBe(7);
    expect(progStats.projectedPasses[1]).toBe(2); // 1 official from sprint 1 + 1 projected from sprint 2
  });

  it("handles dashboard official passes and prognosis for finished sprints regardless of reflection", () => {
    // Use an isolated user so existing test sprints don't affect stats
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

    // Sprint 1 is completed / past end date
    const pastSprint = minor.sprints.create(isoId, {
      startDate: "2026-01-01",
      endDate: "2026-01-15",
      status: "completed",
    });

    // Teacher gave 'V' for LU 1 in pastSprint
    minor.evaluations.saveTeacherAssessments(pastSprint.id, isoId, [
      { learningOutcome: 1, assessment: "V" },
      { learningOutcome: 2, assessment: "-" },
    ]);

    // Story in pastSprint for LU 2 (realized, but teacher gave '-')
    minor.stories.create(isoId, pastSprint.id, {
      title: "Past story for LU 2",
      learningOutcomes: [2],
      status: "done",
    });

    // Without reflection filled in: official pass must STILL count because teacher gave 'V'!
    let stats = minor.dashboard.getStats(isoId);
    expect(stats.officialPasses[1]).toBe(1);
    // For projectedPasses, finished sprint with teacher assessment 'V' is 1, but unpassed LU 2 is excluded (0)
    expect(stats.projectedPasses[1]).toBe(1);
    expect(stats.projectedPasses[2]).toBe(0);

    // Now fill in reflection for pastSprint
    minor.feedback.saveReflection(pastSprint.id, isoId, {
      whatLearned: "Geleerd",
      whatRetained: "Vastgehouden",
      whatChange: "Veranderen",
    });

    stats = minor.dashboard.getStats(isoId);
    expect(stats.officialPasses[1]).toBe(1);
    expect(stats.projectedPasses[1]).toBe(1);
    expect(stats.projectedPasses[2]).toBe(0);
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

    // Sprint 1 completed with teacher feedback awarding LU 1, 2, 4, 5
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

    // Reflection is empty/unfilled
    let stats = minor.dashboard.getStats(userId);
    expect(stats.officialPasses[1]).toBe(1);
    expect(stats.officialPasses[2]).toBe(1);
    expect(stats.officialPasses[3]).toBe(0);
    expect(stats.officialPasses[4]).toBe(1);
    expect(stats.officialPasses[5]).toBe(1);

    // Now create Sprint 2 with a story covering LU 1 (dates in the present/future so it is active)
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

    stats = minor.dashboard.getStats(userId);
    // Official passes from Sprint 1 MUST remain intact as official passes (not reverted to predictions!)
    expect(stats.officialPasses[1]).toBe(1);
    expect(stats.officialPasses[2]).toBe(1);
    expect(stats.officialPasses[3]).toBe(0);
    expect(stats.officialPasses[4]).toBe(1);
    expect(stats.officialPasses[5]).toBe(1);

    // Projected passes: Sprint 1 contributed 1 for each of LU 1, 2, 4, 5. Sprint 2 story adds +1 projection for LU 1.
    expect(stats.projectedPasses[1]).toBe(2);
    expect(stats.projectedPasses[2]).toBe(1);
    expect(stats.projectedPasses[3]).toBe(0);
    expect(stats.projectedPasses[4]).toBe(1);
    expect(stats.projectedPasses[5]).toBe(1);

    // Also verify sprint1 status is preserved as completed in listSprints
    const sprints = minor.sprints.list(userId);
    const s1 = sprints.find((s) => s.id === sprint1.id);
    expect(s1?.status).toBe("completed");
  });
});
