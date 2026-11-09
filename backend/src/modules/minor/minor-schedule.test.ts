import { beforeEach, describe, expect, it } from "bun:test";
import { setupTestDb } from "../../test-utils";
import { MinorService } from "./index";

describe("MinorSchedule", () => {
  let minor: MinorService;
  let adminId: number;

  beforeEach(async () => {
    const ids = await setupTestDb();
    adminId = ids.adminId;
    minor = new MinorService();
  });

  it("calculates default 14-day sprint length and Show & Grow Wednesday", () => {
    // 2026-09-07 is a Monday
    const calc = minor.schedule.calculateSprintDates(adminId, "2026-09-07", 14);
    expect(calc.startDate).toBe("2026-09-07");
    expect(calc.endDate).toBe("2026-09-20"); // 14 days later (Sun)
    expect(calc.durationDays).toBe(14);
    expect(calc.extendedDays).toBe(0);
    expect(calc.showAndGrowDate).toBe("2026-09-16"); // 2nd Wednesday
  });

  it("manages vacations and automatically extends overlapping sprints", () => {
    // Add Herfstvakantie (Oct 19 to Oct 25, 2026 = 7 days)
    const vac = minor.schedule.createVacation(adminId, {
      name: "Herfstvakantie",
      startDate: "2026-10-19",
      endDate: "2026-10-25",
    });
    expect(vac.id).toBeDefined();
    expect(vac.name).toBe("Herfstvakantie");

    const vacList = minor.schedule.listVacations(adminId);
    expect(vacList.some((v) => v.id === vac.id)).toBe(true);

    // Sprint starting 2026-10-12 (Mon) for 14 days without vacation would end 2026-10-25
    // With 7 days vacation (19-25 Oct), sprint should be extended by 7 days to 2026-11-01
    const calc = minor.schedule.calculateSprintDates(adminId, "2026-10-12", 14);
    expect(calc.extendedDays).toBe(7);
    expect(calc.extensionReason).toContain("Herfstvakantie");
    expect(calc.endDate).toBe("2026-11-01");

    // Clean up
    minor.schedule.removeVacation(vac.id, adminId);
  });

  it("manages story types (defaults + custom with default quality criteria)", () => {
    const types = minor.storyTypes.list(adminId);
    const us = types.find((t) => t.code === "US");
    expect(us).toBeDefined();
    expect(us?.defaultQualityCriteria?.length).toBeGreaterThanOrEqual(1);
    expect(us?.defaultQualityCriteria?.some((c) => c.text.includes("Definition of Done"))).toBe(true);

    const rs = types.find((t) => t.code === "RS");
    expect(rs).toBeDefined();
    expect(rs?.defaultQualityCriteria?.length).toBeGreaterThanOrEqual(1);

    // Create custom story type with default quality criteria
    const custom = minor.storyTypes.create(adminId, {
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
    const updatedCustom = minor.storyTypes.update(custom.id, adminId, {
      name: "Technical Story",
      defaultQualityCriteria: [
        { text: "CI pipeline slaagt zonder warnings", indent: 0 },
      ],
    });
    expect(updatedCustom?.name).toBe("Technical Story");
    expect(updatedCustom?.defaultQualityCriteria?.length).toBe(1);
    expect(updatedCustom?.defaultQualityCriteria?.[0].text).toBe("CI pipeline slaagt zonder warnings");

    // Update default story type (e.g. US)
    const updatedUs = minor.storyTypes.update(us!.id, adminId, {
      name: "Functionele User Story",
      defaultQualityCriteria: [
        { text: "Aangepast US kwaliteitscriterium 1", indent: 0 },
      ],
    });
    expect(updatedUs?.name).toBe("Functionele User Story");
    expect(updatedUs?.defaultQualityCriteria?.length).toBe(1);
    expect(updatedUs?.defaultQualityCriteria?.[0].text).toBe("Aangepast US kwaliteitscriterium 1");

    const reloadedTypes = minor.storyTypes.list(adminId);
    const reloadedUs = reloadedTypes.find((t) => t.code === "US");
    expect(reloadedUs?.name).toBe("Functionele User Story");
    expect(reloadedUs?.defaultQualityCriteria?.[0].text).toBe("Aangepast US kwaliteitscriterium 1");

    minor.storyTypes.remove(custom.id, adminId);
  });
});
