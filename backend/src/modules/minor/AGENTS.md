# Backend Minor Module Guide

This guide enables AI models to navigate and understand the Minor module without loading the full 1800+ lines of code every time.

## Overview & Permissions

- **Module key**: `minor`
- **Auth middleware**: `createAuthPlugin("minor")` in `backend/src/context.ts`
- **Service instance**: `MinorService` instantiated at startup in `backend/src/context.ts`
- **Routes group**: `.group("/api/minor", ...)` located in `backend/src/routes/minor.ts`
- **Tests**: `backend/src/modules/minor/minor-*.test.ts` per topic, `backend/src/routes/minor.test.ts` for the error contract (run with `DB_PATH=:memory: bun test backend/src/modules/minor backend/src/routes/minor.test.ts`)

---

## Database Schema (`backend/src/db/schema/minor.ts`)

| Table Name                  | Primary Key | Key Foreign Keys / Fields                                                                                                                                                                                                                            | Purpose                                                 |
| --------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `minor_sprints`             | `id`        | `userId`, `sprintNumber`, `name`, `startDate`, `endDate`, `durationDays`, `showAndGrowDate`, `extendedDays`, `extensionReason`, `status` (`planned`/`active`/`completed`)                                                                            | Sprint metadata and automatic date/vacation calculation |
| `minor_stories`             | `id`        | `sprintId` (nullable, `set null`), `userId`, `storyTypeCode`, `storyNumber`, `title`, `asA`, `iWant`, `soThat`, `learningOutcomes` (JSON int array `[1..5]`), `status` (`todo`/`in_progress`/`done`), `orderIndex`, `presentationData` (JSON string) | Stories in sprints or backlog                           |
| `minor_story_criteria`      | `id`        | `storyId` (cascade), `type` (`acceptance`/`quality`), `orderIndex`, `indent` (0 or 1), `text`, `isCompleted` (boolean)                                                                                                                               | Checklist criteria for a story                          |
| `minor_story_evidence`      | `id`        | `storyId` (cascade), `type` (`link`/`github`/`document`/`app`), `title`, `url`                                                                                                                                                                       | Evidence items attached to a story                      |
| `minor_self_evaluations`    | `id`        | `sprintId` (cascade), `learningOutcome` (1..5), `level` (`V`/`NV`/`-`), `argumentation`                                                                                                                                                              | Self-evaluations per LU per sprint                      |
| `minor_teacher_assessments` | `id`        | `sprintId` (cascade), `learningOutcome` (1..5), `assessment` (`V`/`O`/`-`), `notes`, `evaluatedAt`                                                                                                                                                   | Teacher assessments per LU per sprint                   |
| `minor_feedback_entries`    | `id`        | `sprintId` (cascade), `date`, `fromWhom`, `feedback`, `action`, `orderIndex`                                                                                                                                                                         | Feedback & action items per sprint                      |
| `minor_reflections`         | `id`        | `sprintId` (cascade), `date`, `whatLearned`, `whatRetained`, `whatChange`                                                                                                                                                                            | Sprint retro reflection                                 |
| `minor_vacations`           | `id`        | `userId`, `name`, `startDate`, `endDate`                                                                                                                                                                                                             | Vacation intervals that extend sprints                  |
| `minor_story_types`         | `id`        | `userId`, `code`, `name`, `description`, `color`, `isDefault`, `defaultQualityCriteria` (JSON)                                                                                                                                                       | Story type templates (defaults: US, RS, LS)             |
| `minor_peer_help`           | `id`        | `userId`, `sprintId` (nullable), `date`, `peerName`, `description`, `links`                                                                                                                                                                          | Knowledge sharing / peer assistance logs                |

---

## Service Methods (`MinorService` in `index.ts` composes topic classes as readonly properties; the file per topic is `minor-<topic>.ts`)

