# Resume (CV Builder) Module Guide

## Overview & Permissions
- Module key `resume` (`createAuthPlugin("resume")`), service `ResumeService` in `index.ts`, routes in `backend/src/index.ts` under `/api/resume`.
- Everything is per user: every service method takes `userId` and scopes queries on it.
- Tests: `DB_PATH=:memory: bun test src/modules/resume`.

## Database Schema (`db/schema/resume.ts`, migration `0032_create_resume.sql`)
| Table | Purpose |
|-------|---------|
| `resume_profiles` | One row per user: name, headline, photo (+ `photo_shape`), persoonsgegevens, links as JSON text, `sections` (migration `0038`, JSON array of `{id, title, items}`, max 5, replaces the old fixed skills/languages/hobbies columns which are kept only as a one-time read fallback for rows created before the migration) |
| `resume_experiences` | Ervaring library (company, place, job title, start/end month+year, `is_current`, description, `logo_path` unused so far) |
| `resume_educations` | Opleiding library (institution, place, degree, same period columns) |
| `resumes` | Named resumes: `title_font`, `text_font`, `accent_color`, `left_width_pct`, `title_scale_pct`, `text_scale_pct` (migration `0033`), `swap_columns` (boolean, migration `0034`, puts the profile column on the left) |
| `resume_items` | Selection per resume: `kind` (`experience`/`education`), `ref_id`, `sort_order`, `description_override` |

## API Endpoints
- `GET/PUT /profile`, `POST/DELETE /profile/photo`, `GET /photo/:filename` (owner only)
- `/experiences`, `/educations`: GET, POST, PUT `/:id`, DELETE `/:id`
- `/resumes`: GET, POST, GET/PUT/DELETE `/:id`, POST `/:id/duplicate`, PUT `/:id/items`
- `GET /fonts/google?family=` downloads and caches a Google Font as TTF, `GET /fonts/file/:name` serves it

## Key Business Rules
- `is_current` clears the end date (shown as HEDEN). End must not be before start. Libraries (and new resumes with all items selected) sort by start date, newest first.
- `left_width_pct` (width of the main column), `title_scale_pct`, `text_scale_pct` (migration `0033`) must be a multiple of 5 between 50 and 80. Fonts are a curated id (`fonts.ts` `CURATED_FONTS`, mirrored in `frontend/src/lib/resume.ts`) or `google:<Family>`.
- Profile `sections` are user-defined (any title, up to `RESUME_SECTIONS_MAX` = 5), rendered on the PDF in order, skipping empty ones. `upsertProfile` sanitizes via `cleanSections` (trims/truncates titles, drops blank items, caps at 5, assigns an id if missing).
- `setResumeItems` rejects items not owned by the user. Deleting a library item removes it from all resumes.
- Photos are stored in `backend/uploads` as `resume_<uuid>.<ext>` and only served to their owner. Replacing/removing deletes the old file. Google font files live in `backend/uploads/fonts`.
- Dev seed with placeholder data: `bun run db:seed:resume [username]` (additive, skips users that already have resume data).
