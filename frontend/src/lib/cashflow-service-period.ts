export interface ServicePeriod {
  start: number;
  end: number;
}

interface ServiceDates {
  dateService?: number | null;
  lines: { date?: number | null; type?: string }[];
}

function calendarDay(timestamp: number | null | undefined): number | null {
  if (timestamp == null || !Number.isFinite(timestamp)) return null;
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return null;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function getServicePeriod(invoice: ServiceDates): ServicePeriod | null {
  const manualDate = calendarDay(invoice.dateService);
  if (manualDate !== null) return { start: manualDate, end: manualDate };

  const lines = invoice.lines.filter(line => line.type !== "discount");
  if (lines.length === 0) return null;
  const dates = lines.map(line => calendarDay(line.date));
  if (dates.some(date => date === null)) return null;
  const validDates = dates as number[];
  return { start: Math.min(...validDates), end: Math.max(...validDates) };
}

export function formatServicePeriod(period: ServicePeriod | null): string {
  if (!period) return "—";
  const format = (timestamp: number) => new Date(timestamp).toLocaleDateString("nl-NL", {
    day: "2-digit", month: "long", year: "numeric", timeZone: "UTC",
  });
  if (period.start === period.end) return format(period.start);
  return `${format(period.start)} t/m ${format(period.end)}`;
}
