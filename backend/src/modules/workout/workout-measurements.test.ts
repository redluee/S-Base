import { describe, expect, it, beforeEach } from "bun:test";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { setupTestDb } from "../../test-utils";
import db from "../../db/client";
import { eq } from "drizzle-orm";
import { measurementPhotos, measurements as measurementsTable } from "../../db/schema";
import { WorkoutService } from "./index";
import { call, login } from "./workout-test-utils";

const uploadsDir = join(import.meta.dir, "../../../uploads");

describe("WorkoutService measurements", () => {
  let measurements: WorkoutService["measurements"];
  let adminId: number;

  beforeEach(async () => {
    const ids = await setupTestDb();
    adminId = ids.adminId;
    db.delete(measurementsTable).where(eq(measurementsTable.userId, adminId)).run();
    measurements = new WorkoutService().measurements;
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
    measurements.save(adminId, { date: "2026-08-12", weight: 79.8 });

    const latest = measurements.getLatest(adminId);
    expect(latest).not.toBeNull();
    expect(latest?.date).toBe("2026-08-12");
    expect(latest?.weight).toBe(79.8);

    const list = measurements.list(adminId);
    expect(list.length).toBe(3);
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

    const deleted = await measurements.remove(entry!.measurementId, adminId);
    expect(deleted).toEqual({ success: true });
    expect(() => measurements.getById(entry!.measurementId)).toThrow("workout.measurementNotFound");
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
      expect(() => measurements.addPhoto(entry.measurementId, adminId, p)).toThrow("workout.invalidPhotoPath");
    }
    expect(measurements.getById(entry.measurementId)!.photos.length).toBe(0);

    for (const ext of ["avif", "bmp", "HEIC"]) {
      const withPhoto = measurements.addPhoto(entry.measurementId, adminId, `/api/uploads/measurement_${crypto.randomUUID()}.${ext}`);
      expect(withPhoto).not.toBeNull();
    }
    expect(measurements.getById(entry.measurementId)!.photos.length).toBe(3);
    await measurements.remove(entry.measurementId, adminId);
  });

  it("keeps legacy unprefixed photo rows readable and deletable", async () => {
    const entry = measurements.save(adminId, { date: "2026-08-03", weight: 75.0 })!;
    await mkdir(uploadsDir, { recursive: true });
    const legacyName = `${crypto.randomUUID()}.jpg`;
    const legacyPath = join(uploadsDir, legacyName);
    await writeFile(legacyPath, "legacy");
    const row = db.insert(measurementPhotos).values({ measurementId: entry.measurementId, filePath: `/api/uploads/${legacyName}` }).returning().get();

    expect(measurements.isForeignPhoto(adminId, legacyName)).toBe(false);
    expect(measurements.isForeignPhoto(adminId + 1000, legacyName)).toBe(true);
    expect(measurements.isForeignPhoto(adminId, `${crypto.randomUUID()}.jpg`)).toBe(false);
    expect(measurements.getById(entry.measurementId)!.photos.map((p) => p.filePath)).toEqual([`/api/uploads/${legacyName}`]);

    expect(await measurements.deletePhoto(row.photoId, adminId)).toEqual({ success: true });
    expect(existsSync(legacyPath)).toBe(false);
    await measurements.remove(entry.measurementId, adminId);
  });

  describe("BIZ-12 measurements", () => {
    it("moves a measurement to a new date instead of duplicating it", () => {
      const created = measurements.save(adminId, { date: "2026-03-01", weight: 80 })!;
      const moved = measurements.update(adminId, created.measurementId, { date: "2026-03-05", weight: 79 })!;
      expect(moved.measurementId).toBe(created.measurementId);
      expect(moved.date).toBe("2026-03-05");
      expect(moved.weight).toBe(79);
      expect(measurements.list(adminId).length).toBe(1);
    });

    it("clears fields explicitly with null and keeps untouched ones", () => {
      const created = measurements.save(adminId, { date: "2026-03-01", weight: 80, bodyFat: 15 })!;
      const updated = measurements.update(adminId, created.measurementId, { bodyFat: null })!;
      expect(updated.bodyFat).toBeNull();
      expect(updated.weight).toBe(80);
      expect(updated.date).toBe("2026-03-01");
    });

    it("rejects moving onto a date that already has a measurement", async () => {
      const a = measurements.save(adminId, { date: "2026-03-01", weight: 80 })!;
      const b = measurements.save(adminId, { date: "2026-03-02", weight: 81 })!;
      expect(() => measurements.update(adminId, a.measurementId, { date: "2026-03-02" })).toThrow("workout.measurementDateExists");

      const cookie = await login("admin");
      const res = await call(cookie, "PUT", `/api/measurements/${a.measurementId}`, { date: "2026-03-02" });
      expect(res.status).toBe(409);
      expect((await res.json() as { existingMeasurementId: number }).existingMeasurementId).toBe(b.measurementId);
      expect(measurements.list(adminId).length).toBe(2);
    });

    it("validates ids, dates and values", async () => {
      const cookie = await login("admin");
      const m = measurements.save(adminId, { date: "2026-03-01", weight: 80 })!;
      const checks: [string, string, unknown, number][] = [
        ["PUT", "/api/measurements/abc", { weight: 1 }, 400],
        ["PUT", `/api/measurements/${m.measurementId}`, { date: "2026-02-31" }, 400],
        ["PUT", `/api/measurements/${m.measurementId}`, { date: "yesterday" }, 400],
        ["PUT", `/api/measurements/${m.measurementId}`, { weight: "80" }, 400],
        ["PUT", `/api/measurements/${m.measurementId}`, { weight: -2 }, 400],
        ["PUT", "/api/measurements/999999", { weight: 1 }, 404],
        ["POST", "/api/measurements", { date: "2026-02-30", weight: 1 }, 400],
        ["POST", "/api/measurements", { date: "2026-03-01", weight: "heavy" }, 400],
        ["DELETE", "/api/measurements/abc", undefined, 400],
        ["DELETE", "/api/measurements/photos/abc", undefined, 400],
        ["POST", "/api/measurements/abc/photos", { filePath: "x" }, 400],
      ];
      for (const [method, path, body, status] of checks) {
        const res = await call(cookie, method, path, body);
        expect([method, path, JSON.stringify(body), res.status]).toEqual([method, path, JSON.stringify(body), status]);
      }
    });

    it("does not let another user edit a measurement", () => {
      const m = measurements.save(adminId, { date: "2026-03-01", weight: 80 })!;
      expect(() => measurements.update(adminId + 100, m.measurementId, { weight: 1 })).toThrow("workout.measurementNotFound");
    });
  });
});
