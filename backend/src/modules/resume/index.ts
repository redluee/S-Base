import { eq, and, asc } from "drizzle-orm";
import db from "../../db/client";
import { resumeProfiles, resumeExperiences, resumeEducations, resumes, resumeItems } from "../../db/schema";
import type {
  Resume,
  ResumeProfile,
  ResumeExperience,
  ResumeEducation,
  ResumeEntry,
  ResumeFull,
  ResumeItemInput,
  ResumeLink,
  ResumeSection,
} from "../../types/shared";
import { isValidFontValue } from "./fonts";

export const RESUME_SECTIONS_MAX = 5;

const EMPTY_PROFILE: ResumeProfile = {
  fullName: "",
  headline: "",
  photoPath: null,
  photoShape: "circle",
  residence: "",
  phone: "",
  email: "",
  birthDate: "",
  drivingLicense: "",
  links: [],
  sections: [],
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function parseJson<T>(value: string, fallback: T): T {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function cleanStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v ?? "").trim()).filter(Boolean);
}

function cleanSections(value: unknown): ResumeSection[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, RESUME_SECTIONS_MAX)
    .map((s: any) => ({
      id: String(s?.id ?? "").trim() || crypto.randomUUID(),
      title: String(s?.title ?? "").trim().slice(0, 60),
      items: cleanStrings(s?.items),
    }));
}

// Pre-existing rows predate the custom sections feature and only have the legacy
// skills/languages/hobbies columns; synthesize default sections from them on first read.
function legacySections(row: { skills: string; languages: string; hobbies: string }): ResumeSection[] {
  const defs: Array<[string, string]> = [
    ["Vaardigheden", row.skills],
    ["Talen", row.languages],
    ["Hobby's", row.hobbies],
  ];
  return defs
    .map(([title, json]) => ({ id: crypto.randomUUID(), title, items: parseJson<string[]>(json, []) }))
    .filter((s) => s.items.length > 0);
}

function cleanLinks(value: unknown): ResumeLink[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((l: any) => ({ label: String(l?.label ?? "").trim(), url: String(l?.url ?? "").trim() }))
    .filter((l) => l.label && l.url);
}

