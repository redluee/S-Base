---
last_mapped_commit: aecd703794ff6d79330d342f131628fb05b007a2
last_mapped_at: 2026-10-12
---
<!-- refreshed: 2026-10-12 -->

# Architecture

**Analysis Date:** 2026-10-12

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Client Browser (Mobile & Desktop)                     │
│                        Next.js App Router (React 19)                        │
├──────────────────────────────────────┬──────────────────────────────────────┤
│  Client Components (use client)      │   Server Components & Route Handlers │
│  `frontend/src/components/*`         │   `frontend/src/app/**/page.tsx`     │
│  Uses `frontend/src/lib/api.ts`      │   Uses `frontend/src/lib/server-api.ts`│
└──────────────────┬───────────────────┴──────────────────┬───────────────────┘
                   │ /api/* proxy rewrite                 │ Direct HTTP :3001
                   ▼                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Elysia.js Backend (:3001)                          │
│                            `backend/src/index.ts`                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  Middleware: CORS, Security Headers, Rate Limiter, `createAuthPlugin`       │
├───────────┬───────────┬───────────┬───────────┬───────────┬─────────────────┤
│ Recipes   │ Workout   │ Cashflow  │ Minor     │ Resume    │ Pulse/MC/Wines  │
│ Service   │ Service   │ Service   │ Service   │ Service   │ Services        │
└─────┬─────┴─────┬─────┴─────┬─────┴─────┬─────┴─────┬─────┴────────┬────────┘
      │           │           │           │           │              │
      ▼           ▼           ▼           ▼           ▼              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Drizzle ORM (`backend/src/db/schema/*`)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                    bun:sqlite (`sbase.db` WAL Mode Engine)                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| `backend/src/index.ts` | Central Elysia app entry point; mounts all HTTP routes, plugins, upload handlers, and middleware | `backend/src/index.ts` |
| `backend/src/auth/index.ts` | User credentials hashing, session lifecycle, module access authorization checks | `backend/src/auth/index.ts` |
| `backend/src/security.ts` | Security headers, IP resolution, rate limiting, internal auth secret verification | `backend/src/security.ts` |
| `backend/src/db/client.ts` | SQLite connection initialization via `bun:sqlite`, WAL pragma execution, graceful shutdown | `backend/src/db/client.ts` |
| `backend/src/modules/recipes/` | Recipe management, ingredient calculations, cooking steps, image uploads | `backend/src/modules/recipes/index.ts` |
| `backend/src/modules/workout/` | Workout templates, live session tracker, exercise logs, PR calculation | `backend/src/modules/workout/index.ts` |
| `backend/src/modules/minor/` | Minor study portfolio, sprints, user stories, acceptance criteria, public snapshot API | `backend/src/modules/minor/index.ts` |
| `backend/src/modules/cashflow/` | Clients, trade names, project budgeting, invoice calculations, email delivery | `backend/src/modules/cashflow/index.ts` |
| `backend/src/modules/resume/` | CV builder, experience/education library, layout configuration, font management | `backend/src/modules/resume/index.ts` |
| `backend/src/modules/pulse/` | System status, user permission management, hardware metrics, graceful shutdown | `backend/src/modules/pulse/index.ts` |
| `backend/src/modules/minecraft/`| Minecraft server process execution, status polling, Discord bot integration | `backend/src/modules/minecraft/index.ts` |
| `frontend/src/lib/api.ts` | Client-side HTTP client using browser fetch; communicates via `/api/*` rewrite | `frontend/src/lib/api.ts` |
| `frontend/src/lib/server-api.ts` | Server-side HTTP client directly calling `http://127.0.0.1:3001/api` forwarding incoming headers | `frontend/src/lib/server-api.ts` |
| `frontend/src/lib/lang.ts` | Localization dictionary and `t()` helper ensuring all UI text is in Dutch | `frontend/src/lib/lang.ts` |

## Pattern Overview

**Overall:** Modular Monolith with Decoupled Frontend and Monolithic Route Declaration.

**Key Characteristics:**
- **Single HTTP Router File:** Per architectural convention, Elysia routes are intentionally declared in `backend/src/index.ts` rather than split across routers.
- **Service-Oriented Domain Layer:** Each domain in `backend/src/modules/<domain>/` is a TypeScript class (`RecipeService`, `WorkoutService`, etc.) encapsulating domain logic and database queries.
- **Granular Module Permissions:** Authentication uses session tokens, with access guarded by `createAuthPlugin(moduleName)` per route group.
- **Bimodal Frontend API Access:** Next.js Server Components call Elysia directly over localhost (`server-api.ts`), while Client Components fetch via Next.js proxy rewrite (`api.ts`).

## Layers

**Presentation Layer (Frontend):**
- Purpose: Deliver responsive, Signal Panel-compliant UI in Dutch
- Location: `frontend/src/app/`, `frontend/src/components/`
- Contains: Next.js App Router pages, layout shells, interactive modal components
- Depends on: `frontend/src/lib/api.ts`, `frontend/src/lib/lang.ts`

**API Gateway / Route Layer (Backend):**
- Purpose: HTTP request routing, cookie extraction, session validation, route authorization, input parsing
- Location: `backend/src/index.ts`
- Contains: Elysia route definitions, `createAuthPlugin` guards, upload endpoints
- Depends on: Domain service classes, `backend/src/auth/index.ts`, `backend/src/security.ts`

**Domain Service Layer (Backend):**
- Purpose: Business logic, calculations, domain invariants, workflow coordination
- Location: `backend/src/modules/*/index.ts`
- Contains: Service classes (`MinorService`, `CashflowService`, `WorkoutService`, etc.)
- Depends on: Drizzle ORM schemas and DB client

**Data Access Layer (Backend):**
- Purpose: Schema definitions, relational mapping, database migrations, connection pooling
- Location: `backend/src/db/schema/*.ts`, `backend/src/db/client.ts`
- Contains: Drizzle SQLite table definitions, relations, and migration runner
- Depends on: `bun:sqlite` and `drizzle-orm`

## Data Flow

### Primary Request Path (Client Component)

1. User interacts with UI (e.g., saves a workout set in `frontend/src/components/workout-session-live.tsx`)
2. Client API method invoked (`frontend/src/lib/api.ts` calling `fetch("/api/workouts/sessions/...")`)
3. Next.js rewrite in `frontend/next.config.ts` forwards `/api/*` to `http://127.0.0.1:3001/api/*` forwarding cookies
4. Elysia `workoutAuth` plugin validates `session_id` cookie via `AuthService.validateSession()` and checks permissions in `backend/src/index.ts`
5. Route handler in `backend/src/index.ts` delegates to `workout.saveSet(...)` in `backend/src/modules/workout/index.ts`
6. `WorkoutService` executes parameterized Drizzle query via `db.insert(...)` into SQLite (`backend/src/db/client.ts`)
7. JSON response returns to client; state updates optimistically or via returned payload

### Server Component Request Path

1. User navigates to server-rendered page (e.g. `frontend/src/app/minor/page.tsx`)
2. Page calls `serverApi.minor.getDashboard()` from `frontend/src/lib/server-api.ts`
3. `server-api.ts` reads incoming request cookies via `next/headers` and issues direct HTTP fetch to `http://localhost:3001/api/minor/dashboard`
4. Backend handles request, checks authorization, queries SQLite, and returns JSON
5. Server Component renders initial HTML and hydration payload to browser

**State Management:**
- Server-rendered HTML for fast first paint
- React component state (`useState`, `useReducer`) for view interactivity
- LocalStorage and IndexedDB for offline workout execution and recovery (`frontend/src/lib/offline-workout.ts`)
- SQLite database as single source of truth

## Key Abstractions

**AuthPlugin:**
- Purpose: Elysia middleware scoped to specific modules; verifies active session and checks `usermodulepermissions` table
- Examples: `recipeAuth`, `workoutAuth`, `minorAuth` in `backend/src/index.ts`
- Pattern: Elysia macro / scoped plugin derivation

**Domain Services:**
- Purpose: Encapsulate all database operations and business logic for a specific domain
- Examples: `MinorService` (`backend/src/modules/minor/index.ts`), `CashflowService` (`backend/src/modules/cashflow/index.ts`)
- Pattern: Singleton service class with dependency injection

**Design Tokens:**
- Purpose: Enforce strict visual aesthetic ("The Signal Panel")
- Examples: `frontend/src/app/globals.css`, `frontend/src/components/ui/`
- Pattern: CSS variables and utility classes adhering to `DESIGN.md`

## Entry Points

**Backend HTTP Server:**
- Location: `backend/src/index.ts`
- Triggers: `bun run dev:backend` or `bun run start:backend`
- Responsibilities: Boot Elysia server on `:3001`, start hourly database backup schedule, initialize Discord bot

**Frontend Web Server:**
- Location: `frontend/src/app/layout.tsx` & Next.js server runtime
- Triggers: `bun run dev:frontend` or `bun run start:frontend`
- Responsibilities: Handle incoming web requests, render server pages, proxy client API calls

**CLI User Manager:**
- Location: `backend/src/db/user-manager.ts`
- Triggers: `bun run db:user`
- Responsibilities: Admin CLI for user creation, password reset, permission grant/revoke

## Architectural Constraints

- **No Router Splitting:** All Elysia HTTP routes must be declared in `backend/src/index.ts` (enforced per project conventions in `AGENTS.md`).
- **Database Preservation:** Local `sbase.db` contains active user data; dropping tables or running destructive resets is strictly forbidden.
- **Dutch UI Language:** All user-facing frontend strings must use `t()` from `frontend/src/lib/lang.ts`.
- **Signal Panel Aesthetic:** Strict adherence to pitch black background (`#000000`), Dark Slate card layering, Signal Green (`#00e3a4`) limited to <=10% screen space, Oatmeal serif for display headers (1 per page).

## Anti-Patterns

### Splitting Elysia Routes into Separate Router Files

**What happens:** Developer creates `backend/src/modules/recipes/router.ts` and uses `app.use(recipeRouter)`.
**Why it's wrong:** Violates project convention documented in `AGENTS.md` ("no router splitting — Elysia routes live in src/index.ts directly").
**Do this instead:** Define route endpoints directly in `backend/src/index.ts` and delegate logic to `RecipeService`.

### Hardcoding Dutch UI Strings in Components

**What happens:** Component directly embeds Dutch text like `<button>Opslaan</button>`.
**Why it's wrong:** Breaks centralized localization dictionary, preventing translation reuse and consistency testing.
**Do this instead:** Import `t` from `@/lib/lang` and use `{t("common.save")}` or component-specific key.

## Error Handling

**Strategy:**
- Backend endpoints wrap service calls in try/catch or helper wrappers `validated()` / `badRequest()` (`backend/src/index.ts`).
- Failures return standardized JSON `{ error: string }` with appropriate HTTP status codes (400, 401, 403, 404, 500).
- Frontend API client intercepts non-2xx responses and throws Error with server message (`frontend/src/lib/api.ts`).

## Cross-Cutting Concerns

**Logging:** Standard console output for errors and startup events; production logs managed by host supervisor.
**Validation:** Zod-like runtime validation and type assertion functions in `backend/src/utils/validation.ts`.
**Authentication:** Session cookie `session_id` checked via `AuthService.validateSession()`.

---

*Architecture analysis: 2026-10-12*
