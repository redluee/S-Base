import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { generateJson, parseModelChain, parseResponseJson, rateLimitCooldown, resetGeminiCooldowns } from "./gemini";

const request = { instructions: "Doe iets", input: "tekst", schema: { type: "object" } };
const originalFetch = globalThis.fetch;
const originalEnv = { key: process.env.GOOGLE_API_KEY, model: process.env.GOOGLE_AI_MODEL };

interface Call {
  url: string;
  body: Record<string, unknown>;
}

function stubFetch(responses: Response[]): Call[] {
  const calls: Call[] = [];
  globalThis.fetch = Object.assign(
    async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(input), body: JSON.parse(String(init?.body)) });
      return responses.shift() ?? new Response("", { status: 500 });
    },
    { preconnect: originalFetch.preconnect },
  );
  return calls;
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

const answer = (value: unknown) =>
  Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }] });

const quotaError = (quotaId: string, retryDelay = "20s") =>
  JSON.stringify({
    error: {
      code: 429,
      details: [
        { "@type": "type.googleapis.com/google.rpc.QuotaFailure", violations: [{ quotaId }] },
        { "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay },
      ],
    },
  });

describe("parseModelChain", () => {
  it("reads models with an optional thinking level", () => {
    expect(parseModelChain(" model-a , model-b@low ")).toEqual([
      { name: "model-a" },
      { name: "model-b", thinkingLevel: "low" },
    ]);
  });

  it("falls back to the default chain", () => {
    expect(parseModelChain("").length).toBeGreaterThan(1);
  });
});

describe("parseResponseJson", () => {
  it("accepts JSON wrapped in a markdown fence", () => {
    const fenced = { candidates: [{ content: { parts: [{ text: '```json\n{"ok":true}\n```' }] } }] };
    expect(parseResponseJson(fenced)).toEqual({ ok: true });
  });
});

describe("rateLimitCooldown", () => {
  it("waits an hour when the daily quota is used up", () => {
    expect(rateLimitCooldown(quotaError("GenerateRequestsPerDayPerProjectPerModel-FreeTier"))).toBe(3_600_000);
  });

  it("follows the retry delay for per-minute limits", () => {
    expect(rateLimitCooldown(quotaError("GenerateRequestsPerMinutePerProjectPerModel-FreeTier", "12.5s"))).toBe(13_000);
  });

  it("defaults to a minute", () => {
    expect(rateLimitCooldown("not json")).toBe(60_000);
  });
});

describe("generateJson", () => {
  beforeEach(() => {
    resetGeminiCooldowns();
    process.env.GOOGLE_API_KEY = "test-key";
    process.env.GOOGLE_AI_MODEL = "model-a, model-b@low";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    restoreEnv("GOOGLE_API_KEY", originalEnv.key);
    restoreEnv("GOOGLE_AI_MODEL", originalEnv.model);
  });

  it("requires an API key", async () => {
    process.env.GOOGLE_API_KEY = "";
    await expect(generateJson(request)).rejects.toMatchObject({ status: 503, key: "ai.notConfigured" });
  });

  it("returns the parsed JSON answer", async () => {
    const calls = stubFetch([answer({ ok: true })]);
    expect(await generateJson(request)).toEqual({ ok: true });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain("/model-a:generateContent");
    expect(calls[0].body.generationConfig).not.toHaveProperty("thinkingConfig");
  });

  it("falls back to the next model and passes its thinking level", async () => {
    const calls = stubFetch([new Response("busy", { status: 503 }), answer({ ok: 2 })]);
    expect(await generateJson(request)).toEqual({ ok: 2 });
    expect(calls[1].url).toContain("/model-b:");
    expect(calls[1].body.generationConfig).toMatchObject({ thinkingConfig: { thinkingLevel: "low" } });
  });

  it("skips a model whose quota is used up on the next request", async () => {
    stubFetch([new Response(quotaError("GenerateRequestsPerDay"), { status: 429 }), answer({ ok: 1 })]);
    await generateJson(request);
    const calls = stubFetch([answer({ ok: 2 })]);
    expect(await generateJson(request)).toEqual({ ok: 2 });
    expect(calls.map((call) => call.url)).toEqual([expect.stringContaining("/model-b:")]);
  });

  it("tries cooling models again when all of them are cooling down", async () => {
    stubFetch([new Response("", { status: 503 }), new Response("", { status: 503 })]);
    await expect(generateJson(request)).rejects.toMatchObject({ status: 503, key: "ai.busy" });
    const calls = stubFetch([answer({ ok: 3 })]);
    expect(await generateJson(request)).toEqual({ ok: 3 });
    expect(calls[0].url).toContain("/model-a:");
  });

  it("moves past a model that rejects the request or answers invalid JSON", async () => {
    stubFetch([new Response("bad", { status: 400 }), Response.json({ candidates: [] })]);
    await expect(generateJson(request)).rejects.toMatchObject({ status: 502, key: "ai.invalidResponse" });
  });

  it("stops when the API key is rejected", async () => {
    const calls = stubFetch([new Response("denied", { status: 403 })]);
    await expect(generateJson(request)).rejects.toMatchObject({ status: 502, key: "ai.requestFailed" });
    expect(calls).toHaveLength(1);
  });
});
