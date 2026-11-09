import { beforeEach, describe, expect, it } from "bun:test";
import { setupTestDb } from "../../test-utils";
import { MinorService } from "./index";

describe("MinorEvaluations", () => {
  let minor: MinorService;
  let adminId: number;

  beforeEach(async () => {
    const ids = await setupTestDb();
    adminId = ids.adminId;
    minor = new MinorService();
  });

  it("sets learning outcomes to V in self-evaluations when a story becomes done", () => {
    const sprint = minor.sprints.create(adminId, { sprintNumber: "1", name: "Sprint 1", startDate: "2026-09-07" });
    const story = minor.stories.create(adminId, sprint.id, {
      storyTypeCode: "US",
      title: "Story",
      learningOutcomes: [1, 3],
    });

    const levels = () => Object.fromEntries(minor.sprints.getById(sprint.id, adminId)!.selfEvaluations.map((e) => [e.learningOutcome, e.level]));
    expect(levels()[1]).toBe("-");

    minor.stories.update(story.id, adminId, { status: "done" });
    expect(levels()[1]).toBe("V");
    expect(levels()[3]).toBe("V");
    expect(levels()[2]).toBe("-");

    minor.evaluations.saveSelfEvaluations(sprint.id, adminId, [{ learningOutcome: 1, level: "NV" }]);
    minor.stories.update(story.id, adminId, { title: "Renamed" });
    expect(levels()[1]).toBe("NV");
  });

  it("sets level to 'V' without touching argumentation when stories are completed", () => {
    const sprint = minor.sprints.create(adminId, {
      startDate: "2026-09-01",
    });

    // Create a story with status 'done' touching LU 1 and LU 2
    minor.stories.create(adminId, sprint.id, {
      title: "Realized Story",
      learningOutcomes: [1, 2],
      status: "done",
      evidence: [
        { type: "github", title: "PR #10", url: "https://github.com/example/pr/10" },
      ],
    });

    const full = minor.sprints.getById(sprint.id, adminId);
    expect(full).not.toBeNull();
    const eval1 = full?.selfEvaluations.find((e) => e.learningOutcome === 1);
    const eval2 = full?.selfEvaluations.find((e) => e.learningOutcome === 2);
    const eval3 = full?.selfEvaluations.find((e) => e.learningOutcome === 3);

    // Level becomes 'V' for covered LUs; argumentation stays empty until explicitly generated
    expect(eval1?.level).toBe("V");
    expect(eval1?.argumentation).toBe("");
    expect(eval2?.level).toBe("V");
    expect(eval2?.argumentation).toBe("");
    expect(eval3?.level).toBe("-");
    expect(eval3?.argumentation).toBe("");

    // Explicit manual auto-generation still works
    const generated = minor.drafts.autoGenerate(sprint.id, adminId);
    const gen1 = generated.find((e) => e.learningOutcome === 1);
    expect(gen1?.level).toBe("V");
    expect(gen1?.argumentation).toContain("Voltooide stories voor LU 1:");
  });
});
