import { beforeEach, describe, expect, it } from "bun:test";
import { app } from "../index";
import { setupTestDb } from "../test-utils";

async function login() {
  const res = await app.handle(
    new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "admin" }),
    }),
  );
  const match = (res.headers.get("set-cookie") ?? "").match(/session_id=([^;]+)/);
  return `session_id=${match?.[1] ?? ""}`;
}

function call(cookie: string, method: string, path: string, body?: unknown) {
  return app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

const period = { startMonth: 1, startYear: 2020, endMonth: 6, endYear: 2021, isCurrent: false };

describe("resume routes error contract", () => {
  let cookie: string;

  beforeEach(async () => {
    await setupTestDb();
    cookie = await login();
  });

  it("maps missing records to 404 with resume keys", async () => {
    const cases: Array<[string, string, string, unknown?]> = [
      ["GET", "/api/resume/resumes/999999", "resume.notFound"],
      ["DELETE", "/api/resume/resumes/999999", "resume.notFound"],
      ["POST", "/api/resume/resumes/999999/duplicate", "resume.notFound"],
      ["PUT", "/api/resume/resumes/999999/items", "resume.notFound", { items: [] }],
      ["PUT", "/api/resume/experiences/999999", "resume.experienceNotFound", { company: "X" }],
      ["DELETE", "/api/resume/experiences/999999", "resume.experienceNotFound"],
      ["PUT", "/api/resume/educations/999999", "resume.educationNotFound", { degree: "X" }],
      ["DELETE", "/api/resume/educations/999999", "resume.educationNotFound"],
      ["GET", "/api/resume/photo/resume_abc.jpg", "resume.photoNotFound"],
      ["GET", "/api/resume/fonts/file/nope.ttf", "resume.fontNotFound"],
    ];
    for (const [method, path, key, body] of cases) {
      const res = await call(cookie, method, path, body);
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: key });
    }
  });

  it("maps business rule violations to 400 with resume keys", async () => {
    const bad = await call(cookie, "POST", "/api/resume/experiences", { company: "A", jobTitle: "B", ...period, startMonth: 13 });
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ error: "resume.invalidStartMonth" });

    const nullPeriod = await call(cookie, "POST", "/api/resume/educations", {
      institution: "A", degree: "B", startMonth: null, startYear: null, endMonth: null, endYear: null, isCurrent: false,
    });
    expect(nullPeriod.status).toBe(400);
    expect(await nullPeriod.json()).toEqual({ error: "resume.invalidStartMonth" });

    const name = await call(cookie, "POST", "/api/resume/resumes", { name: " " });
    expect(name.status).toBe(400);
    expect(await name.json()).toEqual({ error: "resume.nameRequired" });

    const family = await call(cookie, "GET", "/api/resume/fonts/google?family=%2E%2E");
    expect(family.status).toBe(400);
    expect(await family.json()).toEqual({ error: "resume.invalidFontFamily" });
  });

  it("rejects bad item kinds and disallowed uploads", async () => {
    const created = await (await call(cookie, "POST", "/api/resume/resumes", { name: "CV", selectAll: true })).json();
    const kind = await call(cookie, "PUT", `/api/resume/resumes/${created.id}/items`, { items: [{ kind: "x", refId: 1 }] });
    expect(kind.status).toBe(400);
    expect(await kind.json()).toEqual({ error: "resume.invalidItemKind" });
    await call(cookie, "DELETE", `/api/resume/resumes/${created.id}`);

    const form = new FormData();
    form.append("file", new File(["x"], "doc.txt"));
    const upload = await app.handle(
      new Request("http://localhost/api/resume/profile/photo", { method: "POST", headers: { Cookie: cookie }, body: form }),
    );
    expect(upload.status).toBe(400);
    expect((await upload.json()).error).toBe("upload.typeNotAllowed");
  });

  it("maps schema violations to 400 common.invalidRequest", async () => {
    const cases: Array<[string, string, unknown?]> = [
      ["PUT", "/api/resume/profile", { fullName: 5 }],
      ["POST", "/api/resume/experiences", { company: "A" }],
      ["POST", "/api/resume/resumes", {}],
      ["PUT", "/api/resume/resumes/abc", { name: "x" }],
      ["PUT", "/api/resume/resumes/1/items", { items: "nope" }],
      ["GET", "/api/resume/fonts/google"],
    ];
    for (const [method, path, body] of cases) {
      const res = await call(cookie, method, path, body);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "common.invalidRequest" });
    }
  });

  it("keeps success shapes for the frontend payloads", async () => {
    const profile = await call(cookie, "PUT", "/api/resume/profile", {
      fullName: "Jane Doe",
      photoShape: "square",
      links: [{ label: "Site", url: "https://example.test" }],
      sections: [{ id: "s1", title: "Talen", items: ["NL"] }],
    });
    expect(profile.status).toBe(200);
    expect((await profile.json()).fullName).toBe("Jane Doe");

    const exp = await call(cookie, "POST", "/api/resume/experiences", {
      company: "Acme", jobTitle: "Dev", place: "", description: "", startMonth: 1, startYear: 2022, endMonth: null, endYear: null, isCurrent: true,
    });
    expect(exp.status).toBe(200);
    const created = await exp.json();
    expect(created.isCurrent).toBe(true);
    expect((await call(cookie, "DELETE", `/api/resume/experiences/${created.id}`)).status).toBe(200);
  });
});
