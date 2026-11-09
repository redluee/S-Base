# S-Base

Bun workspace monorepo (`backend/`, `frontend/`). Features automated test suites across backend and frontend, plus pre-push validation.

## Commands (run from repo root)

| Command | What |
|---------|------|
| `bun run dev` | Concurrent backend (Elysia) + frontend (Next.js) |
| `bun run dev:backend` | Backend only on `:3001` |
| `bun run dev:frontend` | Frontend only on `:3000` |
| `bun run test` | Run backend and frontend test suites |
| `bun run test:all` | Backend typecheck (`tsc`, including tests) + Biome check (lint and format), all unit tests, frontend ESLint |
| `bun run pre-push` | Pre-push checks (`test:all` + `build`) |
| `bun run db:migrate` | Run Drizzle SQLite migrations |
| `bun run db:seed` | Seed sample data (admin/admin, tester/tester) |
| `bun run db:user` | User management CLI (`user-manager.ts` - create, pause, edit permissions) |
| `bun run --cwd backend db:push` | Push schema directly (drizzle-kit push) |
| `bun run --cwd backend db:generate` | Generate migration files (drizzle-kit generate) |
| `bun run --cwd frontend lint` | ESLint (frontend only) |
| `bun run --cwd frontend build` | Next.js production build |

When committing and pushing to `main`, rely on the enforced Git pre-push hook to run `test:all` and `build` once. Do not run `bun run pre-push` immediately before `git push`; use it for standalone validation when no push follows. Never bypass the hook. Backend tests preload an in-memory database and temporary Minecraft fixture directories via `backend/bunfig.toml`.

In restricted agent sandboxes, Git writes to `.git`, SSH pushes, and Next.js Turbopack builds require expanded execution permission. Request that execution permission from the outset for commits, pushes (including their pre-push hook), and standalone builds. Turbopack's build workers bind a local port; an `Operation not permitted` error there is an execution restriction, not an application failure. Keep the production build and all validation checks enabled.

## Architecture

- **Backend** (`backend/src/index.ts`, routes in `backend/src/routes/`): Elysia.js on port `:3001`, Drizzle ORM + `bun:sqlite` (WAL mode). Session-based auth via `session_id` cookie (7-day expiry). Module-level permissions checked via `AuthService.moduleAccessCheck()`.
- **Frontend** (`frontend/src/`): Next.js 16.2.7 App Router (React 19, Tailwind CSS v4). Proxies `/api/*` → `localhost:3001/api/*` via `next.config.ts` rewrites.
- **API clients**:
  - `src/lib/api.ts` for client components (uses `/api/*` proxy rewrite, forwards credentials).
  - `src/lib/server-api.ts` for server components (direct fetch to `http://localhost:3001`, forwards incoming request cookies/headers).
- **Database**: SQLite at repo root `sbase.db` (committed). Schema split per module in `backend/src/db/schema/`.

## Modules & Domains

Backend routes and frontend views are structured around discrete domain modules:
- **Recipes** (`recipes`): Recipe book, ingredient calculations, cooking steps, photo storage, ratings (0–10), statuses (`"to try"`, `"success"`, `"needs tweak"`, `"failure"`, `"archived"`). Also owns the wine collection (inventory, regions, grape types, tasting notes, ratings) under the same `recipes` permission.
- **Workouts** (`workout`): Workout routines, exercise templates, active workout session tracker, logs, offline caching. Also owns body measurements and progress photos under the same `workout` permission.
- **Cashflow** (`cashflow`): Invoicing, client records, trade names, project budgeting, PDF invoice generation.
- **Pulse** (`pulse`): System administration, active user management, module permission toggles, system metrics.
- **Minecraft** (`minecraft`): Server instance monitoring, player tracking, backups.
- **Minor** (`minor`): Minor study tracking (portfolio/sprints, user stories, dual acceptance/quality criteria checklists, evidence links, Show & Grow presentation mode, self-evaluations, teacher assessments, reflections, peer help / knowledge sharing, vacation sprint date auto-extensions, JSON/Excel/PDF export). See `backend/src/modules/minor/AGENTS.md` and `frontend/src/app/minor/AGENTS.md`. Minor data is also published to the public site `minor.stevenheijn.nl` through a snapshot API and n8n; see the "Publishing" section in `backend/src/modules/minor/AGENTS.md` and do not modify `~/Development/future-proof-met-ai` without explicit instruction.
- **Resume** (`resume`): Per-user CV builder (profile, ervaring/opleidingen library, multiple named resumes with fonts/column widths, live preview, PDF export). See `backend/src/modules/resume/AGENTS.md` and `frontend/src/app/resume/AGENTS.md`.

