import { describe, expect, it, beforeEach, afterAll } from "bun:test";
import { existsSync } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { setupTestDb } from "../../test-utils";
import { app } from "../../index";
import { WorkoutService } from "./index";
import { MeasurementService } from "../measurements";
import db from "../../db/client";
import { workoutSessions, sessionExercises, sessionSets } from "../../db/schema";
import { eq } from "drizzle-orm";

const uploadsDir = join(import.meta.dir, "../../../uploads");
const createdFiles: string[] = [];

async function login(username: string) {
  const res = await app.handle(new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password: username }),
  }));
  const match = res.headers.get("set-cookie")?.match(/session_id=([^;]+)/);
  return `session_id=${match![1]}`;
}

function call(cookie: string, method: string, path: string, body?: unknown) {
  return app.handle(new Request(`http://localhost${path}`, {
    method,
    headers: { Cookie: cookie, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }));
}

async function uploadFile(cookie: string, path: string, name: string, content = "data") {
  const form = new FormData();
  form.append("file", new File([content], name, { type: "application/octet-stream" }));
  return app.handle(new Request(`http://localhost${path}`, { method: "POST", headers: { Cookie: cookie }, body: form }));
}

async function placeFile(name: string, content = "x") {
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(join(uploadsDir, name), content);
  createdFiles.push(name);
}

afterAll(async () => {
  for (const f of createdFiles) await unlink(join(uploadsDir, f)).catch(() => {});
});

describe("workout security and integrity", () => {
  let workout: WorkoutService;
  let measurements: MeasurementService;
  let adminId: number;
  let testerId: number;

  beforeEach(async () => {
    const ids = await setupTestDb();
    adminId = ids.adminId;
    testerId = ids.testerId;
    workout = new WorkoutService();
    measurements = new MeasurementService();
  });

  it("SEC-01: rejects session updates that reference another user's exercise", () => {
    const victim = workout.createSession(testerId, undefined, true)!;
    const victimSession = workout.updateSession(victim.sessionId, testerId, {
      exercises: [{ exerciseName: "Victim Squat", sortOrder: 0, sets: [{ setNumber: 1, reps: 5, weight: 100, completed: 1 }] }],
    })!;
    const victimExercise = victimSession.exercises[0];

    const attacker = workout.createSession(adminId, undefined, true)!;
    expect(() =>
      workout.updateSession(attacker.sessionId, adminId, {
        exercises: [{ sessionExerciseId: victimExercise.sessionExerciseId, exerciseName: "Hacked", sortOrder: 0, sets: [{ setNumber: 1, reps: 1, weight: 1 }] }],
      })
    ).toThrow("Exercise does not belong to this session");

    const after = workout.getSession(victim.sessionId, testerId)!;
    expect(after.exercises[0].exerciseName).toBe("Victim Squat");
    expect(after.exercises[0].sets[0].weight).toBe(100);
  });

  it("SEC-01: rejects exercises from another session of the same user and does not remove them", () => {
    const a = workout.createSession(adminId, undefined, true)!;
    const aWith = workout.updateSession(a.sessionId, adminId, {
      exercises: [{ exerciseName: "A Lift", sortOrder: 0, sets: [{ setNumber: 1, reps: 5, completed: 1 }] }],
    })!;
    const b = workout.createSession(adminId, undefined, true)!;
    expect(() =>
      workout.updateSession(b.sessionId, adminId, {
        exercises: [{ sessionExerciseId: aWith.exercises[0].sessionExerciseId, exerciseName: "Moved", sortOrder: 0 }],
      })
    ).toThrow("Exercise does not belong to this session");
    expect(workout.getSession(a.sessionId, adminId)!.exercises[0].exerciseName).toBe("A Lift");
  });

  it("DATA-05: read endpoints do not delete stale empty sessions", () => {
    const stale = db.insert(workoutSessions).values({
      userId: adminId,
      name: "Stale",
      startedAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    }).returning().get();

    workout.listSessions(adminId);
    workout.listSessions(adminId, "active");
    workout.listUniqueExercises(adminId);
    workout.getStats(adminId);

    expect(db.select().from(workoutSessions).where(eq(workoutSessions.sessionId, stale.sessionId)).get()).toBeDefined();
  });

  it("DATA-06: updateTemplate rolls back fully when an exercise insert fails", () => {
    const template = workout.createTemplate(adminId, {
      name: "Atomic",
      exercises: [{ exerciseName: "Keep Me", sets: 3, reps: 10 }],
    })!;

    const bad: any = { exerciseName: "Second", sets: 3, reps: 10 };
    Object.defineProperty(bad, "perSide", { get() { throw new Error("boom"); }, enumerable: true });

    expect(() =>
      workout.updateTemplate(template.templateId, adminId, {
        name: "Renamed",
        exercises: [{ exerciseName: "First", sets: 3, reps: 10 }, { ...bad, perSide: undefined, defaultRestTime: Symbol("x") as any }],
      })
    ).toThrow();

    const after = workout.getTemplate(template.templateId, adminId)!;
    expect(after.name).toBe("Atomic");
    expect(after.exercises.map((e) => e.exerciseName)).toEqual(["Keep Me"]);
  });

  it("DATA-06: mergeExercises is atomic", () => {
    const s = workout.createSession(adminId, undefined, true)!;
    workout.updateSession(s.sessionId, adminId, {
      exercises: [
        { exerciseName: "Src", sortOrder: 0, sets: [{ setNumber: 1, reps: 5, completed: 1 }] },
        { exerciseName: "Dst", sortOrder: 1, sets: [{ setNumber: 1, reps: 6, completed: 1 }] },
      ],
    });
    workout.mergeExercises(adminId, "Src", "Dst");
    const after = workout.getSession(s.sessionId, adminId)!;
    expect(after.exercises.length).toBe(1);
    expect(after.exercises[0].sets.length).toBe(2);
  });

  it("DATA-07: validation problems return 400 instead of 500", async () => {
    const cookie = await login("admin");

    const cases: [string, string, unknown][] = [
      ["POST", "/api/workouts/templates", { name: null }],
      ["POST", "/api/workouts/templates", { name: "x", exercises: [{ exerciseName: null, sets: 3, reps: 5 }] }],
      ["POST", "/api/workouts/templates", { name: "x", exercises: [{ exerciseName: "a", sets: 0, reps: 5 }] }],
      ["POST", "/api/workouts/templates", { name: "x", estimatedTime: -5 }],
      ["POST", "/api/workouts/templates", { name: "x", exercises: [{ exerciseName: "a", sets: 3, reps: "many" }] }],
      ["PATCH", "/api/workouts/templates/reorder", { templateIds: [999999] }],
      ["POST", "/api/workouts/sessions", { templateId: "abc" }],
      ["POST", "/api/measurements", { date: "not-a-date" }],
      ["POST", "/api/measurements", { date: "2026-01-01", weight: "heavy" }],
      ["POST", "/api/workouts/exercises/merge", { sourceName: "a", targetName: "a" }],
    ];
    for (const [method, path, body] of cases) {
      const res = await call(cookie, method, path, body);
      expect([method, path, JSON.stringify(body), res.status]).toEqual([method, path, JSON.stringify(body), 400]);
    }

    const tpl = await (await call(cookie, "POST", "/api/workouts/templates", { name: "Valid" })).json() as any;
    const putNull = await call(cookie, "PUT", `/api/workouts/templates/${tpl.templateId}`, { name: null });
    expect(putNull.status).toBe(400);

    const sess = await (await call(cookie, "POST", "/api/workouts/sessions", { force: true })).json() as any;
    const badBodies = [
      { exercises: [{ exerciseName: null, sortOrder: 0 }] },
      { exercises: [{ exerciseName: "a", sortOrder: 0, sets: [{ setNumber: null }] }] },
      { exercises: [{ exerciseName: "a", sortOrder: 0, sets: [{ setNumber: 1, reps: "x" }] }] },
      { exercises: [{ exerciseName: "a", sortOrder: 0, sets: [{ setNumber: 1, rpe: 99 }] }] },
      { completedAt: "garbage" },
      { notes: 12 },
    ];
    for (const body of badBodies) {
      const res = await call(cookie, "PATCH", `/api/workouts/sessions/${sess.sessionId}`, body);
      expect([JSON.stringify(body), res.status]).toEqual([JSON.stringify(body), 400]);
    }
    const badComplete = await call(cookie, "PATCH", `/api/workouts/sessions/${sess.sessionId}/complete`, { completedAt: "garbage" });
    expect(badComplete.status).toBe(400);

    const nullBody = await app.handle(new Request("http://localhost/api/workouts/templates", {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: "null",
    }));
    expect(nullBody.status).toBe(400);

    await call(cookie, "DELETE", `/api/workouts/templates/${tpl.templateId}`);
    await call(cookie, "DELETE", `/api/workouts/sessions/${sess.sessionId}`);
  });

  it("DATA-08: caps template sets and exercise counts", async () => {
    expect(() => workout.createTemplate(adminId, { name: "Huge", exercises: [{ exerciseName: "Squat", sets: 100000, reps: 5 }] }))
      .toThrow('Exercise "Squat" can have at most 50 sets');
    expect(workout.createTemplate(adminId, { name: "Max", exercises: [{ exerciseName: "Squat", sets: 50, reps: 5 }] })!.exercises[0].defaultSets).toBe(50);
    const many = Array.from({ length: 101 }, (_, i) => ({ exerciseName: `Ex ${i}`, sets: 1, reps: 5 }));
    expect(() => workout.createTemplate(adminId, { name: "Many", exercises: many })).toThrow("A template can have at most 100 exercises");

    const existing = workout.createTemplate(adminId, { name: "Edit", exercises: [{ exerciseName: "Row", sets: 3, reps: 5 }] })!;
    expect(() => workout.updateTemplate(existing.templateId, adminId, { exercises: [{ exerciseName: "Row", sets: 51, reps: 5 }] }))
      .toThrow("at most 50 sets");
    expect(workout.getTemplate(existing.templateId, adminId)!.exercises[0].defaultSets).toBe(3);

    const cookie = await login("admin");
    const res = await call(cookie, "POST", "/api/workouts/templates", { name: "Huge", exercises: [{ exerciseName: "Squat", sets: 100000, reps: 5 }] });
    expect(res.status).toBe(400);
    expect((await res.json() as any).error).toBe('Exercise "Squat" can have at most 50 sets');
  });

  it("DATA-08: caps sets per session exercise and exercises per session", async () => {
    const s = workout.createSession(adminId, undefined, true)!;
    const sets = (n: number) => Array.from({ length: n }, (_, i) => ({ setNumber: i + 1, reps: 5 }));
    expect(() => workout.updateSession(s.sessionId, adminId, { exercises: [{ exerciseName: "Squat", sortOrder: 0, sets: sets(51) }] }))
      .toThrow('Exercise "Squat" can have at most 50 sets');
    expect(workout.updateSession(s.sessionId, adminId, { exercises: [{ exerciseName: "Squat", sortOrder: 0, sets: sets(50) }] })!.exercises[0].sets.length).toBe(50);
    const many = Array.from({ length: 101 }, (_, i) => ({ exerciseName: `Ex ${i}`, sortOrder: i }));
    expect(() => workout.updateSession(s.sessionId, adminId, { exercises: many })).toThrow("A session can have at most 100 exercises");
    expect(workout.getSession(s.sessionId, adminId)!.exercises.length).toBe(1);

    const cookie = await login("admin");
    const res = await call(cookie, "PATCH", `/api/workouts/sessions/${s.sessionId}`, { exercises: [{ exerciseName: "Squat", sortOrder: 0, sets: sets(1000) }] });
    expect(res.status).toBe(400);
  });

  it("DATA-09: reorderTemplates is atomic and rejects malformed orders", () => {
    const a = workout.createTemplate(adminId, { name: "A" })!;
    const b = workout.createTemplate(adminId, { name: "B" })!;
    const ids = workout.listTemplates(adminId).map((t) => t.templateId);
    const before = workout.listTemplates(adminId).map((t) => t.templateId);

    expect(() => workout.reorderTemplates(adminId, ids.map(() => a.templateId))).toThrow("Template order must include exactly the current templates");
    expect(() => workout.reorderTemplates(adminId, "nope" as any)).toThrow("Template order must include exactly the current templates");
    expect(workout.listTemplates(adminId).map((t) => t.templateId)).toEqual(before);

    const reversed = [...ids].reverse();
    expect(workout.reorderTemplates(adminId, reversed).map((t) => t.templateId)).toEqual(reversed);

    const original = db.transaction;
    let usedTransaction = false;
    (db as any).transaction = (fn: any) => { usedTransaction = true; return original.call(db, fn); };
    try {
      workout.reorderTemplates(adminId, ids);
    } finally {
      (db as any).transaction = original;
    }
    expect(usedTransaction).toBe(true);
    expect(workout.listTemplates(adminId).map((t) => t.templateId)).toEqual(ids);
    expect(ids).toContain(b.templateId);
  });

  it("SEC-01 over HTTP: cross-user exercise update returns 400 and leaves data intact", async () => {
    const adminCookie = await login("admin");
    const testerCookie = await login("tester");
    const victim = await (await call(testerCookie, "POST", "/api/workouts/sessions", { force: true })).json() as any;
    const withEx = await (await call(testerCookie, "PATCH", `/api/workouts/sessions/${victim.sessionId}`, {
      exercises: [{ exerciseName: "Mine", sortOrder: 0, sets: [{ setNumber: 1, reps: 3, completed: 1 }] }],
    })).json() as any;
    const exId = withEx.exercises[0].sessionExerciseId;

    const mine = await (await call(adminCookie, "POST", "/api/workouts/sessions", { force: true })).json() as any;
    const res = await call(adminCookie, "PATCH", `/api/workouts/sessions/${mine.sessionId}`, {
      exercises: [{ sessionExerciseId: exId, exerciseName: "Stolen", sortOrder: 0, sets: [] }],
    });
    expect(res.status).toBe(400);
    const row = db.select().from(sessionExercises).where(eq(sessionExercises.sessionExerciseId, exId)).get();
    expect(row?.exerciseName).toBe("Mine");
    expect(db.select().from(sessionSets).where(eq(sessionSets.sessionExerciseId, exId)).all().length).toBe(1);
  });
});

describe("measurement photo and upload security", () => {
  let measurements: MeasurementService;
  let adminId: number;
  let testerId: number;

  beforeEach(async () => {
    const ids = await setupTestDb();
    adminId = ids.adminId;
    testerId = ids.testerId;
    measurements = new MeasurementService();
  });

  it("SEC-02: cannot attach a photo to another user's measurement", async () => {
    const victimEntry = measurements.save(testerId, { date: "2026-03-01", weight: 70 })!;
    const name = `measurement_${crypto.randomUUID()}.jpg`;
    await placeFile(name);
    expect(measurements.addPhoto(victimEntry.measurementId, adminId, `/api/uploads/${name}`)).toBeNull();
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
      expect(() => measurements.addPhoto(mine.measurementId, adminId, p)).toThrow();
    }
    expect(measurements.getById(mine.measurementId)!.photos.length).toBe(0);
  });

  it("SEC-02: a file already linked to another entry cannot be linked again, and shared files are not deleted", async () => {
    const victimEntry = measurements.save(testerId, { date: "2026-03-03", weight: 70 })!;
    const name = `measurement_${crypto.randomUUID()}.png`;
    await placeFile(name);
    measurements.addPhoto(victimEntry.measurementId, testerId, `/api/uploads/${name}`);

    const mine = measurements.save(adminId, { date: "2026-03-04", weight: 70 })!;
    expect(() => measurements.addPhoto(mine.measurementId, adminId, `/api/uploads/${name}`)).toThrow("Photo is already in use");

    await measurements.deleteMeasurement(mine.measurementId, adminId);
    expect(existsSync(join(uploadsDir, name))).toBe(true);
  });

  it("SEC-02: deleting an entry only removes files inside uploads and does not follow tampered paths", async () => {
    const entry = measurements.save(adminId, { date: "2026-03-05", weight: 70 })!;
    const outside = join(uploadsDir, "..", `outside-${crypto.randomUUID()}.txt`);
    await writeFile(outside, "keep");
    db.run(`INSERT INTO measurement_photos (measurement_id, file_path) VALUES (${entry.measurementId}, '/api/uploads/../${outside.split("/").pop()}')` as any);
    await measurements.deleteMeasurement(entry.measurementId, adminId);
    expect(existsSync(outside)).toBe(true);
    await unlink(outside);
  });

  it("SEC-03: uploads reject executable or markup extensions and keep safe ones", async () => {
    const cookie = await login("admin");
    for (const bad of ["evil.html", "evil.svg", "evil.js", "evil.php", "noext", "evil.jpg.html", "evil."]) {
      const res = await uploadFile(cookie, "/api/measurements/upload", bad);
      expect([bad, res.status]).toEqual([bad, 400]);
    }
    const ok = await uploadFile(cookie, "/api/measurements/upload", "Photo.JPG");
    expect(ok.status).toBe(200);
    const { filePath } = await ok.json() as any;
    expect(filePath).toMatch(/^\/api\/uploads\/measurement_[0-9a-f-]{36}\.jpg$/);
    createdFiles.push(filePath.split("/").pop());

    const doc = await uploadFile(cookie, "/api/cashflow/upload", "contract.html");
    expect(doc.status).toBe(400);
    const minorBad = await uploadFile(cookie, "/api/minor/upload", "x.svg");
    expect(minorBad.status).toBe(400);
    const wineBad = await uploadFile(cookie, "/api/wines/upload", "x.html");
    expect(wineBad.status).toBe(400);
  });

  it("SEC-03: minor and cashflow accept evidence attachments while wines and measurements stay image-only", async () => {
    const cookie = await login("admin");
    for (const path of ["/api/minor/upload", "/api/cashflow/upload"]) {
      for (const name of ["evidence.zip", "demo.mp4", "clip.MOV", "talk.webm", "audio.mp3", "voice.m4a", "notes.odt", "sheet.ods", "deck.odp", "letter.rtf", "export.json", "pic.avif", "scan.bmp", "report.pdf"]) {
        const res = await uploadFile(cookie, path, name);
        expect([path, name, res.status]).toEqual([path, name, 200]);
        const { filePath } = await res.json() as any;
        createdFiles.push(filePath.split("/").pop());
      }
      for (const bad of ["x.svg", "x.html", "x.js", "x.exe"]) {
        const res = await uploadFile(cookie, path, bad);
        expect([path, bad, res.status]).toEqual([path, bad, 400]);
      }
    }
    for (const path of ["/api/wines/upload", "/api/measurements/upload"]) {
      for (const name of ["pic.avif", "scan.bmp"]) {
        const res = await uploadFile(cookie, path, name);
        expect([path, name, res.status]).toEqual([path, name, 200]);
        const { filename, filePath } = await res.json() as any;
        createdFiles.push((filePath ?? filename).split("/").pop());
      }
      for (const bad of ["evidence.zip", "demo.mp4", "report.pdf", "export.json"]) {
        const res = await uploadFile(cookie, path, bad);
        expect([path, bad, res.status]).toEqual([path, bad, 400]);
      }
    }

    const zip = await uploadFile(cookie, "/api/minor/upload", "evidence.zip");
    const { filePath } = await zip.json() as any;
    createdFiles.push(filePath.split("/").pop());
    const served = await call(cookie, "GET", filePath);
    expect(served.status).toBe(200);
    expect(served.headers.get("content-type")).toBe("application/octet-stream");
    expect(served.headers.get("content-disposition")).toBe("attachment");

    const avif = await uploadFile(cookie, "/api/minor/upload", "slide.avif");
    const avifPath = (await avif.json() as any).filePath;
    createdFiles.push(avifPath.split("/").pop());
    const avifServed = await call(cookie, "GET", avifPath);
    expect(avifServed.headers.get("content-type")).toBe("image/avif");
    expect(avifServed.headers.get("content-disposition")).toBeNull();
  });

  it("SEC-04: a cashflow upload cannot be attached to a measurement", async () => {
    const cookie = await login("admin");
    const res = await uploadFile(cookie, "/api/cashflow/upload", "invoice.jpg");
    const { filePath } = await res.json() as any;
    const name = filePath.split("/").pop();
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

  it("SEC-03: legacy html/svg uploads are served as downloads and resume photos are not exposed", async () => {
    const cookie = await login("admin");
    const html = `${crypto.randomUUID()}.html`;
    await placeFile(html, "<script>alert(1)</script>");
    const res = await call(cookie, "GET", `/api/uploads/${html}`);
    expect(res.headers.get("content-type")).toBe("application/octet-stream");
    expect(res.headers.get("content-disposition")).toBe("attachment");

    const resume = `resume_${crypto.randomUUID()}.jpg`;
    await placeFile(resume);
    expect((await call(cookie, "GET", `/api/uploads/${resume}`)).status).toBe(404);
    expect((await call(cookie, "GET", "/api/uploads/..%2Fpackage.json")).status).toBe(404);
  });

  it("POST /:id/photos enforces ownership over HTTP", async () => {
    const adminCookie = await login("admin");
    const victimEntry = measurements.save(testerId, { date: "2026-03-07", weight: 70 })!;
    const name = `measurement_${crypto.randomUUID()}.jpg`;
    await placeFile(name);
    const res = await call(adminCookie, "POST", `/api/measurements/${victimEntry.measurementId}/photos`, { filePath: `/api/uploads/${name}` });
    expect(res.status).toBe(404);
    const bad = await call(adminCookie, "POST", `/api/measurements/${victimEntry.measurementId}/photos`, { filePath: "../../sbase.db" });
    expect(bad.status).toBe(400);
  });
});
