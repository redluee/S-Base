import { beforeEach, describe, expect, it } from "bun:test";
import { setupTestDb } from "../../test-utils";
import db from "../../db/client";
import { users } from "../../db/schema";
import { MinorService } from "./index";

describe("MinorTransfer", () => {
  let minor: MinorService;
  let adminId: number;

  beforeEach(async () => {
    const ids = await setupTestDb();
    adminId = ids.adminId;
    minor = new MinorService();
  });

  it("exports a sprint to clean, portable JSON and imports it as a new sprint", () => {
    const sprint = minor.sprints.create(adminId, {
      sprintNumber: "1",
      name: "Sprint 1: Foundation",
      startDate: "2026-09-07",
    });

    minor.stories.create(adminId, sprint.id, {
      storyTypeCode: "US",
      storyNumber: "US 1.1",
      title: "User Authentication",
      asA: "member",
      iWant: "to log in",
      soThat: "my data is protected",
      learningOutcomes: [1, 2],
      status: "done",
      acceptanceCriteria: [
        { text: "Password hashed with argon2", isCompleted: true, indent: 0 },
        { text: "Session cookie set with 7-day expiry", isCompleted: true, indent: 1 },
      ],
      qualityCriteria: [{ text: "Definition of Done fulfilled", isCompleted: true, indent: 0 }],
      evidence: [{ type: "github", title: "Auth PR", url: "https://github.com/example/pr/1" }],
      presentationData: {
        layout: "split",
        summary: "Secure auth flow implemented",
        bullets: ["Session management", "Cookie encryption"],
      },
    });

    minor.feedback.add(sprint.id, {
      date: "2026-09-16",
      fromWhom: "Evaluator",
      feedback: "Strong architectural choices",
      action: "Document database migrations",
    });

    minor.evaluations.saveSelfEvaluations(sprint.id, adminId, [
      { learningOutcome: 1, level: "V", argumentation: "Auth done securely" },
    ]);

    minor.evaluations.saveTeacherAssessments(sprint.id, adminId, [
      { learningOutcome: 1, assessment: "V", notes: "Approved" },
    ]);

    minor.feedback.saveReflection(sprint.id, {
      date: "2026-09-20",
      whatLearned: "Session auth best practices",
      whatRetained: "Fast SQLite setup",
      whatChange: "Plan earlier for tests",
    });

    const importUser = db
      .insert(users)
      .values({
        username: `iso_import_${Date.now()}`,
        pswdHash: "hash",
        email: `iso_import_${Date.now()}@test.com`,
      })
      .returning()
      .get();
    const importUserId = importUser.userId;

    // 1. Export
    const exported = minor.transfer.exportSprint(sprint.id, adminId);
    expect(exported).not.toBeNull();
    expect(exported?.sprintNumber).toBe("1");
    expect(exported?.name).toBe("Sprint 1: Foundation");
    expect(exported?.stories.length).toBe(1);
    expect(exported?.stories[0].title).toBe("User Authentication");
    expect(exported?.stories[0].acceptanceCriteria?.length).toBe(2);
    expect(exported?.stories[0].acceptanceCriteria?.[1].indent).toBe(1);
    expect(exported?.stories[0].qualityCriteria?.length).toBe(1);
    expect(exported?.stories[0].evidence?.length).toBe(1);
    expect(exported?.feedback?.length).toBe(1);
    expect(exported?.feedback?.[0].fromWhom).toBe("Evaluator");
    expect(exported?.reflection?.whatLearned).toBe("Session auth best practices");
    expect((exported as unknown as Record<string, unknown>).id).toBeUndefined();
    expect((exported as unknown as Record<string, unknown>).userId).toBeUndefined();
    expect((exported.stories[0] as unknown as Record<string, unknown>).id).toBeUndefined();

    // 2. Import as new sprint for an isolated user
    const imported = minor.transfer.importSprint(importUserId, { ...exported });
    expect(imported).toBeDefined();
    expect(imported.id).toBeDefined();
    expect(imported.userId).toBe(importUserId);
    expect(imported.name).toBe("Sprint 1: Foundation");
    expect(imported.stories.length).toBe(1);

    const importedStory = imported.stories[0];
    expect(importedStory.title).toBe("User Authentication");
    expect(importedStory.asA).toBe("member");
    expect(importedStory.learningOutcomes).toEqual([1, 2]);
    expect(importedStory.criteria?.filter((c) => c.type === "acceptance").length).toBe(2);
    expect(importedStory.criteria?.find((c) => c.text.includes("cookie"))?.indent).toBe(1);
    expect(importedStory.evidence?.length).toBe(1);
    expect(importedStory.presentationData?.summary).toBe("Secure auth flow implemented");

    expect(imported.feedback.length).toBe(1);
    expect(imported.feedback[0].fromWhom).toBe("Evaluator");

    expect(imported.selfEvaluations.find((e) => e.learningOutcome === 1)?.level).toBe("V");
    expect(imported.teacherAssessments.find((a) => a.learningOutcome === 1)?.assessment).toBe("V");
    expect(imported.reflection?.whatLearned).toBe("Session auth best practices");

    // 3. Import into existing sprint (targetSprintId)
    const targetSprint = minor.sprints.create(adminId, {
      sprintNumber: "2",
      name: "Sprint 2: Empty Target",
      startDate: "2026-09-21",
    });
    expect(minor.sprints.getById(targetSprint.id, adminId)?.stories.length).toBe(0);

    const merged = minor.transfer.importSprint(adminId, { ...exported }, targetSprint.id);
    expect(merged.id).toBe(targetSprint.id);
    expect(merged.stories.length).toBe(1);
    expect(merged.stories[0].title).toBe("User Authentication");
    expect(merged.feedback.length).toBe(1);

    // 4. Overwrite existing sprint
    minor.stories.create(adminId, targetSprint.id, {
      title: "Old Story To Be Overwritten",
      learningOutcomes: [3],
    });
    expect(minor.sprints.getById(targetSprint.id, adminId)?.stories.length).toBe(2);

    const overwritten = minor.transfer.importSprint(adminId, { ...exported }, targetSprint.id, true);
    expect(overwritten.id).toBe(targetSprint.id);
    expect(overwritten.stories.length).toBe(1);
    expect(overwritten.stories[0].title).toBe("User Authentication");

    // 5. Rename imported sprint
    const renamed = minor.transfer.importSprint(adminId, {
      ...exported,
      customName: "Sprint 1 (kopie)",
    });
    expect(renamed.id).not.toBe(sprint.id);
    expect(renamed.name).toBe("Sprint 1 (kopie)");
    expect(renamed.stories.length).toBe(1);
  });
});
