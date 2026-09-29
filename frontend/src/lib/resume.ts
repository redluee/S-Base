import type { ResumeFull, ResumePeriod } from "@backend/types/shared";

const MONTHS_NL = [
  "Januari", "Februari", "Maart", "April", "Mei", "Juni",
  "Juli", "Augustus", "September", "Oktober", "November", "December",
];

export const RESUME_COLUMN_MIN = 50;
export const RESUME_COLUMN_MAX = 80;
export const RESUME_COLUMN_STEP = 5;

export function snapColumnWidth(value: number): number {
  const snapped = Math.round(value / RESUME_COLUMN_STEP) * RESUME_COLUMN_STEP;
  return Math.min(RESUME_COLUMN_MAX, Math.max(RESUME_COLUMN_MIN, snapped));
}

export const RESUME_SCALE_MIN = 80;
export const RESUME_SCALE_MAX = 140;
export const RESUME_SCALE_STEP = 5;

export function snapScale(value: number): number {
  const snapped = Math.round(value / RESUME_SCALE_STEP) * RESUME_SCALE_STEP;
  return Math.min(RESUME_SCALE_MAX, Math.max(RESUME_SCALE_MIN, snapped));
}

export function formatMonthYear(month: number | null, year: number | null): string {
  if (!year) return "";
  return month ? `${MONTHS_NL[month - 1]} ${year}` : String(year);
}

export function formatPeriod(p: ResumePeriod, currentLabel = "HEDEN"): string {
  const start = formatMonthYear(p.startMonth, p.startYear);
  const end = p.isCurrent ? currentLabel : formatMonthYear(p.endMonth, p.endYear);
  return end ? `${start} – ${end}` : start;
}

export const MONTH_OPTIONS = MONTHS_NL.map((label, i) => ({ value: i + 1, label }));

export interface CuratedFont {
  id: string;
  label: string;
  files: { regular: string; bold: string };
}

const curated = (id: string, label: string, regular?: string, bold?: string): CuratedFont => ({
  id,
  label,
  files: {
    regular: regular ?? `/fonts/resume/${id}-400.ttf`,
    bold: bold ?? `/fonts/resume/${id}-700.ttf`,
  },
});

export const CURATED_FONTS: CuratedFont[] = [
  curated("carlito", "Carlito (Calibri)"),
  curated("inter", "Inter"),
  curated("lato", "Lato"),
  curated("merriweather", "Merriweather"),
  curated("playfair-display", "Playfair Display"),
  curated("source-serif", "Source Serif"),
  curated("oatmeal", "Oatmeal", "/fonts/oatmeal.ttf", "/fonts/oatmeal.ttf"),
  curated("epilogue", "Epilogue", "/fonts/epilogue.ttf", "/fonts/epilogue.ttf"),
];

export const GOOGLE_PREFIX = "google:";

export interface ResolvedFont {
  value: string;
  family: string;
  regular: string;
  bold: string;
}

export function fontLabel(value: string): string {
  if (value.startsWith(GOOGLE_PREFIX)) return value.slice(GOOGLE_PREFIX.length);
  return CURATED_FONTS.find((f) => f.id === value)?.label ?? value;
}

export function resolveCuratedFont(value: string): ResolvedFont | null {
  const font = CURATED_FONTS.find((f) => f.id === value);
  if (!font) return null;
  return { value, family: `resume-${font.id}`, regular: font.files.regular, bold: font.files.bold };
}

export function fontFaceCss(fonts: ResolvedFont[]): string {
  return fonts
    .map(
      (f) =>
        `@font-face{font-family:'${f.family}';src:url('${f.regular}') format('truetype');font-weight:400;font-style:normal;}` +
        `@font-face{font-family:'${f.family}';src:url('${f.bold}') format('truetype');font-weight:700;font-style:normal;}`
    )
    .join("");
}

export const PAGE = { width: 595.28, height: 841.89, padding: 40, gap: 22 };

export const resumeTheme = {
  text: "#111111",
  muted: "#6b6b6b",
  name: 36,
  headline: 9,
  label: 11,
  entryTitle: 11,
  period: 9,
  body: 9,
  side: 8,
};

export function scaledTheme(resume: { titleScalePct: number; textScalePct: number }) {
  const ts = (resume.titleScalePct || 100) / 100;
  const xs = (resume.textScalePct || 100) / 100;
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    ...resumeTheme,
    name: round(resumeTheme.name * ts),
    label: round(resumeTheme.label * ts),
    entryTitle: round(resumeTheme.entryTitle * ts),
    headline: round(resumeTheme.headline * xs),
    period: round(resumeTheme.period * xs),
    body: round(resumeTheme.body * xs),
    side: round(resumeTheme.side * xs),
    sideLabelWidth: round(74 * xs),
  };
}

export function detailRows(profile: ResumeFull["profile"]) {
  return [
    { label: "Woonplaats", value: profile.residence },
    { label: "Telefoonnummer", value: profile.phone },
    { label: "Email", value: profile.email },
    { label: "Geboortedatum", value: profile.birthDate },
    { label: "Rijbewijs", value: profile.drivingLicense },
  ].filter((r) => r.value);
}
