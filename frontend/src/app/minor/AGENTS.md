# Frontend Minor Module Guide

This guide gives AI models an instant index of the Minor module frontend structure, routes, components, and libraries without needing to load large client bundle files.

## Route Map (`frontend/src/app/minor/`)
| Path | Page File | Client Component | Main Responsibility |
|------|-----------|------------------|---------------------|
| `/minor` | `page.tsx` | `client.tsx` | Dashboard: Active sprint card, days until Show & Grow, official vs projected LU passes progress bar, warnings, quick peer-help & sprint modals |
| `/minor/sprints` | `sprints/page.tsx` | `sprints/client.tsx` | Sprint overview: status filter tabs, sprint card list, create/edit sprint modal, import/export sprint modal |
| `/minor/sprints/[id]` | `sprints/[id]/page.tsx` | `sprints/[id]/client.tsx` | Detailed sprint manager: Tabs for Planning (stories, dual criteria, evidence), Feedback rows, Self-evaluations, and Reflection |
| `/minor/sprints/[id]/present` | `sprints/[id]/present/page.tsx` | `sprints/[id]/present/client.tsx` | Full-screen interactive Show & Grow slide deck for presenting sprint deliverables to teachers/peers |
| `/minor/stories` | `stories/page.tsx` | `stories/client.tsx` | Global story board/backlog: Multi-facet filters (sprint, type, status, LU), group by sprint, story creation/editing |
| `/minor/peer-help` | `peer-help/page.tsx` | `peer-help/client.tsx` | Knowledge sharing / peer help log: List and CRUD modal for peer interactions |
| `/minor/settings` | `settings/page.tsx` | `settings/client.tsx` | Configuration: Vacations management (auto-extension engine), custom story types & default DoD criteria |
| `/minor/export` | `export/page.tsx` | `export/client.tsx` | Multi-sprint bulk export page: PDF portfolio, Excel matrix, JSON bundle |

---

## Module-local code (`frontend/src/app/minor/`)
| File | Role & Features |
|------|-----------------|
| `subnav.tsx` | Persistent subnavigation bar across all `/minor/*` pages |
| `theme.tsx` / `theme-cookie.ts` | Light/dark theme provider + toggle; cookie name and `MinorTheme` type shared with `layout.tsx` |
| `story-type-badge.tsx` | Standardized badge component displaying story type code (e.g. US, RS, LS) and colors |
| `sprints/sprint-import-modal.tsx` | Modal dialog for parsing, validating, and importing sprint JSON files |
| `learning-outcomes.ts` | The one LU table (short name, Excel label, full name, target), required total, sprint numbers |
| `constants.ts` | URL/image helpers |
| `export-files.ts` | Logboek PDF/Excel download, filenames, sprint JSON via the backend exporter |
| `export-validation.ts` | Pre-export checks shared by PDF and Excel |
| `story-view-modal.tsx` / `peer-help-modal.tsx` | Shared story detail and peer-help modals |
| `pdf/` | `@react-pdf/renderer` PDF generator: `portfolio-pdf.tsx` (entry, single-sprint and all-sprints), `dashboard-page.tsx`, `sprint-page.tsx`, `styles.ts` |
| `excel/` | ExcelJS workbook generator: `workbook.ts` (entry + test `workbook.test.ts`), `dashboard.ts`, `logboek.ts`, `lu.ts`, `styles.ts` |
| `presentation/` | Presentation deck system: |
| ├── `sprint-presentation.tsx` | Main slide deck engine: keyboard controls (`←`, `→`, `F`), slide thumbnails, progress bar |
| ├── `slide-intro.tsx` | Title slide: sprint number, date span, days, team/author |
| ├── `slide-story.tsx` | Story slide: story narrative (Als/wil ik/zodat), criteria checklist, evidence showcase, screenshots |
| ├── `slide-outro.tsx` | Summary slide: self-evaluations, reflection takeaways, feedback |
| ├── `presentation-story-editor.tsx` | In-presentation editor allowing live edits to slide content, screenshots, notes |
| ├── `presentation-criteria-modal.tsx` | Pop-up checklist modal during presentation |
| ├── `presentation-lightbox.tsx` | Fullscreen screenshot/image preview modal |
| └── `presentation-background.tsx` | Configurable visual themes/background styles for presentation slides |

