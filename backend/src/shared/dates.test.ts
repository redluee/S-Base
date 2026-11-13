import { describe, expect, it } from "bun:test";
import { parseDateString } from "./dates";

describe("parseDateString", () => {
  it("reads SQLite CURRENT_TIMESTAMP values as UTC and keeps ISO strings as they are", () => {
    expect(parseDateString("2026-08-12 10:00:00").toISOString()).toBe("2026-08-12T10:00:00.000Z");
    expect(parseDateString("2026-08-12T10:00:00+02:00").toISOString()).toBe("2026-08-12T08:00:00.000Z");
  });
});
