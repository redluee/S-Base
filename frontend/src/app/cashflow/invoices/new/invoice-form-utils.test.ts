import { describe, expect, it } from "bun:test";
import { addDays, toDate, toTs } from "./invoice-form-utils";

describe("invoice form dates", () => {
  it("adds calendar days across the daylight saving change", () => {
    expect(addDays("2026-03-29", 1)).toBe("2026-03-30");
    expect(addDays("2026-03-20", 14)).toBe("2026-04-03");
    expect(addDays("2026-10-20", 14)).toBe("2026-11-03");
  });

  it("round-trips a calendar date through its stored timestamp", () => {
    expect(toDate(toTs("2026-03-29"))).toBe("2026-03-29");
  });
});
