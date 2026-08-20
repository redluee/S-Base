import { describe, expect, it, mock } from "bun:test";
import { api } from "./api";

describe("Frontend API client", () => {
  it("defines api client methods for authentication, recipes, workouts, cashflow, pulse, measurements", () => {
    expect(api.login).toBeFunction();
    expect(api.logout).toBeFunction();
    expect(api.me).toBeFunction();
    expect(api.recipes.list).toBeFunction();
    expect(api.workouts.templates.list).toBeFunction();
    expect(api.cashflow.clients.list).toBeFunction();
    expect(api.pulse.users).toBeFunction();
    expect(api.measurements.list).toBeFunction();
    expect(api.minecraft.import.scan).toBeFunction();
    expect(api.minecraft.import.inspect).toBeFunction();
    expect(api.minecraft.import.submit).toBeFunction();
  });

  it("calls fetch API with appropriate endpoints", async () => {
    const originalFetch = globalThis.fetch;
    let requestedUrl = "";

    globalThis.fetch = mock(async (url: string | URL | Request) => {
      requestedUrl = String(url);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as typeof fetch;

    try {
      await api.recipes.list("success", "rating", "desc");
      expect(requestedUrl).toContain("/api/recipes?status=success&sortBy=rating&sortOrder=desc");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
