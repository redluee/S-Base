import { Elysia, t } from "elysia";
import { resume, resumeAuth, saveUpload } from "../context";
import { PHOTO_EXTENSIONS, PHOTO_MAX_BYTES } from "../modules/resume";
import { ensureGoogleFont, resolveFontFile } from "../modules/resume/fonts";
import { NotFoundError } from "../utils/errors";

const idParams = t.Object({ id: t.Numeric() });

const optString = t.Optional(t.String());
const optNullableNumber = t.Optional(t.Nullable(t.Number()));

const periodFields = {
  startMonth: optNullableNumber,
  startYear: optNullableNumber,
  endMonth: optNullableNumber,
  endYear: optNullableNumber,
  isCurrent: t.Optional(t.Boolean()),
};

const experienceFields = {
  place: optString,
  description: optString,
  logoPath: t.Optional(t.Nullable(t.String())),
  ...periodFields,
};

const settingsFields = {
  titleFont: optString,
  textFont: optString,
  accentColor: optString,
  leftWidthPct: t.Optional(t.Number()),
  swapColumns: t.Optional(t.Boolean()),
  titleScalePct: t.Optional(t.Number()),
  textScalePct: t.Optional(t.Number()),
};

const profileBody = t.Object({
  fullName: optString,
  headline: optString,
  photoShape: optString,
  residence: optString,
  phone: optString,
  email: optString,
  birthDate: optString,
  drivingLicense: optString,
  links: t.Optional(t.Array(t.Object({ label: optString, url: optString }))),
  sections: t.Optional(t.Array(t.Object({ id: optString, title: optString, items: t.Optional(t.Array(t.String())) }))),
});

const itemsBody = t.Object({
  items: t.Array(
    t.Object({
      kind: t.String(),
      refId: t.Number(),
      descriptionOverride: t.Optional(t.Nullable(t.String())),
    }),
  ),
});

export const resumeRoutes = new Elysia().group("/api/resume", (app) =>
  app
    .use(resumeAuth)
    .get("/profile", ({ userId }) => resume.profile.get(userId))
    .put("/profile", ({ userId, body }) => resume.profile.upsert(userId, body), { body: profileBody })
    .post(
      "/profile/photo",
      async ({ userId, body }) => {
        const { filename } = await saveUpload(body, "resume_", PHOTO_EXTENSIONS, PHOTO_MAX_BYTES);
        return resume.profile.replacePhoto(userId, filename);
      },
      { body: t.Object({ file: t.File() }) },
    )
    .delete("/profile/photo", ({ userId }) => resume.profile.replacePhoto(userId, null))
    .get(
      "/photo/:filename",
      async ({ params: { filename }, userId }) =>
        new Response(await resume.profile.photoFile(userId, filename), {
          headers: { "Cache-Control": "private, max-age=300" },
        }),
      { params: t.Object({ filename: t.String() }) },
    )
    .get("/experiences", ({ userId }) => resume.library.listExperiences(userId))
    .post("/experiences", ({ userId, body }) => resume.library.createExperience(userId, body), {
      body: t.Object({ company: t.String(), jobTitle: t.String(), ...experienceFields }),
    })
    .put("/experiences/:id", ({ params: { id }, userId, body }) => resume.library.updateExperience(id, userId, body), {
      params: idParams,
      body: t.Object({ company: optString, jobTitle: optString, ...experienceFields }),
    })
    .delete("/experiences/:id", ({ params: { id }, userId }) => resume.library.deleteExperience(id, userId), {
      params: idParams,
    })
    .get("/educations", ({ userId }) => resume.library.listEducations(userId))
    .post("/educations", ({ userId, body }) => resume.library.createEducation(userId, body), {
      body: t.Object({ institution: t.String(), degree: t.String(), ...experienceFields }),
    })
    .put("/educations/:id", ({ params: { id }, userId, body }) => resume.library.updateEducation(id, userId, body), {
      params: idParams,
      body: t.Object({ institution: optString, degree: optString, ...experienceFields }),
    })
    .delete("/educations/:id", ({ params: { id }, userId }) => resume.library.deleteEducation(id, userId), {
      params: idParams,
    })
    .get("/resumes", ({ userId }) => resume.resumes.list(userId))
    .post("/resumes", ({ userId, body }) => resume.resumes.create(userId, body), {
      body: t.Object({ name: t.String(), selectAll: t.Optional(t.Boolean()), ...settingsFields }),
    })
    .get("/resumes/:id", ({ params: { id }, userId }) => resume.resumes.getFull(id, userId), { params: idParams })
    .put("/resumes/:id", ({ params: { id }, userId, body }) => resume.resumes.update(id, userId, body), {
      params: idParams,
      body: t.Object({ name: optString, ...settingsFields }),
    })
    .delete("/resumes/:id", ({ params: { id }, userId }) => resume.resumes.remove(id, userId), { params: idParams })
    .post("/resumes/:id/duplicate", ({ params: { id }, userId }) => resume.resumes.duplicate(id, userId), {
      params: idParams,
    })
    .put("/resumes/:id/items", ({ params: { id }, userId, body }) => resume.resumes.setItems(id, userId, body.items), {
      params: idParams,
      body: itemsBody,
    })
    .get("/fonts/google", ({ query: { family } }) => ensureGoogleFont(family.trim()), {
      query: t.Object({ family: t.String() }),
    })
    .get(
      "/fonts/file/:name",
      async ({ params: { name } }) => {
        const path = resolveFontFile(name);
        const file = path ? Bun.file(path) : null;
        if (!file || !(await file.exists())) throw new NotFoundError("resume.fontNotFound");
        return new Response(file, {
          headers: { "Content-Type": "font/ttf", "Cache-Control": "private, max-age=86400" },
        });
      },
      { params: t.Object({ name: t.String() }) },
    ),
);
