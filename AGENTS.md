# S-Base

Bun workspace monorepo (`backend/`, `frontend/`). Features automated test suites across backend and frontend, plus pre-push validation.

## Commands (run from repo root)

| Command | What |
|---------|------|
| `bun run dev` | Concurrent backend (Elysia) + frontend (Next.js) |
| `bun run dev:backend` | Backend only on `:3001` |
| `bun run dev:frontend` | Frontend only on `:3000` |
| `bun run test` | Run backend and frontend test suites |
| `bun run test:all` | Run all unit tests and frontend ESLint |
| `bun run pre-push` | Pre-push checks (`test:all` + `build`) |
| `bun run db:migrate` | Run Drizzle SQLite migrations |
| `bun run db:seed` | Seed sample data (admin/admin, tester/tester) |
| `bun run db:user` | User management CLI (`user-manager.ts` - create, pause, edit permissions) |
| `bun run --cwd backend db:push` | Push schema directly (drizzle-kit push) |
| `bun run --cwd backend db:generate` | Generate migration files (drizzle-kit generate) |
| `bun run --cwd frontend lint` | ESLint (frontend only) |
| `bun run --cwd frontend build` | Next.js production build |

## Architecture

- **Backend** (`backend/src/index.ts`): Elysia.js on port `:3001`, Drizzle ORM + `bun:sqlite` (WAL mode). Session-based auth via `session_id` cookie (7-day expiry). Module-level permissions checked via `AuthService.moduleAccessCheck()`.
- **Frontend** (`frontend/src/`): Next.js 16.2.7 App Router (React 19, Tailwind CSS v4). Proxies `/api/*` → `localhost:3001/api/*` via `next.config.ts` rewrites.
- **API clients**:
  - `src/lib/api.ts` for client components (uses `/api/*` proxy rewrite, forwards credentials).
  - `src/lib/server-api.ts` for server components (direct fetch to `http://localhost:3001`, forwards incoming request cookies/headers).
- **Database**: SQLite at repo root `sbase.db` (committed). Schema split per module in `backend/src/db/schema/`.

## Modules & Domains

Backend routes and frontend views are structured around discrete domain modules:
- **Recipes** (`recipes`): Recipe book, ingredient calculations, cooking steps, photo storage, ratings (0–10), statuses (`"to try"`, `"success"`, `"needs tweak"`, `"failure"`, `"archived"`).
- **Workouts** (`workout`): Workout routines, exercise templates, active workout session tracker, logs, offline caching.
- **Measurements** (`measurements`): Body metric logging, physical progress photo gallery.
- **Wines** (`wines`): Wine collection inventory, regions, grape types, tasting notes, ratings.
- **Cashflow** (`cashflow`): Invoicing, client records, trade names, project budgeting, PDF invoice generation.
- **Pulse** (`pulse`): System administration, active user management, module permission toggles, system metrics.
- **Minecraft** (`minecraft`): Server instance monitoring, player tracking, backups.

## Environments & Infrastructure

- **Development (`dev`)**: Local environment running via `bun run dev`. Authentication is tested via session cookies with seed users or dev headers.
- **Production (`prod`)**: Hosted on a private server running **Fedora Linux**. External traffic and authentication pass through `cloudflared` (Cloudflare Access / Tunnels, injecting headers like `cf-access-authenticated-user-email`).
- **Debugging & Development Note**: When developing features or fixing issues, always take into account that user-reported errors may have occurred in the production environment. Such issues may not be directly or identically reproducible in the local dev environment due to differences in OS (Fedora Linux), reverse proxy / tunnel behavior (`cloudflared`), proxy headers, cookie policies, or networking. Keep these differences in mind when analyzing stack traces or environment-sensitive features.

## Key conventions

- `backend/src/modules/` contains feature modules. Each owns its routes in `index.ts` (no router splitting — Elysia routes live in `src/index.ts` directly). Each module is a class instantiated at startup.
- **Language**: Backend code stays in English without comments. Frontend UI is in Dutch — all user-facing strings use `t()` from `@/lib/lang`.
- **Design System**: Strict adherence to `DESIGN.md` ("The Signal Panel" aesthetic):
  - Pitch black background (`#000000`) with tonal card layering (Dark Slate `oklch(0.205 0 0)`), no default shadows.
  - Signal Green (`#00e3a4`) used sparingly for active states / primary CTAs (≤10% of screen).
  - Typography: Oatmeal serif for display headers (1 per page rule), Epilogue sans for body and labels.
  - No nested cards, no gradient text fills, no colored border stripes.
- **Responsive**: Every page must be fully functional and designed for both mobile (min 44×44px tap targets) and desktop.
- **Testing**: Run `bun run test` or `bun run test:all` before pushing. Backend tests use in-memory SQLite (`DB_PATH=:memory: bun test`).
- Backend uses `bun:sqlite` with WAL pragma + foreign keys enabled.
- Path alias `@/*` → `frontend/src/*` (configured in frontend tsconfig).
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
