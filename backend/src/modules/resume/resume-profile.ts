import { join } from "path";
import { eq } from "drizzle-orm";
import db from "../../db/client";
import { resumeProfiles } from "../../db/schema";
import type { ResumeLink, ResumeProfile, ResumeSection } from "../../types/shared";
import { NotFoundError } from "../../utils/errors";
import { cleanLinks, cleanSections, legacySections, parseJson, str } from "./resume-clean";
import { EMPTY_PROFILE, type ProfileInput } from "./resume-constants";

const PHOTO_URL_PREFIX = "/api/resume/photo/";
const PHOTO_NAME = /^resume_[0-9a-f-]+\.(jpg|jpeg|png|webp)$/;
const UPLOADS_DIR = join(import.meta.dir, "../../../uploads");

export const PHOTO_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
export const PHOTO_MAX_BYTES = 8 * 1024 * 1024;

export class ResumeProfiles {
  private toProfile(row: typeof resumeProfiles.$inferSelect): ResumeProfile {
    const sections = cleanSections(parseJson<ResumeSection[]>(row.sections, []));
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
      sections: sections.length > 0 ? sections : legacySections(row),
    };
  }

  get(userId: number): ResumeProfile {
    const row = db.select().from(resumeProfiles).where(eq(resumeProfiles.userId, userId)).get();
    return row ? this.toProfile(row) : { ...EMPTY_PROFILE };
  }

  upsert(userId: number, data: ProfileInput): ResumeProfile {
    const current = this.get(userId);
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
    return this.get(userId);
  }

  setPhoto(userId: number, photoPath: string | null): { profile: ResumeProfile; previousPath: string | null } {
    const previousPath = this.get(userId).photoPath;
    this.upsert(userId, {});
    db.update(resumeProfiles).set({ photoPath, updatedAt: new Date().toISOString() }).where(eq(resumeProfiles.userId, userId)).run();
    return { profile: this.get(userId), previousPath };
  }

  async replacePhoto(userId: number, filename: string | null): Promise<ResumeProfile> {
    const { profile, previousPath } = this.setPhoto(userId, filename ? `${PHOTO_URL_PREFIX}${filename}` : null);
    if (previousPath?.startsWith(PHOTO_URL_PREFIX)) {
      const previousName = previousPath.slice(PHOTO_URL_PREFIX.length);
      if (PHOTO_NAME.test(previousName)) await Bun.file(join(UPLOADS_DIR, previousName)).delete().catch(() => {});
    }
    return profile;
  }

  ownsPhoto(userId: number, photoPath: string) {
    const row = db.select().from(resumeProfiles).where(eq(resumeProfiles.userId, userId)).get();
    return !!row && row.photoPath === photoPath;
  }

  async photoFile(userId: number, filename: string) {
    if (!PHOTO_NAME.test(filename) || !this.ownsPhoto(userId, `${PHOTO_URL_PREFIX}${filename}`)) {
      throw new NotFoundError("resume.photoNotFound");
    }
    const file = Bun.file(join(UPLOADS_DIR, filename));
    if (!(await file.exists())) throw new NotFoundError("resume.photoNotFound");
    return file;
  }
}