## Environments & Infrastructure

- **Development (`dev`)**: Local environment running via `bun run dev`. Authentication is tested via session cookies with seed users or dev headers.
- **Production (`prod`)**: Hosted on a private server running **Fedora Linux**. External traffic and authentication pass through `cloudflared` (Cloudflare Access / Tunnels, injecting headers like `cf-access-authenticated-user-email`).
- **Debugging & Development Note**: When developing features or fixing issues, always take into account that user-reported errors may have occurred in the production environment. Such issues may not be directly or identically reproducible in the local dev environment due to differences in OS (Fedora Linux), reverse proxy / tunnel behavior (`cloudflared`), proxy headers, cookie policies, or networking. Keep these differences in mind when analyzing stack traces or environment-sensitive features.

## Key conventions

- `backend/src/modules/` contains feature modules, instantiated at startup in `src/context.ts`. Elysia routes live in `src/routes/<module>.ts` and are mounted from `src/index.ts`. See "Development rules" below for structure.
- **Language**: Backend code stays in English without comments. Frontend UI is in Dutch — all user-facing strings use `t()` from `@/lib/lang`.
- **Design System**: Strict adherence to `DESIGN.md` ("The Signal Panel" aesthetic):
  - Pitch black background (`#000000`) with tonal card layering (Dark Slate `oklch(0.205 0 0)`), no default shadows.
  - Signal Green (`#00e3a4`) used sparingly for active states / primary CTAs (≤10% of screen).
  - Typography: Space Grotesk for display headers (1 per page rule), Epilogue sans for body and labels.
  - No nested cards, no gradient text fills, no colored border stripes.
- **Responsive**: Every page must be fully functional and designed for both mobile (min 44×44px tap targets) and desktop.
- **Testing**: Run `bun run test` or `bun run test:all` before pushing. Backend tests use in-memory SQLite (`DB_PATH=:memory: bun test`).
- Backend uses `bun:sqlite` with WAL pragma + foreign keys enabled.
- Path alias `@/*` → `frontend/src/*` (configured in frontend tsconfig).

## Development rules

Apply these to new code and to code you touch. Do not rewrite untouched modules. Leave touched code more consistent than you found it, within the task's scope. Read the module's own `AGENTS.md` first, if it has one.

**Backend structure**
1. A module is `modules/<name>/` with a thin `index.ts` exporting one service class. Logic lives in `<name>-<topic>.ts` files composed by delegation, never inheritance chains.
2. One `routes/<name>.ts` per module. Routes parse input and call the service; they hold no business logic.
3. Name the service after the module (`recipes`, `wines`) and use the module's own permission key; no aliases to another module's.
4. Split any file over ~300 lines (hard limit 500).

**Reference module:** `recipes` (`backend/src/modules/recipes/`, `backend/src/routes/recipes.ts`, `backend/src/routes/recipes.test.ts`). Copy its shape: `index.ts` composes topic classes as readonly properties (`recipes.catalog`, `recipes.wines`), routes declare `t` schemas for params/query/body and return service results directly.

