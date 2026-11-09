import { describe, expect, it, beforeEach } from "bun:test";
import db from "../../db/client";
import { resumeProfiles } from "../../db/schema";
import { setupTestDb } from "../../test-utils";
import { ResumeService } from "./index";
import { isValidFontValue } from "./fonts";
import { ConflictError, NotFoundError, ValidationError } from "../../utils/errors";
import type { ExperienceInput } from "./resume-constants";

const exp = (over: ExperienceInput = {}) => ({
  company: "Acme",
  place: "Utrecht",
  jobTitle: "Developer",
  startMonth: 2,
  startYear: 2024,
  endMonth: 6,
  endYear: 2025,
  ...over,
});

describe("ResumeService", () => {
  let svc: ResumeService;
  let adminId: number;
  let testerId: number;

  beforeEach(async () => {
    const ids = await setupTestDb();
    adminId = ids.adminId;
    testerId = ids.testerId;
    svc = new ResumeService();
    db.delete(resumeProfiles).run();
    for (const uid of [adminId, testerId]) {
      for (const r of svc.resumes.list(uid)) svc.resumes.remove(r.id, uid);
      for (const e of svc.library.listExperiences(uid)) svc.library.deleteExperience(e.id, uid);
      for (const e of svc.library.listEducations(uid)) svc.library.deleteEducation(e.id, uid);
    }
  });

  it("returns an empty profile and upserts per user", () => {
    expect(svc.profile.get(adminId).fullName).toBe("");
    svc.profile.upsert(adminId, {
      fullName: "  Jane Doe ",
      sections: [{ id: "s1", title: "Vaardigheden", items: ["A", " ", "B"] }],
      photoShape: "square",
    });
    const p = svc.profile.get(adminId);
    expect(p.fullName).toBe("Jane Doe");
    expect(p.sections).toEqual([{ id: "s1", title: "Vaardigheden", items: ["A", "B"] }]);
    expect(p.photoShape).toBe("square");
    expect(svc.profile.get(testerId).fullName).toBe("");
  });

  it("caps sections at the max and sanitizes titles/items", () => {
    const sections = Array.from({ length: 7 }, (_, i) => ({ id: "", title: `  Section ${i}  `, items: [" x ", ""] }));
    svc.profile.upsert(adminId, { sections });
    const p = svc.profile.get(adminId);
    expect(p.sections).toHaveLength(5);
    expect(p.sections[0].title).toBe("Section 0");
    expect(p.sections[0].items).toEqual(["x"]);
    expect(p.sections[0].id).not.toBe("");
  });

  it("validates experience dates", () => {
    expect(() => svc.library.createExperience(adminId, exp({ startMonth: 13 }))).toThrow(ValidationError);
    expect(() => svc.library.createExperience(adminId, exp({ endYear: 2020 }))).toThrow(ValidationError);
    expect(() => svc.library.createExperience(adminId, exp({ endMonth: null, endYear: null }))).toThrow(ValidationError);
    expect(() => svc.library.createExperience(adminId, exp({ company: "" }))).toThrow(ValidationError);
    const cur = svc.library.createExperience(adminId, exp({ isCurrent: true, endMonth: 3, endYear: 2030 }));
    expect(cur.isCurrent).toBe(true);
    expect(cur.endMonth).toBeNull();
    expect(cur.endYear).toBeNull();
  });

  it("sorts by start date, newest first", () => {
    const a = svc.library.createExperience(adminId, exp({ jobTitle: "Old", startMonth: 1, startYear: 2019, endYear: 2025 }));
    const b = svc.library.createExperience(adminId, exp({ jobTitle: "New", startMonth: 6, startYear: 2023, endYear: 2024 }));
    const c = svc.library.createExperience(adminId, exp({ jobTitle: "Mid", startMonth: 3, startYear: 2021, isCurrent: true }));
    expect(svc.library.listExperiences(adminId).map((e) => e.id)).toEqual([b.id, c.id, a.id]);
  });

  it("selects all items newest start first when creating a resume", () => {
    const old = svc.library.createEducation(adminId, { institution: "A", degree: "Old", startMonth: 9, startYear: 2010, endMonth: 6, endYear: 2014 });
    const recent = svc.library.createEducation(adminId, { institution: "B", degree: "Recent", startMonth: 9, startYear: 2018, endMonth: 6, endYear: 2020 });
    const r = svc.resumes.create(adminId, { name: "CV", selectAll: true });
    expect(svc.resumes.getFull(r.id, adminId).selected.map((s) => s.refId)).toEqual([recent.id, old.id]);
  });

  it("isolates data between users", () => {
    const e = svc.library.createExperience(adminId, exp());
    expect(svc.library.listExperiences(testerId)).toHaveLength(0);
    expect(() => svc.library.updateExperience(e.id, testerId, { company: "X" })).toThrow(NotFoundError);
    expect(() => svc.library.deleteExperience(e.id, testerId)).toThrow(NotFoundError);
    const r = svc.resumes.create(adminId, { name: "CV" });
    expect(() => svc.resumes.getFull(r.id, testerId)).toThrow(NotFoundError);
    expect(() => svc.resumes.update(r.id, testerId, { name: "Hack" })).toThrow(NotFoundError);
    expect(() => svc.resumes.remove(r.id, testerId)).toThrow(NotFoundError);
    expect(() => svc.resumes.duplicate(r.id, testerId)).toThrow(NotFoundError);
    expect(() => svc.resumes.setItems(r.id, testerId, [])).toThrow(NotFoundError);
  });

  it("throws typed errors with resume keys", () => {
    const key = (fn: () => unknown) => {
      try {
        fn();
      } catch (e) {
        return e instanceof ValidationError || e instanceof NotFoundError ? e.key : "other";
      }
      return "none";
    };
    expect(key(() => svc.library.createExperience(adminId, exp({ startMonth: 13 })))).toBe("resume.invalidStartMonth");
    expect(key(() => svc.library.createExperience(adminId, exp({ startYear: 1900 })))).toBe("resume.invalidStartYear");
    expect(key(() => svc.library.createExperience(adminId, exp({ endMonth: 0 })))).toBe("resume.invalidEndMonth");
    expect(key(() => svc.library.createExperience(adminId, exp({ endMonth: null, endYear: null })))).toBe("resume.invalidEndMonth");
    expect(key(() => svc.library.createExperience(adminId, exp({ endYear: 2020 })))).toBe("resume.endBeforeStart");
    expect(key(() => svc.library.createExperience(adminId, exp({ company: "" })))).toBe("resume.companyAndJobTitleRequired");
    expect(key(() => svc.library.createEducation(adminId, { institution: "", degree: "x", startMonth: 1, startYear: 2020, isCurrent: true }))).toBe("resume.institutionAndDegreeRequired");
    expect(key(() => svc.resumes.create(adminId, { name: "" }))).toBe("resume.nameRequired");
    expect(key(() => svc.resumes.create(adminId, { name: "x", accentColor: "blue" }))).toBe("resume.invalidAccentColor");
    expect(key(() => svc.resumes.create(adminId, { name: "x", titleFont: "comic-sans" }))).toBe("resume.invalidFont");
    expect(key(() => svc.resumes.create(adminId, { name: "x", leftWidthPct: 72 }))).toBe("resume.invalidColumnWidth");
    expect(key(() => svc.resumes.create(adminId, { name: "x", textScalePct: 150 }))).toBe("resume.invalidFontSize");
    expect(key(() => svc.library.deleteEducation(999999, adminId))).toBe("resume.educationNotFound");
    expect(key(() => svc.library.updateExperience(999999, adminId, {}))).toBe("resume.experienceNotFound");
    expect(key(() => svc.resumes.getFull(999999, adminId))).toBe("resume.notFound");
  });

  it("rejects invalid, foreign and duplicate items", () => {
    const e = svc.library.createExperience(adminId, exp());
    const r = svc.resumes.create(adminId, { name: "CV" });
    expect(() => svc.resumes.setItems(r.id, adminId, [{ kind: "other", refId: e.id }])).toThrow(ValidationError);
    expect(() => svc.resumes.setItems(r.id, adminId, [{ kind: "experience", refId: e.id }, { kind: "experience", refId: e.id }])).toThrow(ConflictError);
  });

  it("rejects items owned by another user", () => {
    const foreign = svc.library.createExperience(testerId, exp());
    const r = svc.resumes.create(adminId, { name: "CV" });
    expect(() => svc.resumes.setItems(r.id, adminId, [{ kind: "experience", refId: foreign.id }])).toThrow(NotFoundError);
  });

  it("builds a resume with selected items, order and description override", () => {
    const e1 = svc.library.createExperience(adminId, exp({ jobTitle: "One", description: "orig" }));
    const e2 = svc.library.createExperience(adminId, exp({ jobTitle: "Two" }));
    svc.library.createExperience(adminId, exp({ jobTitle: "Unselected" }));
    const edu = svc.library.createEducation(adminId, { institution: "School", degree: "BSc", startMonth: 9, startYear: 2020, isCurrent: true });
    const r = svc.resumes.create(adminId, { name: "CV" });
    svc.resumes.setItems(r.id, adminId, [
      { kind: "experience", refId: e2.id },
      { kind: "experience", refId: e1.id, descriptionOverride: "short" },
      { kind: "education", refId: edu.id },
    ]);
    const full = svc.resumes.getFull(r.id, adminId);
    expect(full.experiences.map((e) => e.title)).toEqual(["Two", "One"]);
    expect(full.experiences[1].description).toBe("short");
    expect(full.experiences[1].hasDescriptionOverride).toBe(true);
    expect(full.educations[0].title).toBe("BSc");
    expect(full.educations[0].isCurrent).toBe(true);
  });

  it("removes deleted library items from resumes", () => {
    const e1 = svc.library.createExperience(adminId, exp());
    const r = svc.resumes.create(adminId, { name: "CV" });
    svc.resumes.setItems(r.id, adminId, [{ kind: "experience", refId: e1.id }]);
    svc.library.deleteExperience(e1.id, adminId);
    expect(svc.resumes.getFull(r.id, adminId).experiences).toHaveLength(0);
  });

  it("validates resume settings", () => {
    expect(() => svc.resumes.create(adminId, { name: "" })).toThrow(ValidationError);
    expect(() => svc.resumes.create(adminId, { name: "x", leftWidthPct: 72 })).toThrow(ValidationError);
    expect(() => svc.resumes.create(adminId, { name: "x", leftWidthPct: 85 })).toThrow(ValidationError);
    expect(() => svc.resumes.create(adminId, { name: "x", accentColor: "blue" })).toThrow(ValidationError);
    expect(() => svc.resumes.create(adminId, { name: "x", titleFont: "comic-sans" })).toThrow(ValidationError);
    const r = svc.resumes.create(adminId, { name: "x", leftWidthPct: 65, textFont: "google:Open Sans" });
    expect(r.leftWidthPct).toBe(65);
    expect(r.textFont).toBe("google:Open Sans");
  });

  it("duplicates a resume with its items", () => {
    const e1 = svc.library.createExperience(adminId, exp());
    const r = svc.resumes.create(adminId, { name: "CV" });
    svc.resumes.setItems(r.id, adminId, [{ kind: "experience", refId: e1.id }]);
    const copy = svc.resumes.duplicate(r.id, adminId);
    expect(copy.id).not.toBe(r.id);
    expect(svc.resumes.getFull(copy.id, adminId)!.experiences).toHaveLength(1);
    svc.resumes.remove(r.id, adminId);
    expect(svc.resumes.getFull(copy.id, adminId)!.experiences).toHaveLength(1);
  });

  it("tracks photo ownership", () => {
    svc.profile.setPhoto(adminId, "/api/resume/photo/resume_x.jpg");
    expect(svc.profile.ownsPhoto(adminId, "/api/resume/photo/resume_x.jpg")).toBe(true);
    expect(svc.profile.ownsPhoto(testerId, "/api/resume/photo/resume_x.jpg")).toBe(false);
  });
});

describe("font values", () => {
  it("accepts curated and google fonts only", () => {
    expect(isValidFontValue("carlito")).toBe(true);
    expect(isValidFontValue("google:Open Sans")).toBe(true);
    expect(isValidFontValue("google:../etc")).toBe(false);
    expect(isValidFontValue("arial")).toBe(false);
    expect(isValidFontValue(5)).toBe(false);
  });
});
