import { ValidationError } from "../../utils/errors";
import type { ResumeLink, ResumeSection } from "../../types/shared";
import { RESUME_SECTIONS_MAX, type PeriodInput } from "./resume-constants";

export function parseJson<T>(value: string, fallback: T): T {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function str(value: unknown, max = 500) {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

function cleanStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v ?? "").trim()).filter(Boolean);
}

export function cleanSections(value: Array<Partial<ResumeSection>> | undefined): ResumeSection[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, RESUME_SECTIONS_MAX).map((s) => ({
    id: String(s?.id ?? "").trim() || crypto.randomUUID(),
    title: String(s?.title ?? "")
      .trim()
      .slice(0, 60),
    items: cleanStrings(s?.items),
  }));
}

export function legacySections(row: { skills: string; languages: string; hobbies: string }): ResumeSection[] {
  const defs: Array<[string, string]> = [
    ["Vaardigheden", row.skills],
    ["Talen", row.languages],
    ["Hobby's", row.hobbies],
  ];
  return defs
    .map(([title, json]) => ({ id: crypto.randomUUID(), title, items: parseJson<string[]>(json, []) }))
    .filter((s) => s.items.length > 0);
}

export function cleanLinks(value: Array<Partial<ResumeLink>> | undefined): ResumeLink[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((l) => ({ label: String(l?.label ?? "").trim(), url: String(l?.url ?? "").trim() }))
    .filter((l) => l.label && l.url);
}

function validMonth(value: number) {
  return Number.isInteger(value) && value >= 1 && value <= 12;
}

function validYear(value: number) {
  return Number.isInteger(value) && value >= 1950 && value <= 2100;
}

export function periodValues(data: PeriodInput) {
  const startMonth = Number(data.startMonth);
  const startYear = Number(data.startYear);
  if (!validMonth(startMonth)) throw new ValidationError("resume.invalidStartMonth");
  if (!validYear(startYear)) throw new ValidationError("resume.invalidStartYear");
  if (data.isCurrent) return { startMonth, startYear, endMonth: null, endYear: null, isCurrent: true };
  const endMonth = Number(data.endMonth);
  const endYear = Number(data.endYear);
  if (!validMonth(endMonth)) throw new ValidationError("resume.invalidEndMonth");
  if (!validYear(endYear)) throw new ValidationError("resume.invalidEndYear");
  if (endYear * 12 + endMonth < startYear * 12 + startMonth) throw new ValidationError("resume.endBeforeStart");
  return { startMonth, startYear, endMonth, endYear, isCurrent: false };
}

export function mergePeriod(
  data: PeriodInput,
  existing: {
    startMonth: number;
    startYear: number;
    endMonth: number | null;
    endYear: number | null;
    isCurrent: boolean;
  },
) {
  return periodValues({
    startMonth: data.startMonth ?? existing.startMonth,
    startYear: data.startYear ?? existing.startYear,
    endMonth: data.endMonth !== undefined ? data.endMonth : existing.endMonth,
    endYear: data.endYear !== undefined ? data.endYear : existing.endYear,
    isCurrent: data.isCurrent !== undefined ? data.isCurrent : existing.isCurrent,
  });
}

export function periodSortKey(p: {
  startYear: number;
  startMonth: number;
  endYear: number | null;
  endMonth: number | null;
  isCurrent: boolean;
}) {
  const end = p.isCurrent ? 9999 * 12 + 12 : (p.endYear ?? 0) * 12 + (p.endMonth ?? 0);
  return (p.startYear * 12 + p.startMonth) * 1_000_000 + end;
}
