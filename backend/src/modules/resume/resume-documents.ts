import { and, asc, eq } from "drizzle-orm";
import db from "../../db/client";
import { resumeItems, resumes } from "../../db/schema";
import type {
  Resume,
  ResumeEducation,
  ResumeEntry,
  ResumeExperience,
  ResumeFull,
  ResumeItemInput,
} from "../../types/shared";
import { ConflictError, NotFoundError, orNotFound, ValidationError } from "../../utils/errors";
import { str } from "./resume-clean";
import {
  DEFAULT_RESUME_SETTINGS,
  HEX_COLOR,
  type ItemInput,
  type ResumeInput,
  type ResumeSettings,
} from "./resume-constants";
import { isValidFontValue } from "./fonts";
import type { ResumeLibrary } from "./resume-library";
import type { ResumeProfiles } from "./resume-profile";

type Kind = "experience" | "education";

function validScale(value: number, min: number, max: number) {
  return Number.isInteger(value) && value % 5 === 0 && value >= min && value <= max;
}

export class ResumeDocuments {
  constructor(
    private readonly library: ResumeLibrary,
    private readonly profiles: ResumeProfiles,
  ) {}

  list(userId: number): Resume[] {
    return db
      .select()
      .from(resumes)
      .where(eq(resumes.userId, userId))
      .all()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(({ userId: _u, ...rest }) => rest);
  }

  private getOwned(id: number, userId: number) {
    return orNotFound(
      db
        .select()
        .from(resumes)
        .where(and(eq(resumes.id, id), eq(resumes.userId, userId)))
        .get(),
      "resume.notFound",
    );
  }

  private settings(data: ResumeInput, base: ResumeSettings): ResumeSettings {
    const name = data.name !== undefined ? str(data.name, 100) : base.name;
    if (!name) throw new ValidationError("resume.nameRequired");
    const titleFont = data.titleFont !== undefined ? data.titleFont : base.titleFont;
    const textFont = data.textFont !== undefined ? data.textFont : base.textFont;
    if (!isValidFontValue(titleFont) || !isValidFontValue(textFont)) throw new ValidationError("resume.invalidFont");
    const accentColor = data.accentColor !== undefined ? data.accentColor : base.accentColor;
    if (!HEX_COLOR.test(accentColor)) throw new ValidationError("resume.invalidAccentColor");
    const leftWidthPct = data.leftWidthPct !== undefined ? data.leftWidthPct : base.leftWidthPct;
    if (!validScale(leftWidthPct, 50, 80)) throw new ValidationError("resume.invalidColumnWidth");
    const titleScalePct = data.titleScalePct !== undefined ? data.titleScalePct : base.titleScalePct;
    const textScalePct = data.textScalePct !== undefined ? data.textScalePct : base.textScalePct;
    for (const scale of [titleScalePct, textScalePct]) {
      if (!validScale(scale, 80, 140)) throw new ValidationError("resume.invalidFontSize");
    }
    const swapColumns = data.swapColumns !== undefined ? data.swapColumns : base.swapColumns;
    return { name, titleFont, textFont, accentColor, leftWidthPct, swapColumns, titleScalePct, textScalePct };
  }

  create(userId: number, data: ResumeInput): Resume {
    const values = this.settings(data, DEFAULT_RESUME_SETTINGS);
    const row = db
      .insert(resumes)
      .values({ userId, ...values })
      .returning()
      .get();
    if (data.selectAll) {
      this.setItems(row.id, userId, [
        ...this.library.listExperiences(userId).map((e) => ({ kind: "experience", refId: e.id })),
        ...this.library.listEducations(userId).map((e) => ({ kind: "education", refId: e.id })),
      ]);
    }
    const { userId: _u, ...rest } = row;
    return rest;
  }

  update(id: number, userId: number, data: ResumeInput): Resume {
    const existing = this.getOwned(id, userId);
    const values = this.settings(data, existing);
    const row = db
      .update(resumes)
      .set({ ...values, updatedAt: new Date().toISOString() })
      .where(eq(resumes.id, id))
      .returning()
      .get();
    const { userId: _u, ...rest } = row;
    return rest;
  }

  remove(id: number, userId: number): { success: true } {
    this.getOwned(id, userId);
    db.delete(resumes).where(eq(resumes.id, id)).run();
    return { success: true };
  }

  duplicate(id: number, userId: number): Resume {
    const existing = this.getOwned(id, userId);
    const copy = db
      .insert(resumes)
      .values({
        userId,
        name: `${existing.name} (kopie)`.slice(0, 100),
        titleFont: existing.titleFont,
        textFont: existing.textFont,
        accentColor: existing.accentColor,
        leftWidthPct: existing.leftWidthPct,
        swapColumns: existing.swapColumns,
        titleScalePct: existing.titleScalePct,
        textScalePct: existing.textScalePct,
      })
      .returning()
      .get();
    for (const item of db.select().from(resumeItems).where(eq(resumeItems.resumeId, id)).all()) {
      db.insert(resumeItems)
        .values({
          resumeId: copy.id,
          kind: item.kind,
          refId: item.refId,
          sortOrder: item.sortOrder,
          descriptionOverride: item.descriptionOverride,
        })
        .run();
    }
    const { userId: _u, ...rest } = copy;
    return rest;
  }

  setItems(id: number, userId: number, items: ItemInput[]): ResumeItemInput[] {
    this.getOwned(id, userId);
    const expIds = new Set(this.library.listExperiences(userId).map((e) => e.id));
    const eduIds = new Set(this.library.listEducations(userId).map((e) => e.id));
    const seen = new Set<string>();
    for (const item of items) {
      if (item.kind !== "experience" && item.kind !== "education") throw new ValidationError("resume.invalidItemKind");
      const owned = item.kind === "experience" ? expIds.has(item.refId) : eduIds.has(item.refId);
      if (!owned) throw new NotFoundError("resume.itemNotFound");
      const key = `${item.kind}:${item.refId}`;
      if (seen.has(key)) throw new ConflictError("resume.duplicateItem");
      seen.add(key);
    }
    db.delete(resumeItems).where(eq(resumeItems.resumeId, id)).run();
    items.forEach((item, index) => {
      const override = typeof item.descriptionOverride === "string" ? str(item.descriptionOverride, 2000) : null;
      db.insert(resumeItems)
        .values({
          resumeId: id,
          kind: item.kind,
          refId: item.refId,
          sortOrder: index,
          descriptionOverride: override,
        })
        .run();
    });
    db.update(resumes).set({ updatedAt: new Date().toISOString() }).where(eq(resumes.id, id)).run();
    return this.getSelected(id);
  }

  private getSelected(id: number): ResumeItemInput[] {
    return db
      .select()
      .from(resumeItems)
      .where(eq(resumeItems.resumeId, id))
      .orderBy(asc(resumeItems.sortOrder))
      .all()
      .map((i) => ({ kind: i.kind as Kind, refId: i.refId, descriptionOverride: i.descriptionOverride }));
  }

  getFull(id: number, userId: number): ResumeFull {
    const { userId: _u, ...resume } = this.getOwned(id, userId);
    const selected = this.getSelected(id);
    const build = <T extends ResumeExperience | ResumeEducation>(kind: Kind, all: T[]): ResumeEntry[] => {
      const entries: ResumeEntry[] = [];
      for (const sel of selected.filter((s) => s.kind === kind)) {
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
      profile: this.profiles.get(userId),
      experiences: build("experience", this.library.listExperiences(userId)),
      educations: build("education", this.library.listEducations(userId)),
      selected,
    };
  }
}
