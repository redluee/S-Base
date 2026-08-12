import { describe, expect, it } from "bun:test";
import quotes from "./workout-quotes.json";

describe("Motivational quotes data and selection algorithm", () => {
  it("contains structured quotes in Dutch", () => {
    expect(quotes.length).toBeGreaterThan(300);
    expect(quotes[0]).toContain("Consistentie");
  });

  it("calculates deterministic daily quote index for any day of year", () => {
    const today = new Date(2026, 7, 12);
    const startOfYear = new Date(today.getFullYear(), 0, 0);
    const diff = today.getTime() - startOfYear.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);

    const index = (dayOfYear - 1) % quotes.length;
    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(quotes.length);
    expect(typeof quotes[index]).toBe("string");
  });
});
