import { describe, expect, it, beforeEach } from "bun:test";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { setupTestDb } from "../../test-utils";
import db from "../../db/client";
import { measurementPhotos } from "../../db/schema";
import { MeasurementService } from "./index";

const uploadsDir = join(import.meta.dir, "../../../uploads");

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

    await mkdir(uploadsDir, { recursive: true });
    const photoName = `measurement_${crypto.randomUUID()}.jpg`;
    const photoPath = join(uploadsDir, photoName);
    await writeFile(photoPath, "test");

    const withPhoto = measurements.addPhoto(entry!.measurementId, adminId, `/api/uploads/${photoName}`);
    expect(withPhoto?.photos.length).toBe(1);

    const deleted = await measurements.deleteMeasurement(entry!.measurementId, adminId);
    expect(deleted).toBe(true);
    expect(measurements.getById(entry!.measurementId)).toBeNull();
    expect(existsSync(photoPath)).toBe(false);
  });

  it("requires the measurement_ prefix for new photo attaches", async () => {
    const entry = measurements.save(adminId, { date: "2026-08-02", weight: 75.0 })!;
    const uuid = crypto.randomUUID();
    for (const p of [
      `/api/uploads/${uuid}.jpg`,
      `/api/uploads/minor_${uuid}.jpg`,
      `/api/uploads/wine_${uuid}.png`,
      `/api/uploads/measurement_${uuid}.pdf`,
      `/api/uploads/measurement_${uuid}.svg`,
    ]) {
      expect(() => measurements.addPhoto(entry.measurementId, adminId, p)).toThrow("Invalid photo path");
    }
    expect(measurements.getById(entry.measurementId)!.photos.length).toBe(0);

    for (const ext of ["avif", "bmp", "HEIC"]) {
      const withPhoto = measurements.addPhoto(entry.measurementId, adminId, `/api/uploads/measurement_${crypto.randomUUID()}.${ext}`);
      expect(withPhoto).not.toBeNull();
    }
    expect(measurements.getById(entry.measurementId)!.photos.length).toBe(3);
    await measurements.deleteMeasurement(entry.measurementId, adminId);
  });

  it("keeps legacy unprefixed photo rows readable and deletable", async () => {
    const entry = measurements.save(adminId, { date: "2026-08-03", weight: 75.0 })!;
    await mkdir(uploadsDir, { recursive: true });
    const legacyName = `${crypto.randomUUID()}.jpg`;
    const legacyPath = join(uploadsDir, legacyName);
    await writeFile(legacyPath, "legacy");
    const row = db.insert(measurementPhotos).values({ measurementId: entry.measurementId, filePath: `/api/uploads/${legacyName}` }).returning().get();

    expect(measurements.ownsPhotoFile(adminId, legacyName)).toBe(true);
    expect(measurements.ownsPhotoFile(adminId + 1000, legacyName)).toBe(false);
    expect(measurements.getById(entry.measurementId)!.photos.map((p: any) => p.filePath)).toEqual([`/api/uploads/${legacyName}`]);

    expect(await measurements.deletePhoto(row.photoId, adminId)).toBe(true);
    expect(existsSync(legacyPath)).toBe(false);
    await measurements.deleteMeasurement(entry.measurementId, adminId);
  });
});