**Error contract:** typed errors live in `backend/src/utils/errors.ts` (`ValidationError` 400, `NotFoundError` 404, `ConflictError` 409; `orNotFound()` for lookups). The constructor takes an i18n key named `<module>.<camelCaseName>` (shared ones: `common.*`, `upload.*`) plus optional details, and the central `onError` in `src/index.ts` answers `{ ...details, error: key }`. Elysia schema failures answer `{ error: "common.invalidRequest" }`. Failures of an upstream service (downloads, mail) may throw `new AppError(502, key)`. The frontend translates keys in `ApiError` (`lib/api/core.ts`); keys live in a per-domain lang file (`lib/<domain>-lang.ts`, spread into `lib/lang.ts`). Show errors with `apiErrorMessage(err, fallbackKey)`. Server pages wrap single-item fetches in `notFoundOn404()` from `lib/server-api.ts`.

**Frontend reference:** `app/recipes/`. Components, hooks and helpers used by one module live next to its routes (`app/recipes/recipe-form.tsx`, `app/recipes/wines/wine-form.tsx`), with their tests. Shared code stays in `components/` and `lib/`. API clients stay in `lib/api/<module>.ts`, and translations in `lib/<domain>-lang.ts` (spread into `lib/lang.ts`). `bun run test:all` does not typecheck the frontend: after moving files, also run `bunx tsc --noEmit -p frontend` (only pre-existing errors in `*.test.ts` are allowed).

**Backend behaviour**
5. Validate every body, query and param with an Elysia `t` schema on the route. `as any` is forbidden.
6. Modules throw typed errors (`ValidationError`, `NotFoundError`, `ConflictError`) carrying an i18n key. Never throw plain `Error` or return `null` for not-found. Routes never build error `Response`s; the central `onError` maps errors to 400/404/409.
7. The backend holds no user-facing text, only keys.
8. Handle uploads with `saveUpload`; do not duplicate file-handling code.

**Frontend**
9. Module code lives in `app/<module>/`: `page.tsx` (server fetch), `client.tsx` (interactivity), plus its own components, hooks and helpers. Only genuinely shared code goes in `components/` and `lib/`.
10. Server code uses `server-api.ts`, client code uses `api.ts`. No raw `fetch`.
11. One lang file per domain, all strings via `t()`.
12. Style with Tailwind and `DESIGN.md` tokens. No inline `style={{}}` except for dynamic values.

**Tests**
13. New backend logic needs tests. A bug fix starts with a failing test that reproduces it.
14. Frontend tests cover `lib/` and utility logic, not every component.
15. Tests never touch `sbase.db` or real services.

**Commits**
16. Conventional Commits: `type(module): imperative summary`, with the module name from the list above (`recipes`, `cashflow`, …). One logical change per commit. Put a schema change and its migration in the same commit.

**Done means**
17. `bun run test:all` and `bun run build` pass (the pre-push hook enforces this), and UI changes were checked in a browser on mobile and desktop widths.
18. Backend Biome (`backend/biome.json`) runs as `biome check`: every lint rule is an error and unformatted files fail (2 spaces, 120 columns, double quotes; run `bunx biome format --write src` in `backend/`). `backend/tsconfig.check.json` typechecks tests too. Never silence a rule with `biome-ignore` or `as any`.
- **Privacy**: Personal data must never be written into the codebase. Never commit real user data, names, emails, addresses, or other personal information in code, comments, seed data, migrations, or documentation. Use placeholder or anonymized values instead.
- **Database preservation**: The local development database `sbase.db` contains custom user data and must NEVER be deleted, overwritten, or reset by the AI agent. Avoid running `bun run db:reset` or `bun run db:seed`. If schema migrations are needed, use non-destructive migrations. Dropping tables or wiping data via AI commands is strictly prohibited. When fields or tables are added or edited write a migration file for a production database to migrate to the new version.

## Next.js version caveats

**Next.js 16.2.7 is a pre-stable release** — APIs, conventions, and file structure may differ from documented defaults. Before writing frontend code, check:
- `node_modules/next/dist/docs/` for authoritative guides
- Heed deprecation notices in the build output

See `frontend/AGENTS.md` for the canonical warning (also referenced by `frontend/CLAUDE.md`).

## Default users (after seed)

| Username | Password |
|----------|----------|
| admin | admin |
| tester | tester |
