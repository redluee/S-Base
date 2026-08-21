import { describe, it, expect } from "bun:test";
import { NextRequest } from "next/server";
import { getBaseUrl, getAbsoluteUrl } from "./request-url";

describe("request-url helper", () => {
  it("uses host and x-forwarded-proto when available behind Cloudflare", () => {
    const req = new NextRequest("http://0.0.0.0:3000/api/auth/cf-exchange?redirect=/dashboard", {
      headers: {
        host: "sbase.example.com",
        "x-forwarded-proto": "https",
      },
    });

    expect(getBaseUrl(req)).toBe("https://sbase.example.com");
    expect(getAbsoluteUrl("/dashboard", req).toString()).toBe("https://sbase.example.com/dashboard");
  });

  it("prioritizes x-forwarded-host when present", () => {
    const req = new NextRequest("http://0.0.0.0:3000/", {
      headers: {
        host: "127.0.0.1:3000",
        "x-forwarded-host": "sbase.example.com, 127.0.0.1",
        "x-forwarded-proto": "https, http",
      },
    });

    expect(getBaseUrl(req)).toBe("https://sbase.example.com");
    expect(getAbsoluteUrl("/api/auth/cf-exchange", req).toString()).toBe("https://sbase.example.com/api/auth/cf-exchange");
  });

  it("defaults to http for localhost and 127.0.0.1 when x-forwarded-proto is absent", () => {
    const req = new NextRequest("http://localhost:3000/recipes", {
      headers: {
        host: "localhost:3000",
      },
    });

    expect(getBaseUrl(req)).toBe("http://localhost:3000");
    expect(getAbsoluteUrl("/dashboard", req).toString()).toBe("http://localhost:3000/dashboard");
  });
});
