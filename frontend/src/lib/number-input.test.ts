import { describe, expect, it } from "bun:test";
import {
  formatNumberNl,
  parseDecimal,
  parseInteger,
  sanitizeDecimalInput,
  sanitizeIntegerInput,
  toInputString,
} from "./number-input";
import { formatSessionDuration } from "./workout-time";

describe("sanitizeDecimalInput", () => {
  it("keeps comma and dot decimals instead of stripping the comma", () => {
    expect(sanitizeDecimalInput("12,5")).toBe("12,5");
    expect(sanitizeDecimalInput("12.5")).toBe("12.5");
  });
  it("allows only one separator and drops letters", () => {
    expect(sanitizeDecimalInput("1,2,3")).toBe("1,23");
    expect(sanitizeDecimalInput("1.2,3")).toBe("1.23");
    expect(sanitizeDecimalInput("abc4x")).toBe("4");
    expect(sanitizeDecimalInput("-5")).toBe("5");
  });
  it("limits decimals", () => {
    expect(sanitizeDecimalInput("1,23456", 2)).toBe("1,23");
  });
});

describe("sanitizeIntegerInput", () => {
  it("keeps digits only and limits length", () => {
    expect(sanitizeIntegerInput("1a2,5")).toBe("125");
    expect(sanitizeIntegerInput("123456", 3)).toBe("123");
  });
});

describe("parseDecimal", () => {
  it("parses comma and dot decimals to the same value", () => {
    expect(parseDecimal("12,5")).toBe(12.5);
    expect(parseDecimal("12.5")).toBe(12.5);
    expect(parseDecimal(" 7 ")).toBe(7);
  });
  it("handles thousands separators", () => {
    expect(parseDecimal("1.020,5")).toBe(1020.5);
    expect(parseDecimal("1,020.5")).toBe(1020.5);
  });
  it("returns null for empty or invalid", () => {
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal(",")).toBeNull();
    expect(parseDecimal("abc")).toBeNull();
    expect(parseDecimal(null)).toBeNull();
    expect(parseDecimal(undefined)).toBeNull();
  });
  it("never turns 12,5 into 125", () => {
    expect(parseDecimal(sanitizeDecimalInput("12,5"))).not.toBe(125);
  });
});

describe("parseInteger", () => {
  it("truncates", () => {
    expect(parseInteger("10,9")).toBe(10);
    expect(parseInteger("")).toBeNull();
  });
});

describe("toInputString / formatNumberNl", () => {
  it("renders comma decimals without grouping", () => {
    expect(toInputString(12.5)).toBe("12,5");
    expect(toInputString(1020)).toBe("1020");
    expect(toInputString(null)).toBe("");
  });
  it("formats with Dutch grouping", () => {
    expect(formatNumberNl(1020)).toBe("1.020");
    expect(formatNumberNl(1234.5)).toBe("1.234,5");
  });
});

describe("formatSessionDuration", () => {
  it("shows seconds for short sessions instead of 0", () => {
    expect(formatSessionDuration(12)).toBe("12 s");
    expect(formatSessionDuration(0)).toBe("0 s");
  });
  it("shows minutes and hours", () => {
    expect(formatSessionDuration(45 * 60)).toBe("45 min");
    expect(formatSessionDuration(3600)).toBe("1 u");
    expect(formatSessionDuration(3600 + 5 * 60)).toBe("1 u 5 min");
  });
});
