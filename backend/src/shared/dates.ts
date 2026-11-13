export const APP_TIME_ZONE = "Europe/Amsterdam";

const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const calendarDateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function parseDateString(dateStr: string): Date {
  return new Date(dateStr.includes("T") ? dateStr : `${dateStr.replace(" ", "T")}Z`);
}

export function today(now: Date = new Date()): string {
  return calendarDateFormat.format(now);
}

export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !CALENDAR_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}
