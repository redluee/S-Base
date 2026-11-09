import { beforeEach, describe, expect, it } from "bun:test";
import { setupTestDb } from "../../test-utils";
import { NotFoundError } from "../../utils/errors";
import { MinorService } from "./index";

describe("MinorStories", () => {
  let minor: MinorService;
  let adminId: number;
  let testerId: number;

  beforeEach(async () => {
    const ids = await setupTestDb();
    adminId = ids.adminId;
    testerId = ids.testerId;
    minor = new MinorService();
  });

  it("manages stories with 'Als/wil ik/zodat', dual criteria checklists, and evidence links", () => {
    const sprint = minor.sprints.create(adminId, {
      startDate: "2026-09-07",
    });

    const story = minor.stories.create(adminId, sprint.id, {
      storyTypeCode: "US",
      storyNumber: "US 1.1",
      title: "Sprintbeheer",
      asA: "student",
      iWant: "sprints aanmaken",
      soThat: "ik grip heb op mijn planning",
      learningOutcomes: [1, 2, 5],
      acceptanceCriteria: [
        { text: "Sprintnummer wordt automatisch berekend", isCompleted: true, indent: 0 },
        { text: "Gebruiker kan sprintnummer overschrijven", isCompleted: false, indent: 1 },
      ],
      qualityCriteria: [
        { text: "TypeScript types kloppen 100%", isCompleted: true, indent: 0 },
      ],
      evidence: [
        { type: "github", title: "PR #1", url: "https://github.com/example/pr/1" },
        { type: "document", title: "Design Doc", url: "/api/uploads/doc1.pdf" },
      ],
    });

    expect(story.id).toBeDefined();
    expect(story.learningOutcomes).toEqual([1, 2, 5]);
    expect(story.criteria?.length).toBe(3);
    expect(story.criteria?.[0].indent).toBe(0);
    expect(story.criteria?.[1].indent).toBe(1);
    expect(story.evidence?.length).toBe(2);

    // Toggle criterion
    const firstCrit = story.criteria![0];
    const toggled = minor.stories.toggleCriterion(firstCrit.id, false);
    expect(toggled?.isCompleted).toBe(false);

    // Update story status
    const updated = minor.stories.update(story.id, adminId, {
      status: "done",
    });
    expect(updated?.status).toBe("done");

    // Test listAllStories
    const allStories = minor.stories.listAll(adminId);
    expect(allStories.length).toBeGreaterThanOrEqual(1);
    const found = allStories.find((s) => s.id === story.id);
    expect(found).toBeDefined();
    expect(found?.sprintNumber).toBe(sprint.sprintNumber);
    expect(found?.criteria?.length).toBe(3);

    // Auto-generate self-evaluations
    const autoEvals = minor.drafts.autoGenerate(sprint.id, adminId);
    expect(autoEvals.length).toBe(5);
    // LU 1 should be 'V' and mention story evidence
    const lu1 = autoEvals.find((e) => e.learningOutcome === 1);
    expect(lu1?.level).toBe("V");
    expect(lu1?.argumentation).toContain("Sprintbeheer");
    expect(lu1?.argumentation).toContain("https://github.com/example/pr/1");

    // LU 3 (not in story) should be '-'
    const lu3 = autoEvals.find((e) => e.learningOutcome === 3);
    expect(lu3?.level).toBe("-");
  });

  it("manages story presentation data for show & tell presentations", () => {
    const sprint = minor.sprints.create(adminId, {
      startDate: "2026-09-07",
    });

    const story = minor.stories.create(adminId, sprint.id, {
      storyTypeCode: "US",
      storyNumber: "US 2.1",
      title: "Interactive Dashboard",
      presentationData: {
        enabled: true,
        layout: "split",
        listStyle: "steps",
        bullets: ["Real-time updates via WebSockets", "99.9% uptime metric card"],
        summary: "Live product metrics dashboard built for end users",
        demoUrl: "https://staging.app.example.com/dashboard",
        demoTitle: "Staging Dashboard Live",
        images: [{ url: "/api/uploads/dash.png", caption: "Dashboard overview" }],
        websites: [{ url: "https://my-app.example.com", title: "Production Portal" }],
        links: [{ url: "https://docs.example.com", title: "API Documentation" }],
        documents: [{ url: "/api/minor/uploads/spec.pdf", title: "Architecture Spec" }],
        notes: "Remember to highlight the responsive layout",
      },
    });

    expect(story.id).toBeDefined();
    expect(story.presentationData).toBeDefined();
    expect(story.presentationData?.layout).toBe("split");
    expect(story.presentationData?.listStyle).toBe("steps");
    expect(story.presentationData?.bullets?.length).toBe(2);
    expect(story.presentationData?.demoUrl).toBe("https://staging.app.example.com/dashboard");
    expect(story.presentationData?.websites?.[0].title).toBe("Production Portal");
    expect(story.presentationData?.websites?.[0].url).toBe("https://my-app.example.com");
    expect(story.presentationData?.links?.[0].url).toBe("https://docs.example.com");
    expect(story.presentationData?.documents?.[0].title).toBe("Architecture Spec");

    // Retrieve via getSprintById
    const sprintData = minor.sprints.getById(sprint.id, adminId);
    const foundStory = sprintData?.stories.find((s) => s.id === story.id);
    expect(foundStory?.presentationData?.demoTitle).toBe("Staging Dashboard Live");
    expect(foundStory?.presentationData?.listStyle).toBe("steps");
    expect(foundStory?.presentationData?.websites?.[0].title).toBe("Production Portal");
    expect(foundStory?.presentationData?.images?.[0].caption).toBe("Dashboard overview");
    expect(foundStory?.presentationData?.links?.[0].title).toBe("API Documentation");
    expect(foundStory?.presentationData?.documents?.[0].url).toBe("/api/minor/uploads/spec.pdf");

    // Update presentation data
    const updated = minor.stories.update(story.id, adminId, {
      presentationData: {
        ...foundStory!.presentationData,
        layout: "media",
        listStyle: "bullets",
        bullets: ["Real-time updates via WebSockets"],
      },
    });
    expect(updated?.presentationData?.layout).toBe("media");
    expect(updated?.presentationData?.listStyle).toBe("bullets");
    expect(updated?.presentationData?.bullets?.length).toBe(1);

    // Verify in listAllStories
    const all = minor.stories.listAll(adminId);
    const storyInAll = all.find((s) => s.id === story.id);
    expect(storyInAll?.presentationData?.layout).toBe("media");
  });

  it("reorders stories in a sprint and preserves order in sprint full view", () => {
    const sprint = minor.sprints.create(adminId, {
      startDate: "2026-09-07",
    });

    const story1 = minor.stories.create(adminId, sprint.id, {
      title: "Story One",
      learningOutcomes: [1],
    });
    const story2 = minor.stories.create(adminId, sprint.id, {
      title: "Story Two",
      learningOutcomes: [2],
    });
    const story3 = minor.stories.create(adminId, sprint.id, {
      title: "Story Three",
      learningOutcomes: [3],
    });

    const initialSprint = minor.sprints.getById(sprint.id, adminId);
    expect(initialSprint?.stories.map((s) => s.id)).toEqual([story1.id, story2.id, story3.id]);

    // Reorder: 3, 1, 2
    const result = minor.stories.reorder(sprint.id, adminId, [story3.id, story1.id, story2.id]);
    expect(result).toEqual({ success: true });

    const updatedSprint = minor.sprints.getById(sprint.id, adminId);
    expect(updatedSprint?.stories.map((s) => s.id)).toEqual([story3.id, story1.id, story2.id]);
    expect(updatedSprint?.stories[0].orderIndex).toBe(1);
    expect(updatedSprint?.stories[1].orderIndex).toBe(2);
    expect(updatedSprint?.stories[2].orderIndex).toBe(3);

    // Verify user isolation: tester cannot reorder admin's sprint
    expect(() => minor.stories.reorder(sprint.id, testerId, [story1.id, story2.id, story3.id])).toThrow(NotFoundError);
  });
});
