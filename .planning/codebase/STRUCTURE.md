---
last_mapped_commit: aecd703794ff6d79330d342f131628fb05b007a2
last_mapped_at: 2026-10-12
---
# Codebase Structure

**Analysis Date:** 2026-10-12

## Directory Layout

```
/home/stevo/Development/S-Base/
├── backend/                  # Elysia.js backend workspace
│   ├── migrations/           # Drizzle SQL migration files
│   ├── src/                  # Backend source code
│   │   ├── auth/             # Authentication & session services
│   │   ├── db/               # SQLite client, schema, seed, backup scripts
│   │   │   └── schema/       # Per-module Drizzle schemas
│   │   ├── lib/              # Supporting services (mailer, etc.)
│   │   ├── modules/          # Domain services (recipes, workouts, minor, etc.)
│   │   ├── types/            # Shared TypeScript type definitions
│   │   ├── utils/            # Shared utilities (uploads, validation, search)
│   │   ├── index.ts          # Central HTTP server and route definitions
│   │   └── security.ts       # Rate limiting, security headers, CORS
│   ├── uploads/              # Local uploaded files storage
│   ├── drizzle.config.ts     # Drizzle Kit configuration
│   ├── package.json          # Backend dependencies and scripts
│   └── tsconfig.json         # Backend TypeScript configuration
├── frontend/                 # Next.js 16 frontend workspace
│   ├── src/                  # Frontend source code
│   │   ├── app/              # Next.js App Router routes and pages
│   │   ├── components/       # Reusable React components
│   │   │   ├── minecraft/    # Minecraft UI components
│   │   │   ├── minor-presentation/ # Minor presentation deck components
│   │   │   └── ui/           # Primitive UI components
│   │   └── lib/              # Client API, server API, translations, utilities
│   ├── eslint.config.mjs     # ESLint configuration
│   ├── next.config.ts        # Next.js config (rewrites & headers)
│   ├── package.json          # Frontend dependencies and scripts
│   └── tsconfig.json         # Frontend TypeScript configuration
├── sbase.db                  # Local SQLite database (committed, preserve always)
├── package.json              # Monorepo root workspace configuration
└── AGENTS.md                 # Project architecture rules and conventions
```

## Directory Purposes

**`backend/src/modules/`:**
- Purpose: Encapsulates domain logic for all features
- Contains: Domain services (`RecipeService`, `WorkoutService`, `MinorService`, `CashflowService`, `PulseService`, etc.)
- Key files: `backend/src/modules/minor/index.ts`, `backend/src/modules/workout/index.ts`, `backend/src/modules/cashflow/index.ts`

**`backend/src/db/schema/`:**
- Purpose: Single source of truth for database schema definitions
- Contains: Drizzle table definitions split per domain
- Key files: `backend/src/db/schema/auth.ts`, `backend/src/db/schema/minor.ts`, `backend/src/db/schema/workout.ts`

**`frontend/src/app/`:**
- Purpose: Next.js App Router routing tree
- Contains: Page layouts, server page components, and client page wrappers
- Key files: `frontend/src/app/layout.tsx`, `frontend/src/app/dashboard/page.tsx`, `frontend/src/app/minor/page.tsx`

**`frontend/src/components/`:**
- Purpose: Modular React UI components
- Contains: Form modals, live session trackers, PDF renderers, autocomplete inputs
- Key files: `frontend/src/components/workout-session-live.tsx`, `frontend/src/components/nav-header.tsx`, `frontend/src/components/minor-pdf.tsx`

**`frontend/src/lib/`:**
- Purpose: Core frontend utilities, API wrappers, and localization
- Contains: HTTP clients (`api.ts`, `server-api.ts`), Dutch translation dictionary (`lang.ts`), offline storage
- Key files: `frontend/src/lib/api.ts`, `frontend/src/lib/server-api.ts`, `frontend/src/lib/lang.ts`

## Key File Locations

**Entry Points:**
- `backend/src/index.ts`: Backend Elysia server initialization and route declarations
- `frontend/src/app/layout.tsx`: Root HTML layout shell and global font/theme styling
- `backend/src/db/user-manager.ts`: Administrative CLI tool for managing database users

**Configuration:**
- `package.json`: Root workspaces and monorepo scripts
- `frontend/next.config.ts`: Proxy rewrites and HTTP response headers
- `backend/drizzle.config.ts`: Drizzle Kit configuration
- `frontend/src/app/globals.css`: Tailwind v4 theme variables and design tokens

**Core Logic:**
- `backend/src/auth/index.ts`: Password hashing, session validation, access control
- `frontend/src/lib/api.ts`: Client API client methods with response parsing
- `frontend/src/lib/lang.ts`: Translation keys and dictionary

**Testing:**
- `backend/src/routes.test.ts`: Integration tests for backend routes
- `backend/src/test-utils.ts`: In-memory SQLite test harness and session mock helpers
- `frontend/src/lib/*.test.ts`: Unit tests for helper and calculation functions

## Naming Conventions

**Files:**
- TypeScript modules & utilities: `kebab-case.ts` (e.g., `offline-workout.ts`, `test-utils.ts`)
- React components & pages: `kebab-case.tsx` (e.g., `nav-header.tsx`, `page.tsx`)
- Test files: `*.test.ts` located alongside the code they test

**Directories:**
- Route folders: `kebab-case` or dynamic `[id]` / `[slug]` (e.g., `sprints/[id]`)
- Module domains: `kebab-case` (e.g., `recipes`, `workout`, `cashflow`)

## Where to Add New Code

**New Feature in Existing Module:**
- Backend logic: Add methods to `backend/src/modules/<module>/index.ts`
- Backend routes: Add endpoints to `backend/src/index.ts` within the module's auth guard
- Backend tests: Add assertions in `backend/src/modules/<module>/<module>.test.ts`
- Frontend UI: Add components in `frontend/src/components/` or pages in `frontend/src/app/<module>/`
- Frontend API client: Add API functions to `frontend/src/lib/api.ts`
- Translation keys: Add Dutch strings to `frontend/src/lib/lang.ts`

**New Domain Module:**
- Schema: Create `backend/src/db/schema/<module>.ts` and export from `backend/src/db/schema/index.ts`
- Service: Create `backend/src/modules/<module>/index.ts` exporting `<Module>Service`
- Mount routes: In `backend/src/index.ts`, instantiate service, create auth plugin, and register endpoints
- Frontend pages: Create `frontend/src/app/<module>/page.tsx`
- Navigation: Add navigation entry to `frontend/src/components/nav-header.tsx`

**Utilities:**
- Shared backend helpers: `backend/src/utils/`
- Shared frontend helpers: `frontend/src/lib/`

## Special Directories

**`.planning/`:**
- Purpose: GSD project planning artifacts, codebase maps, roadmaps, and requirements
- Generated: Semi-automated by GSD workflows
- Committed: Yes

**`backend/migrations/`:**
- Purpose: Drizzle SQL migration files
- Generated: Generated by `bun run --cwd backend db:generate`
- Committed: Yes

**`backend/uploads/`:**
- Purpose: User-uploaded recipe photos, progress images, and attachments
- Generated: Runtime uploads
- Committed: Ignored via `.gitignore`

---

*Structure analysis: 2026-10-12*
