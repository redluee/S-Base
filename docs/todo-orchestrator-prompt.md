You are the orchestrator for building the **Get Shit Done** module (route `/todo`, permission key `todo`) in the S-Base monorepo at the repository root. You plan, delegate, integrate, verify, and decide whether the result is pushed to `main`. You write little feature code yourself: the foundation and the merge/integration fixes only.

## Source of truth

- `docs/todo-spec.md` is the approved spec, including the "Defaults" section. Implement exactly that. When something is truly undefined, choose the option that best fits the spec's principle (clarity over gamification), and list it in your final report. Do not invent extra features.
- Read first: `AGENTS.md` (development rules, error contract, privacy, database preservation, commit rules), `DESIGN.md`, `frontend/AGENTS.md` (Next.js 16 caveats, `node_modules/next/dist/docs/`), the reference module `recipes` (backend + `frontend/src/app/recipes/`), `backend/src/modules/minor/AGENTS.md`, and the cashflow invoice schema/service.
- Reuse instead of rebuilding:
  - `frontend/src/app/workouts/session/swipe-tr.tsx`: swipe-to-delete at a quarter of the row, with haptic.
  - `frontend/src/app/workouts/session/offline-workout.ts`: the offline cache pattern.
  - `saveUpload`/`orNotFound`/typed errors, and `components/module-shell.tsx`.
  - When moving shared logic into `components/` or `lib/`, keep the workout callers working.

## Phase 1: Foundation (you, sequential, on `main` in this checkout)

Lay down everything the parallel slices share, so that they touch disjoint files afterwards:

1. **Schema and migration.** Write the full schema for all tables in `backend/src/db/schema/todo.ts`:
   - categories, including the system "Automatisch" category;
   - projects;
   - tasks, with a fractional `position`, `lastEditedAt`, `completedAt`, and a link to a source module and id;
   - subtasks;
   - a record of hidden linked source items.
   Write one additive migration (`backend/migrations/0052_…`, plus the meta via `db:generate`). Check that the SQL is purely additive before you apply it.
2. **Shared rules.** Put these in `backend/src/shared/todo.ts`: the colour palette, the uncategorised colour, the aging thresholds (30/60 days), the 7-day window before a linked task appears, the days-to-due calculation (Europe/Amsterdam), the title max of 200, and the fractional-index helpers. Include tests.
3. **Permission and registration.** Add the `todo` key to `backend/src/auth/modules.ts`. Add the frontend entry in `frontend/src/lib/modules.ts` (title "Get Shit Done", route `/todo`).
4. **Backend skeleton.** Create `backend/src/modules/todo/index.ts`, composing topic classes: `tasks`, `completion`, `categories`, `subtasks`, `history`, `links`. Each method has its final signature and throws a not-implemented error. Create `backend/src/routes/todo.ts` with every endpoint and its full `t` schemas, and mount it. Put the types in `backend/src/types/todo.ts`. The API contract is fixed after this step; a slice that needs a change asks you.
5. **Frontend skeleton.**
   - `frontend/src/lib/api/todo.ts` implements the full API client.
   - `frontend/src/lib/todo-lang.ts` holds every Dutch string from the spec, spread into `lib/lang.ts`.
   - `frontend/src/app/todo/` gets `page.tsx` and `client.tsx`, plus one hook, `use-todo-store.ts`. All reads and mutations go through this hook (create, edit, reorder, complete, uncomplete, delete, restore). The offline slice later swaps in its transport without UI changes.
   - `client.tsx` renders the header and mounts placeholder components, one file per slice: `task-list.tsx`, `quick-add.tsx`, `task-block.tsx`, `completion/`, `undo-button.tsx`, `history-overlay.tsx`, `manage-sheet.tsx`.
6. **Commit and verify.** Commit (`feat(todo): add module foundation`). Run `bun run test:all`, and do not continue until it passes.

## Phase 2: Vertical slices (parallel)

Launch the slices together in one message, each with `isolation: "worktree"`, so they branch from your foundation commit. Each slice is vertical: backend topic file + its route tests + frontend components + `lib/` tests. Give every agent:

- the spec path;
- its slice section;
- the files it owns, with an instruction to touch nothing outside them;
- the rules: no edits to schema, migrations, routes or the API client without asking you;
- the steps when done: `bun run test:all` in its worktree, and Conventional Commits `type(todo): …` on its branch;
- what to return: its branch name, its commits, and any deviations or open questions.

Model choice: use Opus for slices B and D, where the interaction and animation feel matters most. Use Sonnet for the others unless you judge otherwise.

