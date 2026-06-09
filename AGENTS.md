# S-Base

Bun workspace monorepo (`backend/`, `frontend/`). No tests, no CI, no pre-commit hooks.

## Commands (run from repo root)

| Command | What |
|---------|------|
| `bun run dev` | Concurrent backend (Elysia) + frontend (Next.js) |
| `bun run dev:backend` | Backend only on `:3001` |
| `bun run dev:frontend` | Frontend only on `:3000` |
| `bun run db:migrate` | Run Drizzle SQLite migrations |
| `bun run db:seed` | Seed sample data (admin/admin, tester/tester) |
| `bun run db:reset` | Drop all tables |
| `bun run --cwd backend db:push` | Push schema directly (drizzle-kit push) |
| `bun run --cwd backend db:generate` | Generate migration files (drizzle-kit generate) |
| `bun run --cwd frontend lint` | ESLint (frontend only) |
| `bun run --cwd frontend build` | Next.js production build |

## Architecture

- **Backend** (`backend/src/index.ts`): Elysia.js on port `:3001`, Drizzle ORM + `bun:sqlite` (WAL mode). Session-based auth via `session_id` cookie (1-day expiry). Module-level permissions checked via `AuthService.moduleAccessCheck()`.
- **Frontend** (`frontend/src/`): Next.js 16.2.7 App Router. Proxies `/api/*` → `localhost:3001/api/*` via `next.config.ts` rewrites.
- **API clients**: `src/lib/api.ts` for client components (uses `/api/*` proxy), `src/lib/server-api.ts` for server components (direct fetch to backend, forwards cookies). Both send credentials.
- **Database**: SQLite at repo root `sbase.db` (committed). Schema in `backend/src/db/schema/`.

## Key conventions

- `backend/src/modules/` contains feature modules. Each owns its routes in `index.ts` (no router splitting — Elysia routes live in `src/index.ts` directly). Each module is a class instantiated at startup.
- **Language**: Backend code stays in English without comments. Frontend UI is in Dutch — all user-facing strings use `t()` from `@/lib/lang`.
- **Responsive**: Every page must be fully functional and designed for both mobile and desktop. No broken layouts or hidden functionality on either viewport.
- Recipe statuses: `"to try"`, `"success"`, `"needs tweak"`, `"failure"`, `"archived"`.
- Rating range: 0–10.
- Backend uses `bun:sqlite` with WAL pragma + foreign keys enabled.
- Path alias `@/*` → `frontend/src/*` (configured in frontend tsconfig).

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
