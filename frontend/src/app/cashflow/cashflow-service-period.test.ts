import { describe, expect, it } from "bun:test";
import { formatServicePeriod, getServicePeriod } from "./cashflow-service-period";

const day = (date: string) => Date.parse(date);
const line = (date: string | null, type = "hours") => ({ date: date === null ? null : day(date), type });

describe("invoice service period", () => {
  it("uses the first and last service dates regardless of line order or discounts", () => {
    const period = getServicePeriod({ lines: [
      line("2026-10-28"), line("2026-10-03"), line(null, "discount"), line("2026-12-01", "discount"),
    ] });
    expect(period).toEqual({ start: day("2026-10-03"), end: day("2026-10-28") });
    expect(formatServicePeriod(period)).toBe("03 oktober 2026 t/m 28 oktober 2026");
  });

  it("shows a single day only once and recalculates after dates change", () => {
    const invoice = { lines: [line("2026-10-03"), line("2026-10-03", "service")] };
    expect(formatServicePeriod(getServicePeriod(invoice))).toBe("03 oktober 2026");
    invoice.lines[1] = line("2026-10-28", "service");
    expect(getServicePeriod(invoice)?.end).toBe(day("2026-10-28"));
    invoice.lines.pop();
    expect(getServicePeriod(invoice)?.end).toBe(day("2026-10-03"));
  });

  it("handles month and year boundaries without expanding to full months", () => {
    expect(formatServicePeriod(getServicePeriod({ lines: [line("2026-12-29"), line("2027-01-04")] })))
      .toBe("29 december 2026 t/m 04 januari 2027");
  });

  it("preserves an explicit date and allows switching back to automatic", () => {
    const invoice = { dateService: day("2026-11-01"), lines: [line("2026-10-03"), line("2026-10-28")] };
    expect(formatServicePeriod(getServicePeriod(invoice))).toBe("01 november 2026");
    expect(getServicePeriod({ ...invoice, dateService: null })?.start).toBe(day("2026-10-03"));
  });

  it("requires dates for every non-discount line rather than showing an incomplete range", () => {
    for (const lines of [[], [line(null, "discount")], [line("2026-10-03"), line(null)],
      [line("2026-10-03"), { date: NaN }], [{ date: 1e20 }]]) {
      expect(getServicePeriod({ lines })).toBeNull();
    }
    expect(formatServicePeriod(null)).toBe("—");
  });

  it("formats calendar dates independently of the browser or server time zone", () => {
    const previous = process.env.TZ;
    try {
      for (const zone of ["America/Los_Angeles", "Europe/Amsterdam", "Pacific/Auckland"]) {
        process.env.TZ = zone;
        expect(formatServicePeriod(getServicePeriod({ lines: [line("2026-10-25")] }))).toBe("25 oktober 2026");
      }
    } finally {
      if (previous === undefined) delete process.env.TZ;
      else process.env.TZ = previous;
    }
  });
});
