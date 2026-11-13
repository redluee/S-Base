import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { hashPassword } from "../auth";
import db from "../db/client";
import { modules, usermodulepermissions, users } from "../db/schema";
import { call, login } from "../test-http";
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
