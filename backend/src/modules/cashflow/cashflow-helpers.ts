export const trimOrNull = (value: string | null | undefined) => value?.trim() || null;

export function yearRange(year: number) {
  return {
    start: new Date(year, 0, 1).getTime(),
    end: new Date(year, 11, 31, 23, 59, 59, 999).getTime(),
  };
}

export function periodStart(targetYear?: number): { start: number; end?: number } {
  if (targetYear) return yearRange(targetYear);
  const now = new Date();
  return { start: new Date(now.getFullYear(), now.getMonth() - 11, 1).getTime() };
}

export function patch<T>(next: T | undefined, current: T): T {
  return next === undefined ? current : next;
}

export function patchText(next: string | null | undefined, current: string | null): string | null {
  return next === undefined ? current : trimOrNull(next);
}
