import { describe, expect, it, beforeEach } from "bun:test";
import { setupTestDb } from "../../test-utils";
import { MeasurementService } from "./index";

describe("MeasurementService", () => {
  let measurements: MeasurementService;
  let adminId: number;

  beforeEach(async () => {
    const ids = await setupTestDb();
    adminId = ids.adminId;
    measurements = new MeasurementService();
  });

  it("creates and updates measurements for a date", () => {
    const date = "2026-08-12";
    const created = measurements.save(adminId, {
      date,
      weight: 80.5,
      bodyFat: 15.2,
      waist: 82.0,
    });

    expect(created).not.toBeNull();
    expect(created?.weight).toBe(80.5);
    expect(created?.bodyFat).toBe(15.2);
    expect(created?.waist).toBe(82.0);

    // Saving same date updates existing entry
    const updated = measurements.save(adminId, {
      date,
      weight: 79.8,
      biceps: 38.5,
    });

    expect(updated?.measurementId).toBe(created?.measurementId);
    expect(updated?.weight).toBe(79.8);
    expect(updated?.biceps).toBe(38.5);
  });

  it("retrieves list and latest measurement", () => {
    measurements.save(adminId, { date: "2026-08-10", weight: 81.0 });
    measurements.save(adminId, { date: "2026-08-11", weight: 80.0 });

    const latest = measurements.getLatest(adminId);
    expect(latest).not.toBeNull();
    expect(latest?.date).toBe("2026-08-12");
    expect(latest?.weight).toBe(79.8);

    const list = measurements.list(adminId);
    expect(list.length).toBeGreaterThanOrEqual(2);
    expect(list[0].photos).toBeArray();
  });

  it("adds photo record and deletes measurement", async () => {
    const entry = measurements.save(adminId, { date: "2026-08-01", weight: 75.0 });
    expect(entry).not.toBeNull();

    const withPhoto = measurements.addPhoto(entry!.measurementId, "/uploads/photo1.jpg");
    expect(withPhoto?.photos.length).toBe(1);

    const deleted = await measurements.deleteMeasurement(entry!.measurementId, adminId);
    expect(deleted).toBe(true);
    expect(measurements.getById(entry!.measurementId)).toBeNull();
  });
});
