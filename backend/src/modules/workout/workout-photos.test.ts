import { UPLOADS_DIR } from "../../db/paths";
import { describe, expect, it, beforeEach, afterAll } from "bun:test";
import { existsSync } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { setupTestDb } from "../../test-utils";
import { app } from "../../index";
import { call, login } from "./workout-test-utils";
import { WorkoutService } from "./index";
import db from "../../db/client";
import { sql } from "drizzle-orm";
const uploadsDir = UPLOADS_DIR;

const createdFiles: string[] = [];

async function uploadFile(cookie: string, path: string, name: string, content = "data") {
  const form = new FormData();
  form.append("file", new File([content], name, { type: "application/octet-stream" }));
  return app.handle(
    new Request(`http://localhost${path}`, { method: "POST", headers: { Cookie: cookie }, body: form }),
  );
}

async function placeFile(name: string, content = "x") {
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(join(uploadsDir, name), content);
  createdFiles.push(name);
}

afterAll(async () => {
  for (const f of createdFiles) await unlink(join(uploadsDir, f)).catch(() => {});
});

describe("measurement photo and upload security", () => {
  let measurements: WorkoutService["measurements"];
  let adminId: number;
  let testerId: number;

  beforeEach(async () => {
    const ids = await setupTestDb();
    adminId = ids.adminId;
    testerId = ids.testerId;
    measurements = new WorkoutService().measurements;
  });

  it("SEC-02: cannot attach a photo to another user's measurement", async () => {
    const victimEntry = measurements.save(testerId, { date: "2026-03-01", weight: 70 })!;
    const name = `measurement_${crypto.randomUUID()}.jpg`;
    await placeFile(name);
    expect(() => measurements.addPhoto(victimEntry.measurementId, adminId, `/api/uploads/${name}`)).toThrow(
      "workout.measurementNotFound",
    );
    expect(measurements.getById(victimEntry.measurementId)!.photos.length).toBe(0);
  });

  it("SEC-02: rejects arbitrary or traversal file paths", () => {
    const mine = measurements.save(adminId, { date: "2026-03-02", weight: 70 })!;
    const bad = [
      "/api/uploads/../../sbase.db",
      "/api/uploads/../src/index.ts",
      "../../sbase.db",
      "/etc/passwd",
      "/api/uploads/page.html",
      "/api/uploads/someone-elses-contract.pdf",
      "",
      null,
      42,
    ];
    for (const p of bad) {
      expect(() => measurements.addPhoto(mine.measurementId, adminId, p as string)).toThrow();
    }
    expect(measurements.getById(mine.measurementId)!.photos.length).toBe(0);
  });

  it("SEC-02: a file already linked to another entry cannot be linked again, and shared files are not deleted", async () => {
    const victimEntry = measurements.save(testerId, { date: "2026-03-03", weight: 70 })!;
    const name = `measurement_${crypto.randomUUID()}.png`;
    await placeFile(name);
    measurements.addPhoto(victimEntry.measurementId, testerId, `/api/uploads/${name}`);

    const mine = measurements.save(adminId, { date: "2026-03-04", weight: 70 })!;
    expect(() => measurements.addPhoto(mine.measurementId, adminId, `/api/uploads/${name}`)).toThrow(
      "workout.photoInUse",
    );

    await measurements.remove(mine.measurementId, adminId);
    expect(existsSync(join(uploadsDir, name))).toBe(true);
  });

  it("SEC-02: deleting an entry only removes files inside uploads and does not follow tampered paths", async () => {
    const entry = measurements.save(adminId, { date: "2026-03-05", weight: 70 })!;
    const outside = join(uploadsDir, "..", `outside-${crypto.randomUUID()}.txt`);
    await writeFile(outside, "keep");
    db.run(
      sql.raw(
        `INSERT INTO measurement_photos (measurement_id, file_path) VALUES (${entry.measurementId}, '/api/uploads/../${outside.split("/").pop()}')`,
      ),
    );
    await measurements.remove(entry.measurementId, adminId);
    expect(existsSync(outside)).toBe(true);
    await unlink(outside);
  });

  it("SEC-04: a cashflow upload cannot be attached to a measurement", async () => {
    const cookie = await login("admin");
    const res = await uploadFile(cookie, "/api/cashflow/upload", "invoice.jpg");
    const { filePath } = (await res.json()) as { filePath: string };
    const name = filePath.split("/").pop()!;
    createdFiles.push(name);
    expect(name).not.toStartWith("measurement_");

    const entry = measurements.save(adminId, { date: "2026-03-08", weight: 70 })!;
    const attach = await call(cookie, "POST", `/api/measurements/${entry.measurementId}/photos`, { filePath });
    expect(attach.status).toBe(400);
    expect(measurements.getById(entry.measurementId)!.photos.length).toBe(0);
    expect(existsSync(join(uploadsDir, name))).toBe(true);
  });

  it("SEC-03: attached measurement photos are only served to their owner, with safe headers", async () => {
    const adminCookie = await login("admin");
    const testerCookie = await login("tester");
    const entry = measurements.save(adminId, { date: "2026-03-06", weight: 70 })!;
    const name = `measurement_${crypto.randomUUID()}.jpg`;
    await placeFile(name, "img");
    measurements.addPhoto(entry.measurementId, adminId, `/api/uploads/${name}`);

    const owner = await call(adminCookie, "GET", `/api/uploads/${name}`);
    expect(owner.status).toBe(200);
    expect(owner.headers.get("x-content-type-options")).toBe("nosniff");
    expect(owner.headers.get("content-type")).toBe("image/jpeg");

    const other = await call(testerCookie, "GET", `/api/uploads/${name}`);
    expect(other.status).toBe(404);

    const anon = await app.handle(new Request(`http://localhost/api/uploads/${name}`));
    expect(anon.status).toBe(401);
  });

  it("POST /:id/photos enforces ownership over HTTP", async () => {
    const adminCookie = await login("admin");
    const victimEntry = measurements.save(testerId, { date: "2026-03-07", weight: 70 })!;
    const name = `measurement_${crypto.randomUUID()}.jpg`;
    await placeFile(name);
    const res = await call(adminCookie, "POST", `/api/measurements/${victimEntry.measurementId}/photos`, {
      filePath: `/api/uploads/${name}`,
    });
    expect(res.status).toBe(404);
    const bad = await call(adminCookie, "POST", `/api/measurements/${victimEntry.measurementId}/photos`, {
      filePath: "../../sbase.db",
    });
    expect(bad.status).toBe(400);
  });
});
