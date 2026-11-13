import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { hashPassword } from "../auth";
import db from "../db/client";
import { modules, usermodulepermissions, users } from "../db/schema";
import { call, login, upload } from "../test-http";
import { setupTestDb } from "../test-utils";
import { removeUpload, uploadPath } from "../utils/uploads";

const minorFile = `minor_${crypto.randomUUID()}.pdf`;
const legacyFile = `${crypto.randomUUID()}.pdf`;
const resumeFile = `resume_${crypto.randomUUID()}.jpg`;

describe("GET /api/uploads/:filename", () => {
  let workoutOnly: string;
  let admin: string;

  beforeAll(async () => {
    await setupTestDb();
    for (const name of [minorFile, legacyFile, resumeFile]) await Bun.write(uploadPath(name), "x");
    const { userId } = db
      .insert(users)
      .values({ username: "uploads-workout-only", pswdHash: await hashPassword("uploads-workout-only") })
      .returning()
      .get();
    const workoutModule = db.select().from(modules).where(eq(modules.moduleName, "workout")).get()!;
    db.insert(usermodulepermissions).values({ userId, moduleId: workoutModule.moduleId }).run();
    workoutOnly = await login("uploads-workout-only");
    admin = await login("admin");
  });

  afterAll(async () => {
    for (const name of [minorFile, legacyFile, resumeFile]) await removeUpload(name);
  });

  it("serves a module's upload only to users with that module", async () => {
    expect((await call(admin, "GET", `/api/uploads/${minorFile}`)).status).toBe(200);
    const denied = await call(workoutOnly, "GET", `/api/uploads/${minorFile}`);
    expect(denied.status).toBe(404);
    expect(await denied.json()).toEqual({ error: "common.notFound" });
  });

  it("keeps legacy unprefixed uploads readable for signed-in users", async () => {
    expect((await call(workoutOnly, "GET", `/api/uploads/${legacyFile}`)).status).toBe(200);
  });

  it("never serves resume photos and requires a session", async () => {
    expect((await call(admin, "GET", `/api/uploads/${resumeFile}`)).status).toBe(404);
    expect((await call("", "GET", `/api/uploads/${legacyFile}`)).status).toBe(401);
  });
});

const policyFiles: string[] = [];
const uploadFile = (cookie: string, path: string, name: string, content = "data") =>
  upload(cookie, path, [new File([content], name, { type: "application/octet-stream" })], "file");

async function placeFile(name: string, content = "x") {
  await Bun.write(uploadPath(name), content);
  policyFiles.push(name);
}

describe("upload type policy", () => {
  const createdFiles = policyFiles;

  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    for (const name of policyFiles) await removeUpload(name);
  });

  it("SEC-03: uploads reject executable or markup extensions and keep safe ones", async () => {
    const cookie = await login("admin");
    for (const bad of ["evil.html", "evil.svg", "evil.js", "evil.php", "noext", "evil.jpg.html", "evil."]) {
      const res = await uploadFile(cookie, "/api/measurements/upload", bad);
      expect([bad, res.status]).toEqual([bad, 400]);
    }
    const ok = await uploadFile(cookie, "/api/measurements/upload", "Photo.JPG");
    expect(ok.status).toBe(200);
    const { filePath } = (await ok.json()) as { filePath: string };
    expect(filePath).toMatch(/^\/api\/uploads\/measurement_[0-9a-f-]{36}\.jpg$/);
    createdFiles.push(filePath.split("/").pop()!);

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
      for (const name of [
        "evidence.zip",
        "demo.mp4",
        "clip.MOV",
        "talk.webm",
        "audio.mp3",
        "voice.m4a",
        "notes.odt",
        "sheet.ods",
        "deck.odp",
        "letter.rtf",
        "export.json",
        "pic.avif",
        "scan.bmp",
        "report.pdf",
      ]) {
        const res = await uploadFile(cookie, path, name);
        expect([path, name, res.status]).toEqual([path, name, 200]);
        const { filePath } = (await res.json()) as { filePath: string };
        createdFiles.push(filePath.split("/").pop()!);
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
        const { filename, filePath } = (await res.json()) as { filename?: string; filePath?: string };
        createdFiles.push((filePath ?? filename ?? "").split("/").pop() ?? "");
      }
      for (const bad of ["evidence.zip", "demo.mp4", "report.pdf", "export.json"]) {
        const res = await uploadFile(cookie, path, bad);
        expect([path, bad, res.status]).toEqual([path, bad, 400]);
      }
    }

    const zip = await uploadFile(cookie, "/api/minor/upload", "evidence.zip");
    const { filePath } = (await zip.json()) as { filePath: string };
    createdFiles.push(filePath.split("/").pop()!);
    const served = await call(cookie, "GET", filePath);
    expect(served.status).toBe(200);
    expect(served.headers.get("content-type")).toBe("application/octet-stream");
    expect(served.headers.get("content-disposition")).toBe("attachment");

    const avif = await uploadFile(cookie, "/api/minor/upload", "slide.avif");
    const avifPath = ((await avif.json()) as { filePath: string }).filePath;
    createdFiles.push(avifPath.split("/").pop()!);
    const avifServed = await call(cookie, "GET", avifPath);
    expect(avifServed.headers.get("content-type")).toBe("image/avif");
    expect(avifServed.headers.get("content-disposition")).toBeNull();
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
});
