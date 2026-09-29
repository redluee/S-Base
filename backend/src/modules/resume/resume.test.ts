import { describe, expect, it, beforeEach } from "bun:test";
import { setupTestDb } from "../../test-utils";
import { ResumeService } from "./index";
import { isValidFontValue } from "./fonts";

const exp = (over: any = {}) => ({
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
    for (const uid of [adminId, testerId]) {
      for (const r of svc.listResumes(uid)) svc.deleteResume(r.id, uid);
      for (const e of svc.listExperiences(uid)) svc.deleteExperience(e.id, uid);
      for (const e of svc.listEducations(uid)) svc.deleteEducation(e.id, uid);
    }
  });

  it("returns an empty profile and upserts per user", () => {
    expect(svc.getProfile(adminId).fullName).toBe("");
    svc.upsertProfile(adminId, { fullName: "  Jane Doe ", skills: ["A", " ", "B"], photoShape: "square" });
    const p = svc.getProfile(adminId);
    expect(p.fullName).toBe("Jane Doe");
    expect(p.skills).toEqual(["A", "B"]);
    expect(p.photoShape).toBe("square");
    expect(svc.getProfile(testerId).fullName).toBe("");
  });

  it("validates experience dates", () => {
    expect(() => svc.createExperience(adminId, exp({ startMonth: 13 }))).toThrow();
    expect(() => svc.createExperience(adminId, exp({ endYear: 2020 }))).toThrow();
    expect(() => svc.createExperience(adminId, exp({ endMonth: null, endYear: null }))).toThrow();
    expect(() => svc.createExperience(adminId, exp({ company: "" }))).toThrow();
    const cur = svc.createExperience(adminId, exp({ isCurrent: true, endMonth: 3, endYear: 2030 }));
    expect(cur.isCurrent).toBe(true);
    expect(cur.endMonth).toBeNull();
    expect(cur.endYear).toBeNull();
  });

  it("sorts by start date, newest first", () => {
    const a = svc.createExperience(adminId, exp({ jobTitle: "Old", startMonth: 1, startYear: 2019, endYear: 2025 }));
    const b = svc.createExperience(adminId, exp({ jobTitle: "New", startMonth: 6, startYear: 2023, endYear: 2024 }));
    const c = svc.createExperience(adminId, exp({ jobTitle: "Mid", startMonth: 3, startYear: 2021, isCurrent: true }));
    expect(svc.listExperiences(adminId).map((e) => e.id)).toEqual([b.id, c.id, a.id]);
  });

  it("selects all items newest start first when creating a resume", () => {
    const old = svc.createEducation(adminId, { institution: "A", degree: "Old", startMonth: 9, startYear: 2010, endMonth: 6, endYear: 2014 });
    const recent = svc.createEducation(adminId, { institution: "B", degree: "Recent", startMonth: 9, startYear: 2018, endMonth: 6, endYear: 2020 });
    const r = svc.createResume(adminId, { name: "CV", selectAll: true });
    expect(svc.getResumeFull(r.id, adminId)!.selected.map((s) => s.refId)).toEqual([recent.id, old.id]);
  });

  it("isolates data between users", () => {
    const e = svc.createExperience(adminId, exp());
    expect(svc.listExperiences(testerId)).toHaveLength(0);
    expect(svc.updateExperience(e.id, testerId, { company: "X" })).toBeNull();
    expect(svc.deleteExperience(e.id, testerId)).toBe(false);
    const r = svc.createResume(adminId, { name: "CV" });
    expect(svc.getResumeFull(r.id, testerId)).toBeNull();
    expect(svc.updateResume(r.id, testerId, { name: "Hack" })).toBeNull();
    expect(svc.deleteResume(r.id, testerId)).toBe(false);
    expect(svc.duplicateResume(r.id, testerId)).toBeNull();
    expect(svc.setResumeItems(r.id, testerId, [])).toBeNull();
  });

  it("rejects items owned by another user", () => {
    const foreign = svc.createExperience(testerId, exp());
    const r = svc.createResume(adminId, { name: "CV" });
    expect(() => svc.setResumeItems(r.id, adminId, [{ kind: "experience", refId: foreign.id }])).toThrow();
  });

  it("builds a resume with selected items, order and description override", () => {
    const e1 = svc.createExperience(adminId, exp({ jobTitle: "One", description: "orig" }));
    const e2 = svc.createExperience(adminId, exp({ jobTitle: "Two" }));
    svc.createExperience(adminId, exp({ jobTitle: "Unselected" }));
    const edu = svc.createEducation(adminId, { institution: "School", degree: "BSc", startMonth: 9, startYear: 2020, isCurrent: true });
    const r = svc.createResume(adminId, { name: "CV" });
    svc.setResumeItems(r.id, adminId, [
      { kind: "experience", refId: e2.id },
      { kind: "experience", refId: e1.id, descriptionOverride: "short" },
      { kind: "education", refId: edu.id },
    ]);
    const full = svc.getResumeFull(r.id, adminId)!;
    expect(full.experiences.map((e) => e.title)).toEqual(["Two", "One"]);
    expect(full.experiences[1].description).toBe("short");
    expect(full.experiences[1].hasDescriptionOverride).toBe(true);
    expect(full.educations[0].title).toBe("BSc");
    expect(full.educations[0].isCurrent).toBe(true);
  });

  it("removes deleted library items from resumes", () => {
    const e1 = svc.createExperience(adminId, exp());
    const r = svc.createResume(adminId, { name: "CV" });
    svc.setResumeItems(r.id, adminId, [{ kind: "experience", refId: e1.id }]);
    svc.deleteExperience(e1.id, adminId);
    expect(svc.getResumeFull(r.id, adminId)!.experiences).toHaveLength(0);
  });

  it("validates resume settings", () => {
    expect(() => svc.createResume(adminId, { name: "" })).toThrow();
    expect(() => svc.createResume(adminId, { name: "x", leftWidthPct: 72 })).toThrow();
    expect(() => svc.createResume(adminId, { name: "x", leftWidthPct: 85 })).toThrow();
    expect(() => svc.createResume(adminId, { name: "x", accentColor: "blue" })).toThrow();
    expect(() => svc.createResume(adminId, { name: "x", titleFont: "comic-sans" })).toThrow();
    const r = svc.createResume(adminId, { name: "x", leftWidthPct: 65, textFont: "google:Open Sans" });
    expect(r.leftWidthPct).toBe(65);
    expect(r.textFont).toBe("google:Open Sans");
  });

  it("duplicates a resume with its items", () => {
    const e1 = svc.createExperience(adminId, exp());
    const r = svc.createResume(adminId, { name: "CV" });
    svc.setResumeItems(r.id, adminId, [{ kind: "experience", refId: e1.id }]);
    const copy = svc.duplicateResume(r.id, adminId)!;
    expect(copy.id).not.toBe(r.id);
    expect(svc.getResumeFull(copy.id, adminId)!.experiences).toHaveLength(1);
    svc.deleteResume(r.id, adminId);
    expect(svc.getResumeFull(copy.id, adminId)!.experiences).toHaveLength(1);
  });

  it("tracks photo ownership", () => {
    svc.setPhoto(adminId, "/api/resume/photo/resume_x.jpg");
    expect(svc.ownsPhoto(adminId, "/api/resume/photo/resume_x.jpg")).toBe(true);
    expect(svc.ownsPhoto(testerId, "/api/resume/photo/resume_x.jpg")).toBe(false);
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
