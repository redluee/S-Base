import { describe, expect, it } from "bun:test";
import { cn, parseDateString } from "./utils";

describe("Frontend class merge cn() and date parser", () => {
  it("merges Tailwind CSS classes correctly", () => {
    expect(cn("px-2 py-1", "bg-blue-500", { "opacity-50": true, "hidden": false })).toBe("px-2 py-1 bg-blue-500 opacity-50");
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("parses ISO and space-separated date strings", () => {
    const d1 = parseDateString("2026-08-12T10:00:00Z");
    expect(d1.getUTCFullYear()).toBe(2026);

    const d2 = parseDateString("2026-08-12 10:00:00");
    expect(d2.getUTCFullYear()).toBe(2026);
  });
});
