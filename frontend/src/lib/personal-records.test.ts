import { describe, expect, it } from "bun:test";
import type { PersonalRecord } from "@backend/types/shared";
import { formatPersonalRecord, formatPRValue, isAssistedRecord } from "./personal-records";

const pr = (overrides: Partial<PersonalRecord> & { assisted?: boolean }): PersonalRecord & { assisted?: boolean } => ({
  type: "weight",
  exerciseName: "Pull-up",
  prevValue: 0,
  newValue: 0,
  unit: "kg",
  ...overrides,
});

describe("formatPRValue", () => {
  it("formats seconds as clock time", () => {
    expect(formatPRValue(75, "sec")).toBe("1:15");
    expect(formatPRValue(3725, "sec")).toBe("1:02:05");
  });

  it("omits the unit for counts", () => {
    expect(formatPRValue(12, "reps")).toBe("12");
  });
});

describe("formatPersonalRecord", () => {
  it("formats a regular weight PR", () => {
    expect(formatPersonalRecord(pr({ exerciseName: "Squat", newValue: 100, prevValue: 95 }))).toEqual({
      label: "Squat: Zwaarste set",
      value: "100 kg (was 95 kg)",
    });
  });

  it("renders assisted weight PRs as less assistance", () => {
    const result = formatPersonalRecord(pr({ newValue: 10, prevValue: 30, assisted: true }));
    expect(result).toEqual({ label: "Pull-up: Minder assistentie", value: "10 kg (was 30 kg)" });
  });

  it("never shows negative kg for legacy signed assisted PRs", () => {
    const result = formatPersonalRecord(pr({ newValue: -10, prevValue: -30 }));
    expect(result.label).toBe("Pull-up: Minder assistentie");
    expect(result.value).toBe("10 kg (was 30 kg)");
    expect(result.value).not.toContain("-");
  });

  it("drops the previous value when there was none", () => {
    expect(formatPersonalRecord(pr({ newValue: 50 })).value).toBe("50 kg");
  });

  it("uses a plain label for session records", () => {
    expect(formatPersonalRecord(pr({ type: "session_duration", exerciseName: undefined, newValue: 3600, prevValue: 1800, unit: "sec" }))).toEqual({
      label: "Langste workout duur",
      value: "1:00:00 (was 30:00)",
    });
  });

  it("only treats weight records as assisted", () => {
    expect(isAssistedRecord(pr({ type: "reps", newValue: 5, unit: "reps", assisted: true }))).toBe(false);
  });
});
