import { beforeEach, describe, expect, it } from "bun:test";
import { setupTestDb } from "../../test-utils";
import { MinorService } from "./index";

describe("MinorFeedback", () => {
  let minor: MinorService;
  let adminId: number;

  beforeEach(async () => {
    const ids = await setupTestDb();
    adminId = ids.adminId;
    minor = new MinorService();
  });

  it("manages dynamic feedback rows, reflections, and peer help", () => {
    const sprint = minor.sprints.create(adminId, {
      startDate: "2026-09-07",
    });

    // Feedback
    const fb = minor.feedback.add(sprint.id, {
      date: "2026-09-16",
      fromWhom: "Docent Jan",
      feedback: "Kwaliteitscriteria scherper formuleren",
      action: "Checklist herzien",
    });
    expect(fb.id).toBeDefined();
    const fbList = minor.feedback.list(sprint.id);
    expect(fbList.length).toBe(1);

    // Reflection
    const ref = minor.feedback.saveReflection(sprint.id, {
      whatLearned: "Veel geleerd over SQLite indexes",
      whatRetained: "Gestructureerde feedbackverwerking",
      whatChange: "Eerder beginnen met Show & Grow voorbereiding",
    });
    expect(ref.whatLearned).toContain("SQLite");

    // Peer Help
    const peer = minor.peerHelp.create(adminId, {
      sprintId: sprint.id,
      date: "2026-09-10",
      peerName: "Lisa",
      description: "Geholpen met Next.js API rewrites en authentication headers",
      links: "https://github.com/lisa/project",
    });
    expect(peer.id).toBeDefined();

    const peerList = minor.peerHelp.list(adminId);
    expect(peerList.some((p) => p.id === peer.id)).toBe(true);
  });
});