Missing records throw `NotFoundError` (`minor.<x>NotFound`), bad input `ValidationError`; schemas for every route live in `minor-schemas.ts`. `MinorService` also keeps flat delegates (`listSprints`, `getSprintById`, `createSprint`, `createStory`, `addFeedback`, `saveSelfEvaluations`, `listPeerHelp`, `createPeerHelp`, `listVacations`) only because `public-snapshot.ts` and its tests call them.

| Property (file)                                                      | Methods                                                                                                                                                                                 |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schedule` (`minor-schedule.ts`)                                     | `listVacations`, `createVacation`, `updateVacation`, `removeVacation`, `calculateSprintDates(userId, startDate?, durationDays?)` (extends for vacation overlaps, Show & Grow Wednesday) |
| `storyTypes` (`minor-story-types.ts`)                                | `list` (virtual defaults US/RS/LS + overrides + custom), `create`, `update` (overrides a default or edits custom), `remove`                                                             |
| `sprints` (`minor-sprints.ts`)                                       | `getNextNumber`, `list` (refreshes status), `getById` (full sprint), `create`, `update`, `remove`, `requireOwned`                                                                       |
| `stories` (`minor-stories.ts`, mapping in `minor-story-mapper.ts`)   | `listAll`, `create`, `update`, `remove`, `reorder`, `toggleCriterion`                                                                                                                   |
| `evaluations` (`minor-evaluations.ts`)                               | `initDefaults`, `markLearningOutcomesSufficient`, `saveSelfEvaluations`, `saveTeacherAssessments`                                                                                       |
| `drafts` (`minor-evaluation-drafts.ts`)                              | `autoGenerate(sprintId, userId)` pre-fills argumentation from stories and evidence                                                                                                      |
| `feedback` (`minor-feedback.ts`)                                     | `list`, `add`, `update`, `remove`, `getReflection`, `saveReflection`                                                                                                                    |
| `peerHelp` (`minor-peer-help.ts`)                                    | `list`, `create`, `update`, `remove`                                                                                                                                                    |
| `settings` (`minor-settings.ts`)                                     | `get`, `save`                                                                                                                                                                           |
| `dashboard` (`minor-dashboard.ts`)                                   | `getStats(userId)` active sprint, days to Show & Grow, official/projected passes, LU warnings                                                                                           |
| `transfer` (`minor-transfer.ts`, parsing in `minor-import-parse.ts`) | `exportSprint`, `importSprint(userId, rawData, targetSprintId?, overwrite?)`                                                                                                            |

---

## API Endpoints (`/api/minor/*` in `backend/src/routes/minor.ts`; method names are the topic methods above, e.g. `getSprintById` = `sprints.getById`)

- `GET /dashboard`: `getDashboardStats`
- `GET /sprints`: `listSprints`
- `GET /sprints/next-number`: `getNextSprintNumber`
- `GET /sprints/calculate-dates`: `calculateSprintDates` (query: `startDate`, `durationDays`)
- `POST /sprints`: `createSprint`
- `POST /sprints/import`: `importSprint`
- `GET /sprints/:id`: `getSprintById`
- `PUT /sprints/:id`: `updateSprint`
- `DELETE /sprints/:id`: `deleteSprint`
- `GET /sprints/:id/export`: `exportSprint`
- `POST /sprints/:id/import`: `importSprint` with target ID
- `GET /stories`: `listAllStories`
- `POST /stories`: `createStory` (backlog / sprintId optional)
- `POST /sprints/:id/stories`: `createStory` for sprint
- `PUT /stories/:id`: `updateStory`
- `DELETE /stories/:id`: `deleteStory`
- `PUT /sprints/:id/stories/reorder`: `reorderStories`
- `PATCH /criteria/:id/toggle`: `toggleCriterion`
- `POST /sprints/:id/self-evaluations/auto`: `autoGenerateSelfEvaluations`
- `PUT /sprints/:id/self-evaluations`: `saveSelfEvaluations`
- `PUT /sprints/:id/teacher-assessments`: `saveTeacherAssessments`
- `GET /sprints/:id/feedback`: `listFeedback`
- `POST /sprints/:id/feedback`: `addFeedback`
- `PUT /feedback/:id`: `updateFeedback`
- `DELETE /feedback/:id`: `deleteFeedback`
- `GET /sprints/:id/reflection`: `getReflection`
- `PUT /sprints/:id/reflection`: `saveReflection`
- `GET /vacations`, `POST /vacations`, `PUT /vacations/:id`, `DELETE /vacations/:id`
- `GET /story-types`, `POST /story-types`, `PUT /story-types/:id`, `DELETE /story-types/:id`
- `GET /peer-help`, `POST /peer-help`, `PUT /peer-help/:id`, `DELETE /peer-help/:id`
- `POST /upload`: file upload endpoint for evidence files (saves to `backend/uploads/minor_*`)

---

## Key Business Rules & Invariants

1. **Passes & Prognosis**:
   - Official pass (`officialPasses`): Teacher assessment `V` on an LU (at most 1 per sprint per LU). Official passes awarded by the teacher always count regardless of reflection state (reflection completeness is checked during export validation).
   - Prognosis (`projectedPasses`): For finished sprints, only actual teacher `V`s count. For active/planned sprints, stories planned in that sprint project a `V` for each covered LU unless assessed with `O` (at most 1 projected pass per LU per sprint).
2. **Vacations**: Overlapping vacations extend sprint duration automatically and adjust the Show & Grow date (Wednesday in the last week).
3. **Dual Criteria**: Each story has two criteria groups: `acceptance` criteria (story specific) and `quality` criteria (process/DoD related, often pre-filled from story type). Both support 1-level indentation (`indent: 1`).
4. **Presentation Data**: `presentationData` in `minor_stories` stores JSON for Show & Grow slides (custom title, notes, demo URLs, screenshots, bullet points).

---

## Publishing to minor.stevenheijn.nl (snapshot + n8n)

The public one-pager `minor.stevenheijn.nl` (repo `redluee/future-proof-met-ai`, local `~/Development/future-proof-met-ai`, Vercel) is a **read-only view** of a snapshot produced here. S-Base is the only source of truth. Do not change the snapshot format, the routes or the env vars without also updating the n8n workflow (`docs/n8n/minor-publish.workflow.json`) and the site repo (`src/types/snapshot.ts`, bump `version`). Never edit the site repo on its own to add data, auth or a database.

Flow: `evaluations.saveSelfEvaluations` -> `PublishNotifier` POSTs to n8n (`N8N_WEBHOOK_URL`, header `X-Webhook-Secret`) -> n8n GETs `/api/minor/public/snapshot` (Bearer `MINOR_SNAPSHOT_TOKEN`) -> n8n commits `data/minor-snapshot.json` and `public/minor/*` to the site repo -> Vercel rebuilds.

| Piece                                                               | File                                                                                                        |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Snapshot builder (`buildPublicSnapshot`), bearer check, asset rules | `public-snapshot.ts`                                                                                        |
| Webhook notifier (fire-and-forget, 3s timeout, never throws)        | `publish-notifier.ts`                                                                                       |
| Routes (outside `minorAuth`, token only)                            | `GET /api/minor/public/snapshot`, `GET /api/minor/public/assets/:filename` in `backend/src/routes/minor.ts` |
| Tests                                                               | `public-snapshot.test.ts`                                                                                   |

Rules baked into the snapshot:

- A sprint is published once any self-evaluation has `level != "-"` or a non-empty argumentation.
- No ids, no `feedback.fromWhom`, no `peerHelp.peerName`, no presentation `notes`.
- Upload URLs `/api/uploads/minor_*` are rewritten to `/minor/<file>` and listed in `assets[]` (sha256, size, max 5 MB).
- `contentHash` covers everything except `generatedAt`; n8n skips the commit when it is unchanged.
- `drafts.autoGenerate` and `evaluations.saveTeacherAssessments` do not trigger a publish.

Env vars (see `.env.example`): `MINOR_SNAPSHOT_TOKEN`, `MINOR_PUBLISH_USERNAME`, `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET`. Without them the routes answer 503 and the notifier does nothing.
