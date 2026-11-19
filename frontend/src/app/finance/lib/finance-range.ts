export type FinanceRangePreset = "7d" | "30d" | "90d" | "12m" | "ytd";
export const financeRangePresets: FinanceRangePreset[] = ["7d", "30d", "90d", "12m", "ytd"];

export interface FinanceRange {
  start: string;
  end: string;
}

export function shiftDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function presetRange(preset: FinanceRangePreset, today: string): FinanceRange {
  if (preset === "ytd") return { start: `${today.slice(0, 4)}-01-01`, end: today };
  if (preset === "12m") {
    const year = Number(today.slice(0, 4)) - 1;
    const month = Number(today.slice(5, 7));
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const day = Math.min(Number(today.slice(8, 10)), lastDay);
    return { start: shiftDays(`${year}-${today.slice(5, 7)}-${String(day).padStart(2, "0")}`, 1), end: today };
  }
  const days = { "7d": 7, "30d": 30, "90d": 90 }[preset];
  return { start: shiftDays(today, 1 - days), end: today };
}

export function matchingPreset(range: FinanceRange, today: string): FinanceRangePreset | null {
  return financeRangePresets.find((preset) => {
    const candidate = presetRange(preset, today);
    return candidate.start === range.start && candidate.end === range.end;
  }) ?? null;
}

export function rangeError(range: FinanceRange, today: string): string | null {
  const valid = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= "1900-01-01";
  if (!valid(range.start) || !valid(range.end)) return "finance.range.invalid";
  if (range.end > today) return "finance.range.future";
  if (range.start > range.end) return "finance.range.reversed";
  return null;
}

const short = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", timeZone: "UTC" });
const withYear = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function format(formatter: Intl.DateTimeFormat, date: string) {
  return formatter.format(new Date(`${date}T12:00:00Z`)).replace(/\./g, "");
}

export function rangeLabel(range: FinanceRange): string {
  if (range.start === range.end) return format(withYear, range.start);
  const sameYear = range.start.slice(0, 4) === range.end.slice(0, 4);
  return `${format(sameYear ? short : withYear, range.start)} – ${format(withYear, range.end)}`;
}

export function compactRangeLabel(range: FinanceRange, today: string): string {
  const year = today.slice(0, 4);
  if (range.start.slice(0, 4) !== year || range.end.slice(0, 4) !== year) return rangeLabel(range);
  if (range.start === range.end) return format(short, range.start);
  return `${format(short, range.start)} – ${format(short, range.end)}`;
}
