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

describe("minor routes error contract", () => {
  let cookie: string;

  beforeEach(async () => {
    await setupTestDb();
    cookie = await login();
  });

  it("maps missing records to 404 with an i18n key", async () => {
    const cases: Array<[string, string, unknown, string]> = [
      ["GET", "/api/minor/sprints/999999", undefined, "minor.sprintNotFound"],
      ["GET", "/api/minor/sprints/999999/export", undefined, "minor.sprintNotFound"],
      ["PUT", "/api/minor/sprints/999999", { name: "x" }, "minor.sprintNotFound"],
      ["DELETE", "/api/minor/sprints/999999", undefined, "minor.sprintNotFound"],
      ["PUT", "/api/minor/stories/999999", { title: "x" }, "minor.storyNotFound"],
      ["DELETE", "/api/minor/stories/999999", undefined, "minor.storyNotFound"],
      ["PATCH", "/api/minor/criteria/999999/toggle", { isCompleted: true }, "minor.criterionNotFound"],
      ["PUT", "/api/minor/feedback/999999", { date: "2030-01-01" }, "minor.feedbackNotFound"],
      ["DELETE", "/api/minor/feedback/999999", undefined, "minor.feedbackNotFound"],
      ["PUT", "/api/minor/vacations/999999", { name: "x" }, "minor.vacationNotFound"],
      ["DELETE", "/api/minor/vacations/999999", undefined, "minor.vacationNotFound"],
      ["PUT", "/api/minor/story-types/999999", { name: "x" }, "minor.storyTypeNotFound"],
      ["DELETE", "/api/minor/story-types/-1", undefined, "minor.storyTypeNotFound"],
      ["PUT", "/api/minor/peer-help/999999", { description: "x" }, "minor.peerHelpNotFound"],
      ["DELETE", "/api/minor/peer-help/999999", undefined, "minor.peerHelpNotFound"],
      ["PUT", "/api/minor/sprints/999999/self-evaluations", { evaluations: [] }, "minor.sprintNotFound"],
      ["PUT", "/api/minor/sprints/999999/teacher-assessments", { assessments: [] }, "minor.sprintNotFound"],
      ["POST", "/api/minor/sprints/999999/self-evaluations/auto", undefined, "minor.sprintNotFound"],
      ["PUT", "/api/minor/sprints/999999/stories/reorder", { storyIds: [] }, "minor.sprintNotFound"],
      ["POST", "/api/minor/sprints/999999/stories", { title: "x" }, "minor.sprintNotFound"],
      ["POST", "/api/minor/sprints/999999/import", {}, "minor.targetSprintNotFound"],
    ];
    for (const [method, path, body, key] of cases) {
      const res = await call(cookie, method, path, body);
      expect({ path, status: res.status, body: await res.json() }).toEqual({ path, status: 404, body: { error: key } });
    }
  });

  it("maps domain validation failures to 400 with an i18n key", async () => {
    const cases: Array<[string, string, unknown, string]> = [
      [
        "POST",
        "/api/minor/vacations",
        { name: " ", startDate: "2030-01-01", endDate: "2030-01-02" },
        "minor.vacationNameRequired",
      ],
      [
        "POST",
        "/api/minor/vacations",
        { name: "Zomer", startDate: "", endDate: "2030-01-02" },
        "minor.vacationDatesRequired",
      ],
      ["POST", "/api/minor/stories", { title: "  " }, "minor.storyTitleRequired"],
      ["POST", "/api/minor/story-types", { code: " ", name: "X" }, "minor.storyTypeFieldsRequired"],
      [
        "POST",
        "/api/minor/peer-help",
        { date: "2030-01-01", peerName: " ", description: "x" },
        "minor.peerHelpFieldsRequired",
      ],
      ["GET", "/api/minor/sprints/calculate-dates?startDate=not-a-date", undefined, "minor.invalidDate"],
      ["POST", "/api/minor/sprints", { startDate: "31-12-2030" }, "minor.invalidDate"],
    ];
    for (const [method, path, body, key] of cases) {
      const res = await call(cookie, method, path, body);
      expect({ path, status: res.status, body: await res.json() }).toEqual({ path, status: 400, body: { error: key } });
    }

    const sprint = (await (await call(cookie, "POST", "/api/minor/sprints", { startDate: "2030-03-04" })).json()) as {
      id: number;
    };
    const feedback = await call(cookie, "POST", `/api/minor/sprints/${sprint.id}/feedback`, {
      date: "2030-03-05",
      fromWhom: "",
      feedback: "x",
      action: "y",
    });
    expect(feedback.status).toBe(400);
    expect(await feedback.json()).toEqual({ error: "minor.feedbackFieldsRequired" });
    await call(cookie, "DELETE", `/api/minor/sprints/${sprint.id}`);
  });

  it("maps schema violations to 400 common.invalidRequest", async () => {
    const cases: Array<[string, string, unknown]> = [
      ["POST", "/api/minor/sprints", {}],
      ["POST", "/api/minor/sprints", { startDate: 5 }],
      ["GET", "/api/minor/sprints/abc", undefined],
      ["POST", "/api/minor/stories", { title: "x", status: "weird" }],
      ["PUT", "/api/minor/sprints/1/self-evaluations", { evaluations: [{ learningOutcome: 1, level: "X" }] }],
      ["PATCH", "/api/minor/criteria/1/toggle", { isCompleted: "yes" }],
      ["PUT", "/api/minor/sprints/1/stories/reorder", { storyIds: ["a"] }],
    ];
    for (const [method, path, body] of cases) {
      const res = await call(cookie, method, path, body);
      expect({ path, status: res.status, body: await res.json() }).toEqual({
        path,
        status: 400,
        body: { error: "common.invalidRequest" },
      });
    }
  });

  it("answers upload failures with typed upload keys", async () => {
    const none = await app.handle(
      new Request("http://localhost/api/minor/upload", { method: "POST", headers: { Cookie: cookie } }),
    );
    expect(none.status).toBe(400);

    const form = new FormData();
    form.append("file", new File(["x"], "evil.exe"));
    const bad = await app.handle(
      new Request("http://localhost/api/minor/upload", { method: "POST", headers: { Cookie: cookie }, body: form }),
    );
    expect(bad.status).toBe(400);
    expect(((await bad.json()) as { error: string }).error).toBe("upload.typeNotAllowed");
  });

  it("keeps success shapes and unknown presentation fields through the schema", async () => {
    const sprintRes = await call(cookie, "POST", "/api/minor/sprints", {
      startDate: "2030-05-06",
      sprintNumber: "R1",
      name: "Route test",
    });
    expect(sprintRes.status).toBe(200);
    const sprint = (await sprintRes.json()) as { id: number; sprintNumber: string };
    expect(sprint.sprintNumber).toBe("R1");

    const storyRes = await call(cookie, "POST", `/api/minor/sprints/${sprint.id}/stories`, {
      title: "Route story",
      asA: null,
      learningOutcomes: [1],
      acceptanceCriteria: [{ text: "Works", isCompleted: false, indent: 0, orderIndex: 9 }],
      evidence: [{ type: "link", title: "Doc", url: "https://example.com" }],
      presentationData: { layout: "split", images: [{ url: "/a.png", caption: "c", extra: "kept" }], customField: 1 },
    });
    expect(storyRes.status).toBe(200);
    const story = (await storyRes.json()) as {
      criteria: unknown[];
      presentationData: { customField: number; images: Array<{ extra: string }> };
    };
    expect(story.criteria.length).toBe(1);
    expect(story.presentationData.customField).toBe(1);
    expect(story.presentationData.images[0].extra).toBe("kept");

    const full = (await (await call(cookie, "GET", `/api/minor/sprints/${sprint.id}`)).json()) as {
      stories: Array<{ presentationData: { customField: number } }>;
    };
    expect(full.stories[0].presentationData.customField).toBe(1);

    const exported = (await (await call(cookie, "GET", `/api/minor/sprints/${sprint.id}/export`)).json()) as Record<
      string,
      unknown
    >;
    const imported = await call(cookie, "POST", "/api/minor/sprints/import", {
      ...exported,
      customName: "Route import",
    });
    expect(imported.status).toBe(200);
    const importedBody = (await imported.json()) as { id: number; name: string; stories: unknown[] };
    expect(importedBody.name).toBe("Route import");
    expect(importedBody.stories.length).toBe(1);

    const sprints = (await (
      await call(cookie, "GET", "/api/minor/sprints/calculate-dates?startDate=2030-05-06&durationDays=14")
    ).json()) as { endDate: string };
    expect(sprints.endDate).toBe("2030-05-19");

    await call(cookie, "DELETE", `/api/minor/sprints/${sprint.id}`);
    await call(cookie, "DELETE", `/api/minor/sprints/${importedBody.id}`);
  });
});
