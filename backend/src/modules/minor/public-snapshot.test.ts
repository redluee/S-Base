import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { setupTestDb } from "../../test-utils";
import { app } from "../../index";
import { MinorService } from "./index";
import { buildPublicSnapshot } from "./public-snapshot";

const SECRET_NAME = "Jan Jansen";
const ASSET = "minor_123e4567-e89b-12d3-a456-426614174000.png";

describe("public snapshot", () => {
  let minor: MinorService;
  let adminId: number;
  let uploadsDir: string;

  beforeEach(async () => {
    const ids = await setupTestDb();
    adminId = ids.adminId;
    minor = new MinorService();
    uploadsDir = mkdtempSync(join(tmpdir(), "snapshot-"));
    writeFileSync(join(uploadsDir, ASSET), "image-bytes");
  });

  afterEach(() => {
    rmSync(uploadsDir, { recursive: true, force: true });
    delete process.env.MINOR_SNAPSHOT_TOKEN;
    delete process.env.MINOR_PUBLISH_USERNAME;
    delete process.env.N8N_WEBHOOK_URL;
    delete process.env.N8N_WEBHOOK_SECRET;
  });

  function seedPublishedSprint(number: string) {
    const sprint = minor.createSprint(adminId, { sprintNumber: number, name: `Snapshot ${number}`, startDate: "2031-03-03" });
    minor.createStory(adminId, sprint.id, {
      storyTypeCode: "US",
      storyNumber: `US ${number}.1`,
      title: "Snapshot story",
      learningOutcomes: [1],
      status: "done",
      acceptanceCriteria: [{ text: "Works", isCompleted: true, indent: 0 }],
      qualityCriteria: [{ text: "Tested", isCompleted: false, indent: 0 }],
      evidence: [{ type: "document", title: "Doc", url: `/api/uploads/${ASSET}` }],
      presentationData: { enabled: true, notes: "presenter only", images: [{ url: `/api/uploads/${ASSET}` }] },
    } as any);
    minor.addFeedback(sprint.id, { date: "2031-03-05", fromWhom: SECRET_NAME, feedback: "Nice", action: "Continue" } as any);
    minor.createPeerHelp(adminId, { sprintId: sprint.id, date: "2031-03-06", peerName: SECRET_NAME, description: "Explained git" });
    minor.saveSelfEvaluations(sprint.id, adminId, [{ learningOutcome: 1, level: "V", argumentation: "Shown in story" }]);
    return sprint;
  }

  it("omits names and ids and rewrites upload urls", () => {
    seedPublishedSprint("901");
    const snapshot = buildPublicSnapshot(minor, adminId, uploadsDir);
    const json = JSON.stringify(snapshot);

    expect(json).not.toContain(SECRET_NAME);
    expect(json).not.toContain("fromWhom");
    expect(json).not.toContain("peerName");
    expect(json).not.toContain("presenter only");
    expect(json).not.toContain("userId");

    const sprint = snapshot.sprints.find((s) => s.sprintNumber === "901")!;
    const sprintJson = JSON.stringify(sprint);
    expect(sprintJson).not.toContain("/api/uploads/");
    expect(sprintJson).toContain(`/minor/${ASSET}`);
    expect(sprint.stories[0].acceptanceCriteria[0]).toEqual({ text: "Works", isCompleted: true, indent: 0 });
    expect(sprint.teacherAssessments.every((t) => t.assessment === "-")).toBe(true);
    expect(snapshot.assets).toEqual([
      { path: `public/minor/${ASSET}`, sha256: expect.any(String), size: 11 },
    ]);
  });

  it("excludes sprints without a saved self-evaluation", () => {
    minor.createSprint(adminId, { sprintNumber: "902", name: "Empty", startDate: "2031-04-07" });
    const snapshot = buildPublicSnapshot(minor, adminId, uploadsDir);
    expect(snapshot.sprints.some((s) => s.sprintNumber === "902")).toBe(false);
  });

  it("keeps the content hash stable and changes it when content changes", () => {
    const sprint = seedPublishedSprint("903");
    const first = buildPublicSnapshot(minor, adminId, uploadsDir);
    const second = buildPublicSnapshot(minor, adminId, uploadsDir);
    expect(second.contentHash).toBe(first.contentHash);

    minor.saveSelfEvaluations(sprint.id, adminId, [{ learningOutcome: 1, level: "NV", argumentation: "Changed" }]);
    const third = buildPublicSnapshot(minor, adminId, uploadsDir);
    expect(third.contentHash).not.toBe(first.contentHash);
  });

  it("protects the public routes with a bearer token", async () => {
    const url = "http://localhost/api/minor/public/snapshot";
    expect((await app.handle(new Request(url))).status).toBe(503);

    process.env.MINOR_SNAPSHOT_TOKEN = "test-token";
    expect((await app.handle(new Request(url))).status).toBe(401);
    expect((await app.handle(new Request(url, { headers: { Authorization: "Bearer wrong" } }))).status).toBe(401);

    const noOwner = await app.handle(new Request(url, { headers: { Authorization: "Bearer test-token" } }));
    expect(noOwner.status).toBe(503);

    process.env.MINOR_PUBLISH_USERNAME = "admin";
    const ok = await app.handle(new Request(url, { headers: { Authorization: "Bearer test-token" } }));
    expect(ok.status).toBe(200);
    const body = await ok.json();
    expect(body.version).toBe(1);

    const badAsset = await app.handle(
      new Request("http://localhost/api/minor/public/assets/..%2Fsbase.db", { headers: { Authorization: "Bearer test-token" } }),
    );
    expect(badAsset.status).toBe(404);
  });

  it("notifies the webhook once after saving self-evaluations and never fails the save", async () => {
    const sprint = minor.createSprint(adminId, { sprintNumber: "904", name: "Notify", startDate: "2031-05-05" });
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const realFetch = globalThis.fetch;

    process.env.N8N_WEBHOOK_URL = "http://127.0.0.1:5678/webhook/minor-publish";
    process.env.N8N_WEBHOOK_SECRET = "hook-secret";
    process.env.MINOR_PUBLISH_USERNAME = "admin";

    globalThis.fetch = (async (url: any, init: any) => {
      calls.push({ url: String(url), init });
      return new Response("ok");
    }) as any;
    try {
      minor.saveSelfEvaluations(sprint.id, adminId, [{ learningOutcome: 1, level: "V", argumentation: "x" }]);
      expect(calls).toHaveLength(1);
      expect((calls[0].init.headers as Record<string, string>)["X-Webhook-Secret"]).toBe("hook-secret");
      expect(JSON.parse(calls[0].init.body as string).sprintId).toBe(sprint.id);

      globalThis.fetch = (async () => {
        throw new Error("n8n down");
      }) as any;
      expect(() =>
        minor.saveSelfEvaluations(sprint.id, adminId, [{ learningOutcome: 1, level: "NV", argumentation: "y" }]),
      ).not.toThrow();

      delete process.env.N8N_WEBHOOK_URL;
      calls.length = 0;
      globalThis.fetch = (async (url: any, init: any) => {
        calls.push({ url: String(url), init });
        return new Response("ok");
      }) as any;
      minor.saveSelfEvaluations(sprint.id, adminId, [{ learningOutcome: 1, level: "V", argumentation: "z" }]);
      expect(calls).toHaveLength(0);
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});
