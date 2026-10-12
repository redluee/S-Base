---
last_mapped_commit: aecd703794ff6d79330d342f131628fb05b007a2
last_mapped_at: 2026-10-12
---
# Codebase Concerns

**Analysis Date:** 2026-10-12

## Tech Debt

**Monolithic Route Declaration in `backend/src/index.ts`:**
- Issue: All backend HTTP routes for 10 distinct modules are declared in a single file (`backend/src/index.ts`, 1,274 lines). While done deliberately to avoid router splitting per convention, this file has high density and handles CORS, uploads, middleware, and dozens of endpoints simultaneously.
- Files: `backend/src/index.ts`
- Impact: Increased chance of merge conflicts and cognitive load when adding new module routes.
- Fix approach: Maintain service delegation pattern; keep handlers strictly as 1-2 line delegations to domain services without business logic in `index.ts`.

**Frontend Component Complexity:**
- Issue: Several frontend components are extremely large: `frontend/src/app/minor/sprints/[id]/client.tsx` (3,151 lines) and `frontend/src/components/workout-session-live.tsx` (2,098 lines).
- Files: `frontend/src/app/minor/sprints/[id]/client.tsx`, `frontend/src/components/workout-session-live.tsx`
- Impact: Difficult to maintain, high state complexity, risk of unintended re-renders.
- Fix approach: Refactor sub-views into dedicated child components (e.g. split sprint story list, criteria checklist, and feedback drawers).

## Known Bugs

**Dev vs Production Environment Divergence:**
- Symptoms: Functionality passing in local dev may fail on production Fedora server due to Cloudflare Access headers (`cf-access-authenticated-user-email`), cookie policies, or OS networking.
- Files: `backend/src/security.ts`, `frontend/src/app/api/auth/cf-exchange/route.ts`
- Trigger: Testing authentication or proxy headers locally without Cloudflare tunnel simulation.
- Workaround: Use `CF_DEV_EMAIL` environment variable for local simulation.

## Security Considerations

**Database Preservation:**
- Risk: The local database `sbase.db` is stored at the repository root and contains user data. Accidental database resets (`bun run db:reset` or `bun run db:seed`) could overwrite custom user data.
- Files: `sbase.db`, `backend/src/db/client.ts`, `backend/src/db/seed.ts`
- Current mitigation: Safety checks in `backend/src/db/seed.ts` preventing prod seeding without `ALLOW_PROD_SEED=1`; explicit rule in `AGENTS.md`.
- Recommendations: Keep automated backups verified; use migrations for all schema evolutions.

**Swallowed Exceptions in Background Routines:**
- Risk: Multiple empty `catch {}` blocks exist in `backend/src/modules/minecraft/index.ts` and `backend/src/db/backup.ts`.
- Files: `backend/src/modules/minecraft/index.ts`, `backend/src/db/backup.ts`
- Current mitigation: Process continues running without crashing.
- Recommendations: Add structured debug logging in catch blocks rather than silent suppression.

## Performance Bottlenecks

**Large Excel and PDF Generation in Browser:**
- Problem: Generating comprehensive Minor portfolio PDFs or parsing massive Excel sheets runs on the client thread with `@react-pdf/renderer` and `exceljs`.
- Files: `frontend/src/components/minor-pdf.tsx`, `frontend/src/lib/minor-excel.ts`
- Cause: Synchronous DOM/PDF tree generation blocks UI thread momentarily on low-powered mobile devices.
- Improvement path: Defer rendering with Web Workers or background asynchronous chunks.

## Fragile Areas

**Next.js 16.2.7 Pre-stable APIs:**
- Files: `frontend/package.json`, `frontend/next.config.ts`, `frontend/src/app/**`
- Why fragile: Next.js 16.2.7 is a pre-stable release; APIs, route conventions, or caching behaviors may shift between minor updates.
- Safe modification: Check `node_modules/next/dist/docs/` before adopting newly released patterns; heed deprecation notices.
- Test coverage: Automated build check (`bun run build`) in pre-push.

**Minecraft Server Lifecycle & Child Processes:**
- Files: `backend/src/modules/minecraft/index.ts`, `backend/src/modules/pulse/shutdown-service.ts`
- Why fragile: Server management relies on OS child processes, RCON sockets, and filesystem watches. Ungraceful kills can lock port 25565 or leave zombie java processes.
- Safe modification: Ensure shutdown hooks and timeout guards remain active; test process kills gracefully.

## Scaling Limits

**SQLite Single Writer Concurrency:**
- Current capacity: WAL mode supports concurrent readers with single serialized writer. Excellent for personal/single-organization load.
- Limit: High concurrent write throughput could encounter SQLite `SQLITE_BUSY` contention (busy timeout set to 5000ms).
- Scaling path: Keep transactions brief; use batch insertions for multi-row records.

## Dependencies at Risk

**`xlsx` Maintenance & Security Advisories:**
- Risk: Community version of `xlsx` (^0.18.5) is pinned and has known audit warnings in some ecosystems.
- Impact: Deprecation or security scan warnings in CI.
- Migration plan: Transition remaining spreadsheet exports to `exceljs` which is actively maintained.

## Missing Critical Features

**Automated End-to-End Browser Testing:**
- Problem: No automated headless browser test suite (Playwright or Cypress) runs in CI/pre-push.
- Blocks: Regressions in complex multi-step UI flows (e.g. live workout session tracker) must be manually verified.

## Test Coverage Gaps

**Live Workout Session State Machine:**
- What's not tested: Complex recovery scenarios in `frontend/src/components/workout-session-live.tsx` when network drops mid-workout and reconnects.
- Files: `frontend/src/components/workout-session-live.tsx`, `frontend/src/lib/offline-workout.ts`
- Risk: Potential set duplication or missed offline sync during edge network disconnects.

---

*Concerns analysis: 2026-10-12*
