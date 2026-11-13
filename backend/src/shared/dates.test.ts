import { describe, expect, it } from "bun:test";
import { daysBetween, isCalendarDate, parseDateString, today } from "./dates";

describe("parseDateString", () => {
  it("reads SQLite CURRENT_TIMESTAMP values as UTC and keeps ISO strings as they are", () => {
    expect(parseDateString("2026-08-12 10:00:00").toISOString()).toBe("2026-08-12T10:00:00.000Z");
    expect(parseDateString("2026-08-12T10:00:00+02:00").toISOString()).toBe("2026-08-12T08:00:00.000Z");
  });
});

describe("today", () => {
  it("returns the calendar date in Amsterdam, not in UTC, around midnight", () => {
    expect(today(new Date("2026-03-15T23:30:00Z"))).toBe("2026-03-16");
    expect(today(new Date("2026-07-15T22:30:00Z"))).toBe("2026-07-16");
    expect(today(new Date("2026-07-15T21:30:00Z"))).toBe("2026-07-15");
  });
});

describe("isCalendarDate", () => {
  it("accepts real calendar dates", () => {
    expect(isCalendarDate("2026-02-28")).toBe(true);
    expect(isCalendarDate("2028-02-29")).toBe(true);
  });

  it("rejects impossible dates and other shapes", () => {
    expect(isCalendarDate("2026-02-31")).toBe(false);
    expect(isCalendarDate("2026-02-29")).toBe(false);
    expect(isCalendarDate("2026-13-01")).toBe(false);
    expect(isCalendarDate("2026-1-01")).toBe(false);
    expect(isCalendarDate("2026-01-01T00:00:00Z")).toBe(false);
    expect(isCalendarDate(20260101)).toBe(false);
    expect(isCalendarDate(null)).toBe(false);
  });

  it("counts calendar days between two dates across a clock change", () => {
    expect(daysBetween("2026-10-20", "2026-10-27")).toBe(7);
    expect(daysBetween("2026-03-27", "2026-03-30")).toBe(3);
    expect(daysBetween("2026-05-02", "2026-05-01")).toBe(-1);
  });
});