| Slice | Scope (spec sections) | Owns |
|---|---|---|
| **A. List** | Main screen list, task row (3D blob, indicators, day counter, aging), filter + project chips incl. "Gemarkeerd", long-press reorder with haptic ticks and auto-scroll, empty state, desktop column + `N`/`Esc`; backend `tasks` list/create/edit/reorder | `task-list.tsx`, `task-row.tsx`, `filter-chips.tsx`, `modules/todo/todo-tasks.ts` |
| **B. Capture & categories** | Quick add sheet (instant focus inside the tap handler for iOS, sticky chips, category → project, date chips), manage sheet (categories/projects CRUD, palette, delete → uncategorised, Automatisch rules); backend `categories` | `quick-add.tsx`, `manage-sheet.tsx`, `modules/todo/todo-categories.ts` |
| **C. Task block** | Row → floating card morph with blurred background, autosave, date prominence + chips, flag, subtasks (chain-add, reorder, swipe delete, mini wave), light-markdown notes (rendered / tap for raw); backend `subtasks` | `task-block.tsx`, `subtask-list.tsx`, `notes-field.tsx`, `modules/todo/todo-subtasks.ts` |
| **D. Completion & undo** | Swipe left delete / swipe right complete (quarter threshold, haptic), exact completion choreography and timings, iOS `<input type="checkbox" switch>` haptic + `navigator.vibrate`, reduced motion, rolling all-time counter, undo button (bottom left, stacked, `5s` countdown reset, reverse animation); backend complete/uncomplete/delete | `completion/*`, `undo-button.tsx`, `counter.tsx`, `modules/todo/todo-completion.ts` |
| **E. History** | Full-screen overlay, low smooth 365-day pulse line (no interaction, follows filter), search title + notes, day grouping, infinite scroll, read-only details, restore to top; backend `history` | `history-overlay.tsx`, `pulse-graph.tsx`, `modules/todo/todo-history.ts` |
| **F. Linked tasks + dashboard** | Cashflow invoices (`sent`/`overdue`, due date) and minor "Show & Grow voorbereiden" tasks under Automatisch, 7-day window, locked title/date, hide on delete, source updates on complete/undo/restore, silent auto-complete when paid in cashflow, only for modules the user can access; open-task count on the dashboard tile | `modules/todo/todo-links.ts`, hook points in cashflow (minimal), dashboard tile count |
| **G. Offline** | Local cache, mutation queue replay, last-write-wins, cloud-off indicator, inside `use-todo-store.ts` transport only | `offline-todo.ts`, transport part of `use-todo-store.ts` |

Answer questions from agents promptly through SendMessage. Never let two agents edit the same file.

## Phase 3: Integrate (you)

1. Merge the slice branches into `main` one at a time: foundation-adjacent ones first (A, B), then C, D, E, F, G. After each merge, run `bun run test:all` and fix integration issues yourself or send them back to the owning agent.
2. Wire the slices together in `client.tsx`, for example: row tap opens the block, completion wraps the row, the store feeds history.
3. Remove every not-implemented stub.
4. Run a code review subagent over the full diff since the commit before the foundation, focusing on correctness against the spec, AGENTS.md rules (no `as any`, no `biome-ignore`, typed errors with i18n keys, files under 300 lines), and privacy. Fix what it confirms.

## Phase 4: Verify in a browser (you)

- **Database.** Never touch `sbase.db` beyond applying the reviewed additive migration. Never run `db:reset` or `db:seed` against it. For the browser check, run the backend on a scratch database via `DB_PATH`: migrate and seed that copy. Use the `backend-testdb` configuration in `.claude/launch.json` after updating its `DB_PATH` to your scratchpad, plus `frontend`.
- **What to check.** Use `preview_start` and work through the spec at a mobile width (375×812) and at desktop width:
  - quick add with chips;
  - reorder;
  - filters;
  - swipe both ways;
  - the completion choreography;
  - undo stacking;
  - the counter roll;
  - the task block morph, with subtasks and notes;
  - history, pulse and search;
  - the manage sheet;
  - linked invoice and sprint tasks, including the source update and its revert;
  - offline mode (block network, act, restore, confirm the sync);
  - empty state, aging and reduced motion.
- **Console and tap targets.** Check the console for errors, and check that every tap target is 44×44 px or larger. Screenshot key states.

## Phase 5: Decide on pushing to `main`

Pushing `main` deploys to production (see `.github/workflows/deploy.yml`). Push only if **all** of these hold:

- every spec section is implemented, or a deviation is listed with a reason that does not change user-visible behaviour;
- `bun run test:all` passes on the integrated `main`;
- the browser check passed at both widths with no console errors;
- the review found no unresolved correctness, privacy or data-loss issue;
- the migration is additive only and the commits are clean Conventional Commits (`feat(todo): …`, with a schema change in the same commit as its migration).

Then `git push origin main`. Let the pre-push hook run `test:all` + `build`. Do not run `bun run pre-push` separately, never bypass the hook, and never force-push. If the hook fails, fix and push again. If any criterion fails and you cannot fix it, do not push. Report what blocks it.

Git, the push and the Turbopack build need expanded execution permission in the sandbox; request it up front.

## Final report

Write a short report with:

- what shipped, or why it did not;
- the commit list;
- deviations and undefined points you decided;
- screenshots of the key states;
- anything left for the user.