Shared (stay in `lib/`): `lib/api/minor.ts` (client API, all requests via `lib/api/core.ts` helpers) and `lib/minor-lang.ts` (Dutch strings). PDF/Excel export wording is document content and is deliberately not translated.

---

## Client API & Utilities
- **Client API (`api.minor.*` in `@/lib/api.ts`)**:
  - `api.minor.dashboard()`
  - `api.minor.sprints.{list, get, nextNumber, calculateDates, create, update, delete, exportJson, import, autoSelfEvaluations, saveSelfEvaluations, saveTeacherAssessments, getReflection, saveReflection}`
  - `api.minor.sprints.feedback.{list, create, update, delete}`
  - `api.minor.stories.{list, create, importJson, update, delete, reorder, toggleCriterion}`
  - `api.minor.vacations.{list, create, update, delete}`
  - `api.minor.storyTypes.{list, create, update, delete}`
  - `api.minor.peerHelp.{list, create, update, delete}`
- **Server API (`serverApi.minor.*` in `@/lib/server-api.ts`)**:
  - Used in SSR Next.js App Router `page.tsx` loaders for initial pre-rendering.
- **Rules (`@backend/shared/minor`)**: learning outcome ids, sprint dates/status, local `today()`, the pass rule (`isProjectedPass`, `learningOutcomeLevel`) and the argumentation draft. Do not re-implement them here.
- **Learning outcomes (`./learning-outcomes.ts`)**: `LEARNING_OUTCOME_INFO`, `learningOutcomeShort(lu)`, `TOTAL_REQUIRED_PASSES`, `SPRINT_NUMBERS`.
- **Excel Export (`./excel/workbook.ts` / `excel/workbook.test.ts`)**:
  - Generates multi-tab Excel files via ExcelJS containing story backlog, criteria checklist, and LU matrix.
  - Layout mirrors the teacher template (`Dashboard`, `Logboek` with 8 blocks of 28 rows, hidden `Lijsten`). Teachers convert the xlsx to PDF via Canvas: a manual page break follows every sprint block and the Logboek print scale is estimated from the tallest block (row heights are set explicitly) so each sprint stays on exactly one page. Keep sheet/row layout identical to the template.
- **JSON Export/Import**: the backend owns both (`GET /sprints/:id/export`, `POST /sprints/import`, `POST /sprints/:id/stories/import`); `export-files.ts` only downloads/copies the result.

---

## When implementing features: Cheat Sheet
1. **Adding a story field**:
   - Update database schema: `backend/src/db/schema/minor.ts`
   - Update shared type: `backend/src/types/shared.ts` (`MinorStory`, `MinorSprintExportStory`)
   - Update backend service: `backend/src/modules/minor/` (`minor-*.ts` layers) (`stories.create`, `stories.update`, `sprints.getById`, `transfer.exportSprint`, `transfer.importSprint`)
   - Update UI modal & forms: `frontend/src/app/minor/sprints/[id]/` (client plus extracted modals, tabs and `use-*.ts` hooks) and `frontend/src/app/minor/stories/`
   - If included in presentation: `frontend/src/app/minor/presentation/`
2. **Changing Sprint calculation / dates**:
   - Check `schedule.calculateSprintDates` and `calculateSprintStatus` in `backend/src/modules/minor/` (`minor-*.ts` layers)
   - Test with `DB_PATH=:memory: bun test backend/src/modules/minor`
3. **Updating Export (PDF / Excel / JSON)**:
   - PDF: `frontend/src/app/minor/pdf/portfolio-pdf.tsx`
   - Excel: `frontend/src/app/minor/excel/workbook.ts` (test: `bun test frontend/src/app/minor/excel/workbook.test.ts`)
   - JSON: `backend/src/modules/minor/minor-transfer.ts` / `minor-import-parse.ts`

## Errors
Backend errors are i18n keys (`minor.*`, see `lib/minor-lang.ts`). Show them with `apiErrorMessage(err, fallbackKey)`; server pages wrap `sprints.get` in `notFoundOn404()`.
