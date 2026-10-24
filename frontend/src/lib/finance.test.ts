import { describe, expect, it } from "bun:test";
import { parseMoney, moneyInput, dateLabel, savingsState, financePeriodEnd } from "./finance";
import type { FinanceData } from "@backend/types/finance";

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
const data: FinanceData = {
  today: "2025-03-01",
  accounts: [
    {
      id: 1,
      name: "Sample savings A",
      bank: null,
      type: "savings",
      openingDate: "2025-01-01",
      archived: false,
    },
    {
      id: 2,
      name: "Sample savings B",
      bank: null,
      type: "savings",
      openingDate: "2025-01-01",
      archived: true,
    },
  ],
  observations: [
    { id: 1, accountId: 1, date: "2025-01-01", balanceCents: 5000 },
    { id: 2, accountId: 2, date: "2025-01-01", balanceCents: 10000 },
  ],
  goals: [],
  allocations: [{ accountId: 1, goalId: 1, amountCents: 8000 }],
};
describe("Savings availability and shortfalls", () => {
  it("does not offset an account deficit with free money on another account", () => {
    const state = savingsState(data);
    expect(state.allocatedCents).toBe(8000);
    expect(state.shortfallCents).toBe(3000);
    expect(state.unallocatedCents).toBe(10000);
    expect(state.accounts[1].archived).toBe(true);
  });
  it("preserves allocations and marks unknown funds instead of assuming zero", () => {
    const state = savingsState({
      ...data,
      observations: data.observations.filter((o) => o.accountId !== 1),
    });
    expect(state.unknown).toBe(true);
    expect(state.accounts[0].balanceCents).toBeNull();
    expect(state.allocatedCents).toBe(8000);
    expect(state.shortfallCents).toBe(8000);
    expect(state.unallocatedCents).toBeNull();
  });
  it("chooses the latest historical observation, excludes future values and clamps negative availability", () => {
    const state = savingsState({
      ...data,
      observations: [
        ...data.observations,
        { id: 3, accountId: 1, date: "2025-02-01", balanceCents: -100 },
        { id: 4, accountId: 1, date: "2025-04-01", balanceCents: 100000 },
      ],
    });
    expect(state.accounts[0].balanceCents).toBe(-100);
    expect(state.accounts[0].unallocatedCents).toBe(0);
    expect(state.accounts[0].shortfallCents).toBe(8000);
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
