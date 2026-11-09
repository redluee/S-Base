import { and, eq } from "drizzle-orm";
import db from "../../db/client";
import { resumeEducations, resumeExperiences, resumeItems } from "../../db/schema";
import type { ResumeEducation, ResumeExperience } from "../../types/shared";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { mergePeriod, periodSortKey, periodValues, str } from "./resume-clean";
import type { EducationInput, ExperienceInput } from "./resume-constants";

function strip<T extends { userId: number; createdAt: string }>({ userId: _u, createdAt: _c, ...rest }: T) {
  return rest;
}

function optionalPath(value: string | null | undefined) {
  return value ? str(value, 300) : null;
}

export class ResumeLibrary {
  listExperiences(userId: number): ResumeExperience[] {
    return db.select().from(resumeExperiences).where(eq(resumeExperiences.userId, userId)).all()
      .sort((a, b) => periodSortKey(b) - periodSortKey(a))
      .map(strip);
  }

  createExperience(userId: number, data: ExperienceInput): ResumeExperience {
    const company = str(data.company, 200);
    const jobTitle = str(data.jobTitle, 200);
    if (!company || !jobTitle) throw new ValidationError("resume.companyAndJobTitleRequired");
    const row = db.insert(resumeExperiences).values({
      userId,
      company,
      jobTitle,
      place: str(data.place, 120),
      description: str(data.description, 2000),
      logoPath: optionalPath(data.logoPath),
      ...periodValues(data),
    }).returning().get();
    return strip(row);
  }

  updateExperience(id: number, userId: number, data: ExperienceInput): ResumeExperience {
    const existing = db.select().from(resumeExperiences).where(and(eq(resumeExperiences.id, id), eq(resumeExperiences.userId, userId))).get();
    if (!existing) throw new NotFoundError("resume.experienceNotFound");
    const company = data.company !== undefined ? str(data.company, 200) : existing.company;
    const jobTitle = data.jobTitle !== undefined ? str(data.jobTitle, 200) : existing.jobTitle;
    if (!company || !jobTitle) throw new ValidationError("resume.companyAndJobTitleRequired");
    const row = db.update(resumeExperiences).set({
      company,
      jobTitle,
      place: data.place !== undefined ? str(data.place, 120) : existing.place,
      description: data.description !== undefined ? str(data.description, 2000) : existing.description,
      logoPath: data.logoPath !== undefined ? optionalPath(data.logoPath) : existing.logoPath,
      ...mergePeriod(data, existing),
    }).where(eq(resumeExperiences.id, id)).returning().get();
    return strip(row);
  }

  deleteExperience(id: number, userId: number): { success: true } {
    const existing = db.select().from(resumeExperiences).where(and(eq(resumeExperiences.id, id), eq(resumeExperiences.userId, userId))).get();
    if (!existing) throw new NotFoundError("resume.experienceNotFound");
    db.delete(resumeItems).where(and(eq(resumeItems.kind, "experience"), eq(resumeItems.refId, id))).run();
    db.delete(resumeExperiences).where(eq(resumeExperiences.id, id)).run();
    return { success: true };
  }

  listEducations(userId: number): ResumeEducation[] {
    return db.select().from(resumeEducations).where(eq(resumeEducations.userId, userId)).all()
      .sort((a, b) => periodSortKey(b) - periodSortKey(a))
      .map(strip);
  }

  createEducation(userId: number, data: EducationInput): ResumeEducation {
    const institution = str(data.institution, 200);
    const degree = str(data.degree, 200);
    if (!institution || !degree) throw new ValidationError("resume.institutionAndDegreeRequired");
    const row = db.insert(resumeEducations).values({
      userId,
      institution,
      degree,
      place: str(data.place, 120),
      description: str(data.description, 2000),
      logoPath: optionalPath(data.logoPath),
      ...periodValues(data),
    }).returning().get();
    return strip(row);
  }

  updateEducation(id: number, userId: number, data: EducationInput): ResumeEducation {
    const existing = db.select().from(resumeEducations).where(and(eq(resumeEducations.id, id), eq(resumeEducations.userId, userId))).get();
    if (!existing) throw new NotFoundError("resume.educationNotFound");
    const institution = data.institution !== undefined ? str(data.institution, 200) : existing.institution;
    const degree = data.degree !== undefined ? str(data.degree, 200) : existing.degree;
    if (!institution || !degree) throw new ValidationError("resume.institutionAndDegreeRequired");
    const row = db.update(resumeEducations).set({
      institution,
      degree,
      place: data.place !== undefined ? str(data.place, 120) : existing.place,
      description: data.description !== undefined ? str(data.description, 2000) : existing.description,
      logoPath: data.logoPath !== undefined ? optionalPath(data.logoPath) : existing.logoPath,
      ...mergePeriod(data, existing),
    }).where(eq(resumeEducations.id, id)).returning().get();
    return strip(row);
  }

  deleteEducation(id: number, userId: number): { success: true } {
    const existing = db.select().from(resumeEducations).where(and(eq(resumeEducations.id, id), eq(resumeEducations.userId, userId))).get();
    if (!existing) throw new NotFoundError("resume.educationNotFound");
    db.delete(resumeItems).where(and(eq(resumeItems.kind, "education"), eq(resumeItems.refId, id))).run();
    db.delete(resumeEducations).where(eq(resumeEducations.id, id)).run();
    return { success: true };
  }
}
