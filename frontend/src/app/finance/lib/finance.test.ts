import { describe, expect, it } from "bun:test";
import { parseMoney, moneyInput, dateLabel, financePeriodEnd } from "./finance";

describe("Finance display and decimal entry", () => {
  it("converts decimal strings to exact cents without floating-point rounding", () => {
    for (const [input, expected] of [
      ["0,29", 29],
      ["1234.56", 123456],
      ["-0,01", -1],
      ["10", 1000],
      [" 12,3 ", 1230],
      ["10000000000,00", 1000000000000],
    ] as const)
      expect(parseMoney(input)).toBe(expected);
    for (const input of [
      "",
      " ",
      "1.000,00",
      "1e3",
      "0.001",
      "--1",
      "NaN",
      "Infinity",
      "10000000000,01",
    ])
      expect(() => parseMoney(input)).toThrow();
    for (const value of [-101, 0, 29, 10001])
      expect(parseMoney(moneyInput(value))).toBe(value);
  });
  it("formats calendar dates without a timezone conversion", () => {
    expect(dateLabel("2025-03-30")).toBe("30-03-2025");
    expect(dateLabel("2025-10-26")).toBe("26-10-2025");
    expect(dateLabel(null)).toBe("—");
  });
});
describe("Dashboard calendar periods", () => {
  it("selects complete months across years and leap years", () => {
    expect(financePeriodEnd("month", "2024-02-01", "2026-10-24")).toBe("2024-02-29");
    expect(financePeriodEnd("month", "2025-02-24", "2026-10-24")).toBe("2025-02-28");
    expect(financePeriodEnd("month", "2025-12-01", "2026-10-24")).toBe("2025-12-31");
  });
  it("selects full past years and caps ongoing periods at today", () => {
    expect(financePeriodEnd("year", "2024-05-01", "2026-10-24")).toBe("2024-12-31");
    expect(financePeriodEnd("year", "2026-01-01", "2026-10-24")).toBe("2026-10-24");
    expect(financePeriodEnd("month", "2026-10-01", "2026-10-24")).toBe("2026-10-24");
    expect(financePeriodEnd("all", "2024-01-01", "2026-10-24")).toBe("2026-10-24");
  });
});
