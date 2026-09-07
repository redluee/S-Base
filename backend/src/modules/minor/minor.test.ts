import { describe, expect, it, beforeEach } from "bun:test";
import { setupTestDb } from "../../test-utils";
import { MinorService } from "./index";

describe("MinorService", () => {
  let minor: MinorService;
  let adminId: number;
  let testerId: number;

  beforeEach(async () => {
    const ids = await setupTestDb();
    adminId = ids.adminId;
    testerId = ids.testerId;
    minor = new MinorService();
  });

  it("calculates default 14-day sprint length and Show & Grow Wednesday", () => {
    // 2026-09-07 is a Monday
    const calc = minor.calculateSprintDates(adminId, "2026-09-07", 14);
    expect(calc.startDate).toBe("2026-09-07");
    expect(calc.endDate).toBe("2026-09-20"); // 14 days later (Sun)
    expect(calc.durationDays).toBe(14);
    expect(calc.extendedDays).toBe(0);
    expect(calc.showAndGrowDate).toBe("2026-09-16"); // 2nd Wednesday
  });

  it("manages vacations and automatically extends overlapping sprints", () => {
    // Add Herfstvakantie (Oct 19 to Oct 25, 2026 = 7 days)
    const vac = minor.createVacation(adminId, {
      name: "Herfstvakantie",
      startDate: "2026-10-19",
      endDate: "2026-10-25",
    });
    expect(vac.id).toBeDefined();
    expect(vac.name).toBe("Herfstvakantie");

    const vacList = minor.listVacations(adminId);
    expect(vacList.some((v) => v.id === vac.id)).toBe(true);

    // Sprint starting 2026-10-12 (Mon) for 14 days without vacation would end 2026-10-25
    // With 7 days vacation (19-25 Oct), sprint should be extended by 7 days to 2026-11-01
    const calc = minor.calculateSprintDates(adminId, "2026-10-12", 14);
    expect(calc.extendedDays).toBe(7);
    expect(calc.extensionReason).toContain("Herfstvakantie");
    expect(calc.endDate).toBe("2026-11-01");

    // Clean up
    minor.deleteVacation(vac.id, adminId);
  });

  it("handles sprint creation with flexible numbering and sequential suggestions", () => {
    const next1 = minor.getNextSprintNumber(adminId);
    expect(next1.nextNumber).toBeDefined();

    const sprint1 = minor.createSprint(adminId, {
      startDate: "2026-09-07",
    });
    expect(sprint1.id).toBeDefined();
    expect(sprint1.sprintNumber).toBe(next1.nextNumber);

    // Custom numbering override e.g. "Reparatiesprint 1"
    const repSprint = minor.createSprint(adminId, {
      sprintNumber: "Reparatiesprint 1",
      name: "Reparatiesprint A",
      startDate: "2026-09-21",
    });
    expect(repSprint.sprintNumber).toBe("Reparatiesprint 1");
    expect(repSprint.name).toBe("Reparatiesprint A");

    const sprintList = minor.listSprints(adminId);
    expect(sprintList.length).toBeGreaterThanOrEqual(2);

    const full = minor.getSprintById(sprint1.id, adminId);
    expect(full).not.toBeNull();
    expect(full?.selfEvaluations.length).toBe(5);
    expect(full?.teacherAssessments.length).toBe(5);
    expect(full?.reflection).not.toBeNull();
  });

  it("manages story types (defaults + custom with default quality criteria)", () => {
    const types = minor.listStoryTypes(adminId);
    const us = types.find((t) => t.code === "US");
    expect(us).toBeDefined();
    expect(us?.defaultQualityCriteria?.length).toBeGreaterThanOrEqual(1);
    expect(us?.defaultQualityCriteria?.some((c) => c.text.includes("Definition of Done"))).toBe(true);

    const rs = types.find((t) => t.code === "RS");
    expect(rs).toBeDefined();
    expect(rs?.defaultQualityCriteria?.length).toBeGreaterThanOrEqual(1);

    // Create custom story type with default quality criteria
    const custom = minor.createStoryType(adminId, {
      code: "TS",
      name: "Tech Story",
      description: "Architectuur en tooling",
      color: "amber",
      defaultQualityCriteria: [
        { text: "Unit tests geschreven met >80% coverage", indent: 0 },
        { text: "Architectuur diagram bijgewerkt", indent: 1 },
      ],
    });
    expect(custom.code).toBe("TS");
    expect(custom.defaultQualityCriteria?.length).toBe(2);
    expect(custom.defaultQualityCriteria?.[1].indent).toBe(1);

    // Update custom story type
    const updatedCustom = minor.updateStoryType(custom.id, adminId, {
      name: "Technical Story",
      defaultQualityCriteria: [
        { text: "CI pipeline slaagt zonder warnings", indent: 0 },
      ],
    });
    expect(updatedCustom?.name).toBe("Technical Story");
    expect(updatedCustom?.defaultQualityCriteria?.length).toBe(1);
    expect(updatedCustom?.defaultQualityCriteria?.[0].text).toBe("CI pipeline slaagt zonder warnings");

    // Update default story type (e.g. US)
    const updatedUs = minor.updateStoryType(us!.id, adminId, {
      name: "Functionele User Story",
      defaultQualityCriteria: [
        { text: "Aangepast US kwaliteitscriterium 1", indent: 0 },
      ],
    });
    expect(updatedUs?.name).toBe("Functionele User Story");
    expect(updatedUs?.defaultQualityCriteria?.length).toBe(1);
    expect(updatedUs?.defaultQualityCriteria?.[0].text).toBe("Aangepast US kwaliteitscriterium 1");

    const reloadedTypes = minor.listStoryTypes(adminId);
    const reloadedUs = reloadedTypes.find((t) => t.code === "US");
    expect(reloadedUs?.name).toBe("Functionele User Story");
    expect(reloadedUs?.defaultQualityCriteria?.[0].text).toBe("Aangepast US kwaliteitscriterium 1");

    minor.deleteStoryType(custom.id, adminId);
  });

  it("manages stories with 'Als/wil ik/zodat', dual criteria checklists, and evidence links", () => {
    const sprint = minor.createSprint(adminId, {
      startDate: "2026-09-07",
    });

    const story = minor.createStory(adminId, sprint.id, {
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
    const toggled = minor.toggleCriterion(firstCrit.id, false);
    expect(toggled?.isCompleted).toBe(false);

    // Update story status
    const updated = minor.updateStory(story.id, adminId, {
      status: "done",
    });
    expect(updated?.status).toBe("done");

    // Test listAllStories
    const allStories = minor.listAllStories(adminId);
    expect(allStories.length).toBeGreaterThanOrEqual(1);
    const found = allStories.find((s) => s.id === story.id);
    expect(found).toBeDefined();
    expect(found?.sprintNumber).toBe(sprint.sprintNumber);
    expect(found?.criteria?.length).toBe(3);

    // Auto-generate self-evaluations
    const autoEvals = minor.autoGenerateSelfEvaluations(sprint.id, adminId);
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

  it("validates learning outcomes and generates dashboard stats & warnings", () => {
    const sprint = minor.createSprint(testerId, {
      startDate: "2026-09-01",
      status: "active",
    });

    // Story with only LU 1 (less than 3 LUs, missing LU 5)
    minor.createStory(testerId, sprint.id, {
      title: "Klein onderdeel",
      learningOutcomes: [1],
    });

    const stats = minor.getDashboardStats(testerId);
    expect(stats.activeSprint).not.toBeNull();
    expect(stats.activeSprintWarnings?.fewLearningOutcomes).toBe(true);
    expect(stats.activeSprintWarnings?.missingLU5).toBe(true);
    expect(stats.activeSprintWarnings?.uniqueLUsCount).toBe(1);

    // Record official teacher assessment for LU 1 as 'V'
    minor.saveTeacherAssessments(sprint.id, testerId, [
      { learningOutcome: 1, assessment: "V", notes: "Goed gedaan!" },
    ]);

    const updatedStats = minor.getDashboardStats(testerId);
    expect(updatedStats.officialPasses[1]).toBe(1);
    expect(updatedStats.officialPasses[2]).toBe(0);

    // If teacher updates assessment to award 'V' on LU 2, LU 1 must be reset to '-' (max 1 V per sprint)
    const reAssessed = minor.saveTeacherAssessments(sprint.id, testerId, [
      { learningOutcome: 2, assessment: "V", notes: "Nu LU 2 behaald" },
    ]);
    const lu1Assess = reAssessed.find((a) => a.learningOutcome === 1);
    const lu2Assess = reAssessed.find((a) => a.learningOutcome === 2);
    expect(lu1Assess?.assessment).toBe("-");
    expect(lu2Assess?.assessment).toBe("V");

    const reAssessedStats = minor.getDashboardStats(testerId);
    expect(reAssessedStats.officialPasses[1]).toBe(0);
    expect(reAssessedStats.officialPasses[2]).toBe(1);

    // Prognosis with a new planned sprint with multiple stories covering multiple LUs:
    // Should allocate at most 1 projected pass for the whole sprint, not per story
    const sprint2 = minor.createSprint(testerId, {
      startDate: "2026-09-21",
      status: "planned",
    });
    minor.createStory(testerId, sprint2.id, {
      title: "Story A",
      learningOutcomes: [1, 2, 3],
    });
    minor.createStory(testerId, sprint2.id, {
      title: "Story B",
      learningOutcomes: [4, 5],
    });

    const progStats = minor.getDashboardStats(testerId);
    const totalOfficial = Object.values(progStats.officialPasses).reduce((a, b) => a + b, 0);
    const totalProjected = Object.values(progStats.projectedPasses).reduce((a, b) => a + b, 0);

    // Sprint 1 has 1 official V (on LU 2), sprint 2 adds at most 1 projected V
    expect(totalOfficial).toBe(1);
    expect(totalProjected).toBe(2);
  });

  it("manages dynamic feedback rows, reflections, and peer help", () => {
    const sprint = minor.createSprint(adminId, {
      startDate: "2026-09-07",
    });

    // Feedback
    const fb = minor.addFeedback(sprint.id, {
      date: "2026-09-16",
      fromWhom: "Docent Jan",
      feedback: "Kwaliteitscriteria scherper formuleren",
      action: "Checklist herzien",
    });
    expect(fb.id).toBeDefined();
    const fbList = minor.listFeedback(sprint.id);
    expect(fbList.length).toBe(1);

    // Reflection
    const ref = minor.saveReflection(sprint.id, {
      whatLearned: "Veel geleerd over SQLite indexes",
      whatRetained: "Gestructureerde feedbackverwerking",
      whatChange: "Eerder beginnen met Show & Grow voorbereiding",
    });
    expect(ref.whatLearned).toContain("SQLite");

    // Peer Help
    const peer = minor.createPeerHelp(adminId, {
      sprintId: sprint.id,
      date: "2026-09-10",
      peerName: "Lisa",
      description: "Geholpen met Next.js API rewrites en authentication headers",
      links: "https://github.com/lisa/project",
    });
    expect(peer.id).toBeDefined();

    const peerList = minor.listPeerHelp(adminId);
    expect(peerList.some((p) => p.id === peer.id)).toBe(true);
  });

  it("manages story presentation data for show & tell presentations", () => {
    const sprint = minor.createSprint(adminId, {
      startDate: "2026-09-07",
    });

    const story = minor.createStory(adminId, sprint.id, {
      storyTypeCode: "US",
      storyNumber: "US 2.1",
      title: "Interactive Dashboard",
      presentationData: {
        enabled: true,
        layout: "split",
        bullets: ["Real-time updates via WebSockets", "99.9% uptime metric card"],
        summary: "Live product metrics dashboard built for end users",
        demoUrl: "https://staging.app.example.com/dashboard",
        demoTitle: "Staging Dashboard Live",
        images: [{ url: "/api/uploads/dash.png", caption: "Dashboard overview" }],
        notes: "Remember to highlight the responsive layout",
      },
    });

    expect(story.id).toBeDefined();
    expect(story.presentationData).toBeDefined();
    expect(story.presentationData?.layout).toBe("split");
    expect(story.presentationData?.bullets?.length).toBe(2);
    expect(story.presentationData?.demoUrl).toBe("https://staging.app.example.com/dashboard");

    // Retrieve via getSprintById
    const sprintData = minor.getSprintById(sprint.id, adminId);
    const foundStory = sprintData?.stories.find((s) => s.id === story.id);
    expect(foundStory?.presentationData?.demoTitle).toBe("Staging Dashboard Live");
    expect(foundStory?.presentationData?.images?.[0].caption).toBe("Dashboard overview");

    // Update presentation data
    const updated = minor.updateStory(story.id, adminId, {
      presentationData: {
        ...foundStory!.presentationData,
        layout: "media",
        bullets: ["Real-time updates via WebSockets"],
      },
    });
    expect(updated?.presentationData?.layout).toBe("media");
    expect(updated?.presentationData?.bullets?.length).toBe(1);

    // Verify in listAllStories
    const all = minor.listAllStories(adminId);
    const storyInAll = all.find((s) => s.id === story.id);
    expect(storyInAll?.presentationData?.layout).toBe("media");
  });

  it("exports a sprint to clean, portable JSON and imports it as a new sprint", () => {
    const sprint = minor.createSprint(adminId, {
      sprintNumber: "1",
      name: "Sprint 1: Foundation",
      startDate: "2026-09-07",
    });

    const story = minor.createStory(adminId, sprint.id, {
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
      qualityCriteria: [
        { text: "Definition of Done fulfilled", isCompleted: true, indent: 0 },
      ],
      evidence: [
        { type: "github", title: "Auth PR", url: "https://github.com/example/pr/1" },
      ],
      presentationData: {
        layout: "split",
        summary: "Secure auth flow implemented",
        bullets: ["Session management", "Cookie encryption"],
      },
    });

    minor.addFeedback(sprint.id, {
      date: "2026-09-16",
      fromWhom: "Evaluator",
      feedback: "Strong architectural choices",
      action: "Document database migrations",
    });

    minor.saveSelfEvaluations(sprint.id, adminId, [
      { learningOutcome: 1, level: "V", argumentation: "Auth done securely" },
    ]);

    minor.saveTeacherAssessments(sprint.id, adminId, [
      { learningOutcome: 1, assessment: "V", notes: "Approved" },
    ]);

    minor.saveReflection(sprint.id, {
      date: "2026-09-20",
      whatLearned: "Session auth best practices",
      whatRetained: "Fast SQLite setup",
      whatChange: "Plan earlier for tests",
    });

    // 1. Export
    const exported = minor.exportSprint(sprint.id, adminId);
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
    expect((exported as any).id).toBeUndefined();
    expect((exported as any).userId).toBeUndefined();
    expect((exported?.stories[0] as any).id).toBeUndefined();

    // 2. Import as new sprint for testerId
    const imported = minor.importSprint(testerId, exported!);
    expect(imported).toBeDefined();
    expect(imported.id).toBeDefined();
    expect(imported.userId).toBe(testerId);
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
    const targetSprint = minor.createSprint(adminId, {
      sprintNumber: "2",
      name: "Sprint 2: Empty Target",
      startDate: "2026-09-21",
    });
    expect(minor.getSprintById(targetSprint.id, adminId)?.stories.length).toBe(0);

    const merged = minor.importSprint(adminId, exported!, targetSprint.id);
    expect(merged.id).toBe(targetSprint.id);
    expect(merged.stories.length).toBe(1);
    expect(merged.stories[0].title).toBe("User Authentication");
    expect(merged.feedback.length).toBe(1);

    // 4. Overwrite existing sprint
    minor.createStory(adminId, targetSprint.id, {
      title: "Old Story To Be Overwritten",
      learningOutcomes: [3],
    });
    expect(minor.getSprintById(targetSprint.id, adminId)?.stories.length).toBe(2);

    const overwritten = minor.importSprint(adminId, exported!, targetSprint.id, true);
    expect(overwritten.id).toBe(targetSprint.id);
    expect(overwritten.stories.length).toBe(1);
    expect(overwritten.stories[0].title).toBe("User Authentication");

    // 5. Rename imported sprint
    const renamed = minor.importSprint(adminId, {
      ...exported!,
      customName: "Sprint 1 (kopie)",
    });
    expect(renamed.id).not.toBe(sprint.id);
    expect(renamed.name).toBe("Sprint 1 (kopie)");
    expect(renamed.stories.length).toBe(1);
  });
});

