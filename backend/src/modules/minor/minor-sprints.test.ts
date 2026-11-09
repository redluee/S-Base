import { beforeEach, describe, expect, it } from "bun:test";
import { setupTestDb } from "../../test-utils";
import { MinorService } from "./index";

describe("MinorSprints", () => {
  let minor: MinorService;
  let adminId: number;

  beforeEach(async () => {
    const ids = await setupTestDb();
    adminId = ids.adminId;
    minor = new MinorService();
  });

  it("handles sprint creation with flexible numbering and sequential suggestions", () => {
    const next1 = minor.sprints.getNextNumber(adminId);
    expect(next1.nextNumber).toBeDefined();

    const sprint1 = minor.sprints.create(adminId, {
      startDate: "2026-09-07",
    });
    expect(sprint1.id).toBeDefined();
    expect(sprint1.sprintNumber).toBe(next1.nextNumber);

    // Custom numbering override e.g. "Reparatiesprint 1"
    const repSprint = minor.sprints.create(adminId, {
      sprintNumber: "Reparatiesprint 1",
      name: "Reparatiesprint A",
      startDate: "2026-09-21",
    });
    expect(repSprint.sprintNumber).toBe("Reparatiesprint 1");
    expect(repSprint.name).toBe("Reparatiesprint A");

    const sprintList = minor.sprints.list(adminId);
    expect(sprintList.length).toBeGreaterThanOrEqual(2);

    const full = minor.sprints.getById(sprint1.id, adminId);
    expect(full).not.toBeNull();
    expect(full?.selfEvaluations.length).toBe(5);
    expect(full?.teacherAssessments.length).toBe(5);
    expect(full?.reflection).not.toBeNull();
  });

  it("automatically calculates sprint status based on planned dates without archived", () => {
    // 1. Future sprint -> "planned"
    const futureSprint = minor.sprints.create(adminId, {
      startDate: "2099-01-01",
      durationDays: 14,
    });
    expect(futureSprint.status).toBe("planned");

    // 2. Past sprint -> "completed"
    const pastSprint = minor.sprints.create(adminId, {
      startDate: "2020-01-01",
      durationDays: 14,
    });
    expect(pastSprint.status).toBe("completed");

    // 3. Current active sprint (spanning today) -> "active"
    const today = new Date();
    const startObj = new Date(today);
    startObj.setDate(startObj.getDate() - 3);
    const startStr = `${startObj.getFullYear()}-${String(startObj.getMonth() + 1).padStart(2, "0")}-${String(startObj.getDate()).padStart(2, "0")}`;

    const activeSprint = minor.sprints.create(adminId, {
      startDate: startStr,
      durationDays: 14,
    });
    expect(activeSprint.status).toBe("active");

    // 4. Updating dates automatically updates status
    const updated = minor.sprints.update(futureSprint.id, adminId, {
      startDate: "2019-05-01",
      durationDays: 7,
    });
    expect(updated?.status).toBe("completed");

    // 5. listSprints dynamically reflects updated status
    const all = minor.sprints.list(adminId);
    const foundPast = all.find((s) => s.id === pastSprint.id);
    expect(foundPast?.status).toBe("completed");
  });
});
