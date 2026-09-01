import { describe, expect, it, beforeEach } from "bun:test";
import { setupTestDb } from "../../test-utils";
import { MinorService } from "./index";

describe("MinorService", () => {
  let minor: MinorService;
  let adminId: number;

  beforeEach(async () => {
    const ids = await setupTestDb();
    adminId = ids.adminId;
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

  it("manages story types (defaults + custom)", () => {
    const types = minor.listStoryTypes(adminId);
    expect(types.some((t) => t.code === "US")).toBe(true);
    expect(types.some((t) => t.code === "RS")).toBe(true);
    expect(types.some((t) => t.code === "LS")).toBe(true);

    const custom = minor.createStoryType(adminId, {
      code: "TS",
      name: "Tech Story",
      description: "Architectuur en tooling",
      color: "amber",
    });
    expect(custom.code).toBe("TS");

    const updatedTypes = minor.listStoryTypes(adminId);
    expect(updatedTypes.some((t) => t.code === "TS")).toBe(true);

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
        { text: "Sprintnummer wordt automatisch berekend", isCompleted: true },
        { text: "Gebruiker kan sprintnummer overschrijven", isCompleted: false },
      ],
      qualityCriteria: [
        { text: "TypeScript types kloppen 100%", isCompleted: true },
      ],
      evidence: [
        { type: "github", title: "PR #1", url: "https://github.com/example/pr/1" },
        { type: "document", title: "Design Doc", url: "/api/uploads/doc1.pdf" },
      ],
    });

    expect(story.id).toBeDefined();
    expect(story.learningOutcomes).toEqual([1, 2, 5]);
    expect(story.criteria?.length).toBe(3);
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
    const sprint = minor.createSprint(adminId, {
      startDate: "2026-09-01",
      status: "active",
    });

    // Story with only LU 1 (less than 3 LUs, missing LU 5)
    minor.createStory(adminId, sprint.id, {
      title: "Klein onderdeel",
      learningOutcomes: [1],
    });

    const stats = minor.getDashboardStats(adminId);
    expect(stats.activeSprint).not.toBeNull();
    expect(stats.activeSprintWarnings?.fewLearningOutcomes).toBe(true);
    expect(stats.activeSprintWarnings?.missingLU5).toBe(true);
    expect(stats.activeSprintWarnings?.uniqueLUsCount).toBe(1);

    // Record official teacher assessment for LU 1 as 'V'
    minor.saveTeacherAssessments(sprint.id, adminId, [
      { learningOutcome: 1, assessment: "V", notes: "Goed gedaan!" },
    ]);

    const updatedStats = minor.getDashboardStats(adminId);
    expect(updatedStats.officialPasses[1]).toBe(1);
    expect(updatedStats.officialPasses[2]).toBe(0);
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
});