function str(value: unknown, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function periodValues(data: any) {
  const startMonth = Number(data.startMonth);
  const startYear = Number(data.startYear);
  if (!Number.isInteger(startMonth) || startMonth < 1 || startMonth > 12) throw new Error("Invalid start month");
  if (!Number.isInteger(startYear) || startYear < 1950 || startYear > 2100) throw new Error("Invalid start year");
  const isCurrent = Boolean(data.isCurrent);
  if (isCurrent) return { startMonth, startYear, endMonth: null, endYear: null, isCurrent: true };
  const endMonth = Number(data.endMonth);
  const endYear = Number(data.endYear);
  if (!Number.isInteger(endMonth) || endMonth < 1 || endMonth > 12) throw new Error("Invalid end month");
  if (!Number.isInteger(endYear) || endYear < 1950 || endYear > 2100) throw new Error("Invalid end year");
  if (endYear * 12 + endMonth < startYear * 12 + startMonth) throw new Error("End before start");
  return { startMonth, startYear, endMonth, endYear, isCurrent: false };
}

function periodSortKey(p: { startYear: number; startMonth: number; endYear: number | null; endMonth: number | null; isCurrent: boolean }) {
  const end = p.isCurrent ? 9999 * 12 + 12 : (p.endYear ?? 0) * 12 + (p.endMonth ?? 0);
  return (p.startYear * 12 + p.startMonth) * 1_000_000 + end;
}

export class ResumeService {
  private toProfile(row: typeof resumeProfiles.$inferSelect): ResumeProfile {
    return {
      fullName: row.fullName,
      headline: row.headline,
      photoPath: row.photoPath,
      photoShape: row.photoShape === "square" ? "square" : "circle",
      residence: row.residence,
      phone: row.phone,
      email: row.email,
      birthDate: row.birthDate,
      drivingLicense: row.drivingLicense,
      links: parseJson<ResumeLink[]>(row.links, []),
      sections: (() => {
        const sections = cleanSections(parseJson<ResumeSection[]>(row.sections, []));
        return sections.length > 0 ? sections : legacySections(row);
      })(),
    };
  }

  getProfile(userId: number): ResumeProfile {
    const row = db.select().from(resumeProfiles).where(eq(resumeProfiles.userId, userId)).get();
    return row ? this.toProfile(row) : { ...EMPTY_PROFILE };
  }

  upsertProfile(userId: number, data: Partial<ResumeProfile>): ResumeProfile {
    const current = this.getProfile(userId);
    const values = {
      fullName: data.fullName !== undefined ? str(data.fullName, 120) : current.fullName,
      headline: data.headline !== undefined ? str(data.headline, 200) : current.headline,
      photoShape: (data.photoShape ?? current.photoShape) === "square" ? "square" : "circle",
      residence: data.residence !== undefined ? str(data.residence, 120) : current.residence,
      phone: data.phone !== undefined ? str(data.phone, 40) : current.phone,
      email: data.email !== undefined ? str(data.email, 200) : current.email,
      birthDate: data.birthDate !== undefined ? str(data.birthDate, 60) : current.birthDate,
      drivingLicense: data.drivingLicense !== undefined ? str(data.drivingLicense, 40) : current.drivingLicense,
      links: JSON.stringify(data.links !== undefined ? cleanLinks(data.links) : current.links),
      sections: JSON.stringify(data.sections !== undefined ? cleanSections(data.sections) : current.sections),
      updatedAt: new Date().toISOString(),
    };
    const existing = db.select().from(resumeProfiles).where(eq(resumeProfiles.userId, userId)).get();
    if (existing) {
      db.update(resumeProfiles).set(values).where(eq(resumeProfiles.userId, userId)).run();
    } else {
      db.insert(resumeProfiles).values({ userId, ...values }).run();
    }
    return this.getProfile(userId);
  }

  setPhoto(userId: number, photoPath: string | null): { profile: ResumeProfile; previousPath: string | null } {
    const previousPath = this.getProfile(userId).photoPath;
    this.upsertProfile(userId, {});
    db.update(resumeProfiles).set({ photoPath, updatedAt: new Date().toISOString() }).where(eq(resumeProfiles.userId, userId)).run();
    return { profile: this.getProfile(userId), previousPath };
  }

  ownsPhoto(userId: number, photoPath: string) {
    const row = db.select().from(resumeProfiles).where(eq(resumeProfiles.userId, userId)).get();
    return !!row && row.photoPath === photoPath;
  }

  listExperiences(userId: number): ResumeExperience[] {
    return db.select().from(resumeExperiences).where(eq(resumeExperiences.userId, userId)).all()
      .sort((a, b) => periodSortKey(b) - periodSortKey(a))
      .map(({ userId: _u, createdAt: _c, ...rest }) => rest);
  }

  createExperience(userId: number, data: any): ResumeExperience {
    const company = str(data.company, 200);
    const jobTitle = str(data.jobTitle, 200);
    if (!company || !jobTitle) throw new Error("Company and job title are required");
    const row = db.insert(resumeExperiences).values({
      userId,
      company,
      jobTitle,
      place: str(data.place, 120),
      description: str(data.description, 2000),
      logoPath: data.logoPath ? str(data.logoPath, 300) : null,
      ...periodValues(data),
    }).returning().get();
    const { userId: _u, createdAt: _c, ...rest } = row;
    return rest;
  }

  updateExperience(id: number, userId: number, data: any): ResumeExperience | null {
    const existing = db.select().from(resumeExperiences).where(and(eq(resumeExperiences.id, id), eq(resumeExperiences.userId, userId))).get();
    if (!existing) return null;
    const company = data.company !== undefined ? str(data.company, 200) : existing.company;
    const jobTitle = data.jobTitle !== undefined ? str(data.jobTitle, 200) : existing.jobTitle;
    if (!company || !jobTitle) throw new Error("Company and job title are required");
    const period = periodValues({
      startMonth: data.startMonth ?? existing.startMonth,
      startYear: data.startYear ?? existing.startYear,
      endMonth: data.endMonth !== undefined ? data.endMonth : existing.endMonth,
      endYear: data.endYear !== undefined ? data.endYear : existing.endYear,
      isCurrent: data.isCurrent !== undefined ? data.isCurrent : existing.isCurrent,
    });
    const row = db.update(resumeExperiences).set({
      company,
      jobTitle,
      place: data.place !== undefined ? str(data.place, 120) : existing.place,
      description: data.description !== undefined ? str(data.description, 2000) : existing.description,
      logoPath: data.logoPath !== undefined ? (data.logoPath ? str(data.logoPath, 300) : null) : existing.logoPath,
      ...period,
    }).where(eq(resumeExperiences.id, id)).returning().get();
    const { userId: _u, createdAt: _c, ...rest } = row;
    return rest;
  }

  deleteExperience(id: number, userId: number): boolean {
    const existing = db.select().from(resumeExperiences).where(and(eq(resumeExperiences.id, id), eq(resumeExperiences.userId, userId))).get();
    if (!existing) return false;
    db.delete(resumeItems).where(and(eq(resumeItems.kind, "experience"), eq(resumeItems.refId, id))).run();
    db.delete(resumeExperiences).where(eq(resumeExperiences.id, id)).run();
    return true;
  }

  listEducations(userId: number): ResumeEducation[] {
    return db.select().from(resumeEducations).where(eq(resumeEducations.userId, userId)).all()
      .sort((a, b) => periodSortKey(b) - periodSortKey(a))
      .map(({ userId: _u, createdAt: _c, ...rest }) => rest);
  }

  createEducation(userId: number, data: any): ResumeEducation {
    const institution = str(data.institution, 200);
    const degree = str(data.degree, 200);
    if (!institution || !degree) throw new Error("Institution and degree are required");
    const row = db.insert(resumeEducations).values({
      userId,
      institution,
      degree,
      place: str(data.place, 120),
      description: str(data.description, 2000),
      logoPath: data.logoPath ? str(data.logoPath, 300) : null,
      ...periodValues(data),
    }).returning().get();
    const { userId: _u, createdAt: _c, ...rest } = row;
    return rest;
  }

  updateEducation(id: number, userId: number, data: any): ResumeEducation | null {
    const existing = db.select().from(resumeEducations).where(and(eq(resumeEducations.id, id), eq(resumeEducations.userId, userId))).get();
    if (!existing) return null;
    const institution = data.institution !== undefined ? str(data.institution, 200) : existing.institution;
    const degree = data.degree !== undefined ? str(data.degree, 200) : existing.degree;
    if (!institution || !degree) throw new Error("Institution and degree are required");
    const period = periodValues({
      startMonth: data.startMonth ?? existing.startMonth,
      startYear: data.startYear ?? existing.startYear,
      endMonth: data.endMonth !== undefined ? data.endMonth : existing.endMonth,
      endYear: data.endYear !== undefined ? data.endYear : existing.endYear,
      isCurrent: data.isCurrent !== undefined ? data.isCurrent : existing.isCurrent,
    });
    const row = db.update(resumeEducations).set({
      institution,
      degree,
      place: data.place !== undefined ? str(data.place, 120) : existing.place,
      description: data.description !== undefined ? str(data.description, 2000) : existing.description,
      logoPath: data.logoPath !== undefined ? (data.logoPath ? str(data.logoPath, 300) : null) : existing.logoPath,
      ...period,
    }).where(eq(resumeEducations.id, id)).returning().get();
    const { userId: _u, createdAt: _c, ...rest } = row;
    return rest;
  }

  deleteEducation(id: number, userId: number): boolean {
    const existing = db.select().from(resumeEducations).where(and(eq(resumeEducations.id, id), eq(resumeEducations.userId, userId))).get();
    if (!existing) return false;
    db.delete(resumeItems).where(and(eq(resumeItems.kind, "education"), eq(resumeItems.refId, id))).run();
    db.delete(resumeEducations).where(eq(resumeEducations.id, id)).run();
    return true;
  }

  listResumes(userId: number): Resume[] {
    return db.select().from(resumes).where(eq(resumes.userId, userId)).all()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(({ userId: _u, ...rest }) => rest);
  }

  private getOwnedResume(id: number, userId: number) {
    return db.select().from(resumes).where(and(eq(resumes.id, id), eq(resumes.userId, userId))).get();
  }

  private resumeSettings(data: any, base: { titleFont: string; textFont: string; accentColor: string; leftWidthPct: number; swapColumns: boolean; titleScalePct: number; textScalePct: number; name: string }) {
    const name = data.name !== undefined ? str(data.name, 100) : base.name;
    if (!name) throw new Error("Name is required");
    const titleFont = data.titleFont !== undefined ? data.titleFont : base.titleFont;
    const textFont = data.textFont !== undefined ? data.textFont : base.textFont;
    if (!isValidFontValue(titleFont) || !isValidFontValue(textFont)) throw new Error("Invalid font");
    const accentColor = data.accentColor !== undefined ? String(data.accentColor) : base.accentColor;
    if (!HEX_COLOR.test(accentColor)) throw new Error("Invalid accent color");
    const leftWidthPct = data.leftWidthPct !== undefined ? Number(data.leftWidthPct) : base.leftWidthPct;
    if (!Number.isInteger(leftWidthPct) || leftWidthPct % 5 !== 0 || leftWidthPct < 50 || leftWidthPct > 80) {
      throw new Error("Invalid column width");
    }
    const swapColumns = data.swapColumns !== undefined ? Boolean(data.swapColumns) : base.swapColumns;
    const titleScalePct = data.titleScalePct !== undefined ? Number(data.titleScalePct) : base.titleScalePct;
    const textScalePct = data.textScalePct !== undefined ? Number(data.textScalePct) : base.textScalePct;
    for (const scale of [titleScalePct, textScalePct]) {
      if (!Number.isInteger(scale) || scale % 5 !== 0 || scale < 80 || scale > 140) throw new Error("Invalid font size");
    }
    return { name, titleFont, textFont, accentColor, leftWidthPct, swapColumns, titleScalePct, textScalePct };
  }

  createResume(userId: number, data: any): Resume {
    const values = this.resumeSettings(data, { name: "", titleFont: "carlito", textFont: "carlito", accentColor: "#1f7bc4", leftWidthPct: 70, swapColumns: false, titleScalePct: 100, textScalePct: 100 });
    const row = db.insert(resumes).values({ userId, ...values }).returning().get();
    const items: ResumeItemInput[] = [
      ...this.listExperiences(userId).map((e) => ({ kind: "experience" as const, refId: e.id })),
      ...this.listEducations(userId).map((e) => ({ kind: "education" as const, refId: e.id })),
    ];
    if (data.selectAll) this.setResumeItems(row.id, userId, items);
    const { userId: _u, ...rest } = row;
    return rest;
  }

  updateResume(id: number, userId: number, data: any): Resume | null {
    const existing = this.getOwnedResume(id, userId);
    if (!existing) return null;
    const values = this.resumeSettings(data, existing);
    const row = db.update(resumes).set({ ...values, updatedAt: new Date().toISOString() }).where(eq(resumes.id, id)).returning().get();
    const { userId: _u, ...rest } = row;
    return rest;
  }

  deleteResume(id: number, userId: number): boolean {
    if (!this.getOwnedResume(id, userId)) return false;
    db.delete(resumes).where(eq(resumes.id, id)).run();
    return true;
  }

  duplicateResume(id: number, userId: number): Resume | null {
    const existing = this.getOwnedResume(id, userId);
    if (!existing) return null;
    const copy = db.insert(resumes).values({
      userId,
      name: `${existing.name} (kopie)`.slice(0, 100),
      titleFont: existing.titleFont,
      textFont: existing.textFont,
      accentColor: existing.accentColor,
      leftWidthPct: existing.leftWidthPct,
      swapColumns: existing.swapColumns,
      titleScalePct: existing.titleScalePct,
      textScalePct: existing.textScalePct,
    }).returning().get();
    const items = db.select().from(resumeItems).where(eq(resumeItems.resumeId, id)).all();
    for (const item of items) {
      db.insert(resumeItems).values({
        resumeId: copy.id,
        kind: item.kind,
        refId: item.refId,
        sortOrder: item.sortOrder,
        descriptionOverride: item.descriptionOverride,
      }).run();
    }
    const { userId: _u, ...rest } = copy;
    return rest;
  }

  setResumeItems(id: number, userId: number, items: ResumeItemInput[]): ResumeItemInput[] | null {
    if (!this.getOwnedResume(id, userId)) return null;
    const list = Array.isArray(items) ? items : [];
    const expIds = new Set(this.listExperiences(userId).map((e) => e.id));
    const eduIds = new Set(this.listEducations(userId).map((e) => e.id));
    const seen = new Set<string>();
    for (const item of list) {
      if (item.kind !== "experience" && item.kind !== "education") throw new Error("Invalid item kind");
      const owned = item.kind === "experience" ? expIds.has(item.refId) : eduIds.has(item.refId);
      if (!owned) throw new Error("Item not found");
      const key = `${item.kind}:${item.refId}`;
      if (seen.has(key)) throw new Error("Duplicate item");
      seen.add(key);
    }
    db.delete(resumeItems).where(eq(resumeItems.resumeId, id)).run();
    list.forEach((item, index) => {
      const override = typeof item.descriptionOverride === "string" ? str(item.descriptionOverride, 2000) : null;
      db.insert(resumeItems).values({
        resumeId: id,
        kind: item.kind,
        refId: item.refId,
        sortOrder: index,
        descriptionOverride: override,
      }).run();
    });
    db.update(resumes).set({ updatedAt: new Date().toISOString() }).where(eq(resumes.id, id)).run();
    return this.getSelected(id);
  }

  private getSelected(id: number): ResumeItemInput[] {
    return db.select().from(resumeItems).where(eq(resumeItems.resumeId, id)).orderBy(asc(resumeItems.sortOrder)).all()
      .map((i) => ({ kind: i.kind as "experience" | "education", refId: i.refId, descriptionOverride: i.descriptionOverride }));
  }

  getResumeFull(id: number, userId: number): ResumeFull | null {
    const row = this.getOwnedResume(id, userId);
    if (!row) return null;
    const { userId: _u, ...resume } = row;
    const selected = this.getSelected(id);
    const experiences = this.listExperiences(userId);
    const educations = this.listEducations(userId);
    const build = <T extends ResumeExperience | ResumeEducation>(kind: "experience" | "education", all: T[]): ResumeEntry[] => {
      const picked = selected.filter((s) => s.kind === kind);
      const entries: ResumeEntry[] = [];
      for (const sel of picked) {
        const src = all.find((e) => e.id === sel.refId);
        if (!src) continue;
        const isExp = kind === "experience";
        const exp = src as ResumeExperience;
        const edu = src as ResumeEducation;
        const hasOverride = sel.descriptionOverride != null;
        entries.push({
          kind,
          refId: src.id,
          title: isExp ? exp.jobTitle : edu.degree,
          organization: isExp ? exp.company : edu.institution,
          place: src.place,
          startMonth: src.startMonth,
          startYear: src.startYear,
          endMonth: src.endMonth,
          endYear: src.endYear,
          isCurrent: src.isCurrent,
          description: hasOverride ? (sel.descriptionOverride as string) : src.description,
          hasDescriptionOverride: hasOverride,
          logoPath: src.logoPath,
        });
      }
      return entries;
    };
    return {
      resume,
      profile: this.getProfile(userId),
      experiences: build("experience", experiences),
      educations: build("education", educations),
      selected,
    };
  }
}
