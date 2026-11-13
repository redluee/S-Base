const euro = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

export function formatEuro(amount: number): string {
  return euro.format(amount);
}

const DATE_STYLES = {
  long: { day: "2-digit", month: "long", year: "numeric" },
  short: { day: "numeric", month: "short", year: "numeric" },
  numeric: {},
} satisfies Record<string, Intl.DateTimeFormatOptions>;

export function formatDate(
  timestamp: number | null | undefined,
  style: keyof typeof DATE_STYLES = "numeric",
  empty = "—",
): string {
  return timestamp ? new Date(timestamp).toLocaleDateString("nl-NL", DATE_STYLES[style]) : empty;
}
