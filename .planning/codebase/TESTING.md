---
last_mapped_commit: aecd703794ff6d79330d342f131628fb05b007a2
last_mapped_at: 2026-10-12
---
# Testing Patterns

**Analysis Date:** 2026-10-12

## Test Framework

**Runner:**
- Bun Test runner (`bun test`)
- Built-in, high-performance native test framework

**Assertion Library:**
- `expect` from Bun Test (`import { describe, it, expect, beforeEach } from "bun:test"`)

**Run Commands:**

```bash
bun run test           # Run backend and frontend test suites
bun run test:all       # Run backend + frontend tests and frontend ESLint
bun run pre-push       # Full pre-push check (test:all + build)
bun run --cwd backend test     # Run backend tests only (in-memory SQLite)
bun run --cwd frontend test    # Run frontend tests only
```

## Test File Organization

**Location:**
- Co-located with the implementation code
- Backend tests live in `backend/src/` alongside services (e.g. `backend/src/routes.test.ts`, `backend/src/modules/workout/workout.test.ts`)
- Frontend tests live in `frontend/src/lib/` and `frontend/src/components/` (e.g. `frontend/src/lib/api.test.ts`, `frontend/src/components/motivational-quote.test.ts`)

**Naming:**
- Source file: `feature-name.ts` → Test file: `feature-name.test.ts`

**Structure:**

```
backend/src/
├── routes.test.ts
├── security.test.ts
├── test-utils.ts
└── modules/
    ├── minor/minor.test.ts
    ├── recipes/recipes.test.ts
    └── workout/workout.test.ts
frontend/src/
├── components/workout-exercise-card.test.ts
└── lib/minor-excel.test.ts
```

## Test Structure

**Suite Organization:**

```typescript
import { describe, it, expect, beforeEach } from "bun:test";
import { setupTestDb, createTestUser, createTestSession } from "../test-utils";

describe("WorkoutService", () => {
  beforeEach(async () => {
    await setupTestDb();
  });

  it("should record workout set and calculate volume", async () => {
    const user = await createTestUser();
    expect(user).toBeDefined();
  });
});
```

**Patterns:**
- In-memory SQLite: Backend tests run with `DB_PATH=:memory:`, ensuring fast execution and complete test isolation without touching the persistent `sbase.db` database.
- Migration in setup: `setupTestDb()` runs Drizzle schema creation against the in-memory database before test suites.

## Mocking

**Framework:**
- Native Bun test mocking (`import { mock } from "bun:test"`)

**Patterns:**

```typescript
const mockMailer = mock(async () => ({ success: true }));
```

**What to Mock:**
- External network requests (SMTP, Discord API, n8n webhook calls)
- Timeouts and long-running timers
- Cloudflare headers when testing session exchanges

**What NOT to Mock:**
- SQLite database (use in-memory SQLite instead of mock DB objects)
- Domain services in integration route tests

## Fixtures and Factories

**Test Data:**
- `backend/src/test-utils.ts` contains helper factories:
  - `setupTestDb()` - Initializes clean in-memory database schema
  - `createTestUser(username, role)` - Inserts test user with hashed password
  - `createTestSession(userId)` - Generates valid session token for authentication testing

## Coverage

**Requirements:**
- Automated test validation required on every commit via `.githooks/pre-push` (`bun run pre-push`)
- All backend routes and critical frontend calculation logic must have unit or integration test coverage

## Test Types

**Unit Tests:**
- Frontend helper utilities (`frontend/src/lib/*.test.ts`)
- Backend utility functions (search, image compression, validation)

**Integration Tests:**
- Backend API route testing with authentication cookies (`backend/src/routes.test.ts`)
- Domain service workflows testing database reads and writes (`backend/src/modules/*/*.test.ts`)

**E2E Tests:**
- Verified through automated integration suites and pre-push builds

## Common Patterns

**Async Testing:**

```typescript
it("handles asynchronous flow", async () => {
  const result = await service.performAction();
  expect(result).not.toBeNull();
});
```

**Error Testing:**

```typescript
it("throws on invalid input", async () => {
  expect(async () => {
    await service.deleteItem(-1);
  }).toThrow();
});
```

---

*Testing analysis: 2026-10-12*
