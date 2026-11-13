export function parseDateString(dateStr: string): Date {
  return new Date(dateStr.includes("T") ? dateStr : `${dateStr.replace(" ", "T")}Z`);
}
