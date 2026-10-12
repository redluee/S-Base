---
last_mapped_commit: aecd703794ff6d79330d342f131628fb05b007a2
last_mapped_at: 2026-10-12
---
# Coding Conventions

**Analysis Date:** 2026-10-12

## Naming Patterns

**Files:**
- Source files and utilities use `kebab-case.ts` (e.g., `server-api.ts`, `number-input.ts`)
- React components use `kebab-case.tsx` (e.g., `workout-exercise-card.tsx`, `nav-header.tsx`)
- Test files use `*.test.ts` (e.g., `routes.test.ts`, `minor.test.ts`)

**Functions:**
- camelCase for all functions, methods, and hooks (e.g., `validateSession`, `moduleAccessCheck`, `useOfflineSync`)
- Prefix boolean helpers with `is`, `has`, `should` (e.g., `isProduction`, `hasAccess`, `canEdit`)

**Variables:**
- camelCase for local variables and properties (e.g., `sessionId`, `workoutSession`, `recipeId`)
- UPPER_SNAKE_CASE for top-level constants and environment defaults (e.g., `DEFAULT_AUTO_SHUTDOWN_MINUTES`, `PORT`)

**Types:**
- PascalCase for TypeScript interfaces and type aliases (e.g., `WorkoutSession`, `MinorStory`, `RecipeItemInput`)
- Database schemas use lowercase or camelCase table names with typed column helpers (e.g., `recipes`, `usermodulepermissions`)

## Code Style

**Formatting:**
- Standard 2-space indentation
- Semicolons used consistently across files
- Double quotes or template literals for strings

**Linting:**
- ESLint 9 with `eslint-config-next` (`frontend/eslint.config.mjs`)
- Enforced via `bun run --cwd frontend lint` and pre-push hook

## Import Organization

**Order:**
1. External framework & runtime imports (`elysia`, `next`, `react`, `bun:sqlite`, `drizzle-orm`)
2. Internal domain services & auth (`./auth`, `./modules/*`, `./security`)
3. Database schemas & utilities (`./db/schema`, `./db/client`, `./utils/*`)
4. Path-aliased types (`@backend/types/shared`, `@/lib/*`, `@/components/*`)

**Path Aliases:**
- `@/*` maps to `frontend/src/*` in frontend code
- `@backend/*` maps to `backend/src/*` from frontend code

## Error Handling

**Patterns:**
- Backend route handlers catch exceptions and return typed responses with appropriate HTTP status codes:

```typescript
function badRequest(fn: () => any) {
  try {
    return fn();
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Bad Request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
```

- Validation errors are handled via `validated()` helper in `backend/src/utils/validation.ts`.
- Swallowed errors must only occur in non-fatal background operations (e.g., cache pruning or cleanup routines with `try { ... } catch {}`).

## Logging

**Framework:**
- Native `console.log`, `console.warn`, and `console.error`
- No third-party logging framework dependency

**Patterns:**
- Informational logging on startup (`console.log(\`Server running on ${HOST}:${PORT}\`)`)
- Warning logs for insecure defaults in production (`console.warn(...)`)
- Error logging when external integrations fail (e.g., Discord or SMTP connection errors)

## Comments

**When to Comment:**
- Minimal commenting: Backend code stays clear and self-documenting in English without superfluous comments (per `AGENTS.md`).
- Document complex domain constraints, edge cases, and architectural caveats when necessary.
- Do NOT add redundant obvious comments (e.g. `// return the user`).

## Function Design

**Size:**
- Single responsibility: Keep helper functions compact and testable.
- Complex orchestration split into dedicated helper functions or service methods.

**Parameters:**
- Destructured parameter objects preferred for functions with 3+ arguments.
- Strongly typed parameters avoiding `any`.

**Return Values:**
- Explicit return types on service methods and public API helpers.
- Nullable values returned as `null` rather than undefined when interacting with database entities.

## Module Design

**Exports:**
- Named exports preferred for domain services, utility functions, and types.
- Default exports used for Elysia main instance, DB client, and Next.js page components.

**Barrel Files:**
- Used selectively at module level (e.g., `backend/src/db/schema/index.ts`, `backend/src/modules/pulse/index.ts`) to provide clean imports.

---

*Convention analysis: 2026-10-12*
