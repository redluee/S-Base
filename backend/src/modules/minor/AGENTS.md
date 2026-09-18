# Backend Minor Module Guide

This guide enables AI models to navigate and understand the Minor module without loading the full 1800+ lines of code every time.

## Overview & Permissions
- **Module key**: `minor`
- **Auth middleware**: `createAuthPlugin("minor")` in `backend/src/index.ts`
- **Service instance**: `MinorService` instantiated at startup in `backend/src/index.ts`
- **Routes group**: `.group("/api/minor", ...)` located in `backend/src/index.ts` lines ~670-806
- **Test file**: `backend/src/modules/minor/minor.test.ts` (run with `DB_PATH=:memory: bun test backend/src/modules/minor/minor.test.ts`)

---

## Database Schema (`backend/src/db/schema/minor.ts`)
| Table Name | Primary Key | Key Foreign Keys / Fields | Purpose |
|------------|-------------|---------------------------|---------|
| `minor_sprints` | `id` | `userId`, `sprintNumber`, `name`, `startDate`, `endDate`, `durationDays`, `showAndGrowDate`, `extendedDays`, `extensionReason`, `status` (`planned`/`active`/`completed`) | Sprint metadata and automatic date/vacation calculation |
| `minor_stories` | `id` | `sprintId` (nullable, `set null`), `userId`, `storyTypeCode`, `storyNumber`, `title`, `asA`, `iWant`, `soThat`, `learningOutcomes` (JSON int array `[1..5]`), `status` (`todo`/`in_progress`/`done`), `orderIndex`, `presentationData` (JSON string) | Stories in sprints or backlog |
| `minor_story_criteria` | `id` | `storyId` (cascade), `type` (`acceptance`/`quality`), `orderIndex`, `indent` (0 or 1), `text`, `isCompleted` (boolean) | Checklist criteria for a story |
| `minor_story_evidence` | `id` | `storyId` (cascade), `type` (`link`/`github`/`document`/`app`), `title`, `url` | Evidence items attached to a story |
| `minor_self_evaluations` | `id` | `sprintId` (cascade), `learningOutcome` (1..5), `level` (`V`/`NV`/`-`), `argumentation` | Self-evaluations per LU per sprint |
| `minor_teacher_assessments` | `id` | `sprintId` (cascade), `learningOutcome` (1..5), `assessment` (`V`/`O`/`-`), `notes`, `evaluatedAt` | Teacher assessments per LU per sprint |
| `minor_feedback_entries` | `id` | `sprintId` (cascade), `date`, `fromWhom`, `feedback`, `action`, `orderIndex` | Feedback & action items per sprint |
| `minor_reflections` | `id` | `sprintId` (cascade), `date`, `whatLearned`, `whatRetained`, `whatChange` | Sprint retro reflection |
| `minor_vacations` | `id` | `userId`, `name`, `startDate`, `endDate` | Vacation intervals that extend sprints |
| `minor_story_types` | `id` | `userId`, `code`, `name`, `description`, `color`, `isDefault`, `defaultQualityCriteria` (JSON) | Story type templates (defaults: US, RS, LS) |
| `minor_peer_help` | `id` | `userId`, `sprintId` (nullable), `date`, `peerName`, `description`, `links` | Knowledge sharing / peer assistance logs |

---

## Service Methods (`MinorService` in `backend/src/modules/minor/index.ts`)
| Domain | Method Name | Description |
|--------|-------------|-------------|
| **Vacations** | `listVacations(userId)` | Returns all user vacations ordered by start date |
| | `createVacation(userId, data)` | Inserts a new vacation period |
| | `updateVacation(id, userId, data)` | Updates existing vacation |
| | `deleteVacation(id, userId)` | Deletes vacation |
| | `calculateSprintDates(userId, startDateStr, durationDays)` | Calculates end date, Show & Grow Wednesday, and extends for vacation overlaps |
| **Story Types** | `listStoryTypes(userId)` | Combines virtual defaults (US, RS, LS) with user overrides and custom types |
| | `createStoryType(userId, data)` | Adds custom story type with default quality criteria |
| | `updateStoryType(id, userId, data)` | Overrides default or updates custom type |
| | `deleteStoryType(id, userId)` | Deletes custom story type |
| **Sprints** | `getNextSprintNumber(userId)` | Suggests next sequential sprint number and name |
| | `listSprints(userId)` | Returns all sprints and dynamically updates their status |
| | `getSprintById(id, userId)` | Returns full sprint with stories, criteria, evidence, evals, assessments, feedback, reflection |
| | `createSprint(userId, data)` | Creates sprint, auto-computes dates/extensions, initialises evals/assessments/reflection |
| | `updateSprint(id, userId, data)` | Updates sprint details and recalculates status/dates if requested |
| | `deleteSprint(id, userId)` | Deletes sprint |
| | `exportSprint(sprintId, userId)` | Produces clean `MinorSprintExportData` export object |
| | `importSprint(userId, rawData, targetSprintId?, overwrite?)` | Imports or replaces a sprint from JSON |
| **Stories & Criteria** | `listAllStories(userId)` | Returns all user stories with sprint numbers and nested criteria/evidence |
| | `createStory(userId, sprintId?, data)` | Creates story with acceptanceCriteria, qualityCriteria, evidence, presentationData |
| | `updateStory(storyId, userId, data)` | Updates story fields and replaces criteria/evidence arrays if provided |
| | `deleteStory(storyId, userId)` | Deletes story and cascades criteria/evidence |
| | `reorderStories(sprintId, userId, storyIds)` | Updates orderIndex in batch transaction |
| | `toggleCriterion(criterionId, isCompleted)` | Toggles single criterion checkbox |
| **Evaluations & Assessments** | `autoGenerateSelfEvaluations(sprintId, userId)` | Pre-fills argumentation text based on completed stories and evidence per LU |
| | `saveSelfEvaluations(sprintId, userId, items)` | Persists self-evaluations array |
| | `saveTeacherAssessments(sprintId, userId, items)` | Persists teacher assessments array |
| **Feedback & Reflection** | `listFeedback(sprintId)` | Returns feedback entries ordered by index |
| | `addFeedback(sprintId, data)` | Adds feedback row |
| | `updateFeedback(id, data)` | Updates feedback row |
| | `deleteFeedback(id)` | Deletes feedback row |
| | `getReflection(sprintId)` | Gets sprint reflection record |
| | `saveReflection(sprintId, data)` | Inserts or updates reflection answers |
| **Peer Help** | `listPeerHelp(userId)` | Lists peer help records |
| | `createPeerHelp(userId, data)` | Adds peer help entry |
| | `updatePeerHelp(id, userId, data)` | Updates peer help entry |
| | `deletePeerHelp(id, userId)` | Deletes peer help entry |
| **Dashboard** | `getDashboardStats(userId)` | Computes active sprint, days to Show & Grow, official passes, projected passes, and LU warnings |

---

## API Endpoints (`/api/minor/*` in `backend/src/index.ts`)
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
