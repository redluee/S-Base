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

## Key Components (`frontend/src/components/`)
| Component File | Role & Features |
|----------------|-----------------|
| `subnav.tsx` (in `app/minor/`) | Persistent subnavigation bar across all `/minor/*` pages |
| `minor-story-type-badge.tsx` | Standardized badge component displaying story type code (e.g. US, RS, LS) and colors |
| `minor-sprint-import-modal.tsx` | Modal dialog for parsing, validating, and importing sprint JSON files |
| `minor-pdf.tsx` | `@react-pdf/renderer` PDF generator for single-sprint and all-sprints portfolio documents |
| `minor-presentation/` | Presentation deck system: |
| ├── `sprint-presentation.tsx` | Main slide deck engine: keyboard controls (`←`, `→`, `F`), slide thumbnails, progress bar |
| ├── `slide-intro.tsx` | Title slide: sprint number, date span, days, team/author |
| ├── `slide-story.tsx` | Story slide: story narrative (Als/wil ik/zodat), criteria checklist, evidence showcase, screenshots |
| ├── `slide-outro.tsx` | Summary slide: self-evaluations, reflection takeaways, feedback |
| ├── `presentation-story-editor.tsx` | In-presentation editor allowing live edits to slide content, screenshots, notes |
| ├── `presentation-criteria-modal.tsx` | Pop-up checklist modal during presentation |
| ├── `presentation-lightbox.tsx` | Fullscreen screenshot/image preview modal |
| └── `presentation-background.tsx` | Configurable visual themes/background styles for presentation slides |

---

## Client API & Utilities
- **Client API (`api.minor.*` in `@/lib/api.ts`)**:
  - `api.minor.dashboard()`
  - `api.minor.sprints.{list, get, nextNumber, calculateDates, create, update, delete, exportJson, import, autoSelfEvaluations, saveSelfEvaluations, saveTeacherAssessments, getReflection, saveReflection}`
  - `api.minor.sprints.feedback.{list, create, update, delete}`
  - `api.minor.sprints.stories.{listAll, reorder, create, update, delete}`
  - `api.minor.vacations.{list, create, update, delete}`
  - `api.minor.storyTypes.{list, create, update, delete}`
  - `api.minor.peerHelp.{list, create, update, delete}`
- **Server API (`serverApi.minor.*` in `@/lib/server-api.ts`)**:
  - Used in SSR Next.js App Router `page.tsx` loaders for initial pre-rendering.
- **Constants (`@/lib/minor-constants.ts`)**:
  - `MINOR_LU_DESCRIPTIONS`: Learning outcomes mapping (1: Impact, 2: Realisatie, 3: Ethiek, 4: Tools, 5: Zelfstandig).
  - `getLULabel(lu)`, `getLUShortDesc(lu)`, `isImageUrl(url)`, `getDomainFromUrl(url)`.
- **Excel Export (`@/lib/minor-excel.ts` / `minor-excel.test.ts`)**:
  - Generates multi-tab Excel files via ExcelJS containing story backlog, criteria checklist, and LU matrix.
- **JSON Export/Import (`@/lib/minor-sprint-export.ts`)**:
  - Normalizes sprint objects into clean, portable JSON format.

---

## When implementing features: Cheat Sheet
1. **Adding a story field**:
   - Update database schema: `backend/src/db/schema/minor.ts`
   - Update shared type: `backend/src/types/shared.ts` (`MinorStory`, `MinorSprintExportStory`)
   - Update backend service: `backend/src/modules/minor/index.ts` (`createStory`, `updateStory`, `getSprintById`, `exportSprint`, `importSprint`)
   - Update UI modal & forms: `frontend/src/app/minor/sprints/[id]/client.tsx` and `frontend/src/app/minor/stories/client.tsx`
   - If included in presentation: `frontend/src/components/minor-presentation/`
2. **Changing Sprint calculation / dates**:
   - Check `calculateSprintDates` and `calculateSprintStatus` in `backend/src/modules/minor/index.ts`
   - Test with `DB_PATH=:memory: bun test backend/src/modules/minor/minor.test.ts`
3. **Updating Export (PDF / Excel / JSON)**:
   - PDF: `frontend/src/components/minor-pdf.tsx`
   - Excel: `frontend/src/lib/minor-excel.ts` (test: `bun test frontend/src/lib/minor-excel.test.ts`)
   - JSON: `frontend/src/lib/minor-sprint-export.ts` and `backend/src/modules/minor/index.ts` (`exportSprint`/`importSprint`)
