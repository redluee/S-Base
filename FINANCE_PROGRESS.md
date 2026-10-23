# Geldzaken implementation

## Plan and acceptance checklist

- [x] 1. Per-user schema, additive production migration, exact calculations, authenticated and permission-checked API.
- [x] 2. Account creation/edit/archive and atomic bulk dated balance entry with explicit replacement.
- [x] 3. Dashboard, calendar period comparisons, combined/account history, coverage and manual-update explanations.
- [x] 4. Savings goals with explicit per-account allocations, limits, and visible shortfalls.
- [x] 5. Meaningful calculation/service/security/migration tests, `bun run test:all`, production build, isolated desktop/mobile browser workflows, final diff review.

## Decisions

- Independent `finance` / `/finance` / Geldzaken module; no Cashflow integration or bank connection.
- EUR integer cents; calendar dates are `YYYY-MM-DD`. Today uses Europe/Amsterdam. Future balance observations are rejected; goal deadlines may be future dates.
- Opening balance is an ordinary observation at the account opening date. Deleting it makes the balance unknown until the next observation. Account edits can explicitly recreate/change the opening observation.
- Archived accounts remain in all totals and histories, carrying their last observation forward. Archive hides an account from routine bulk entry; it does not imply closure, transfer, or zero. Archived history remains editable; accounts can be restored.
- Periods run from the first day of the selected month/year through the selected as-of date; all-time starts at the earliest account opening date. Comparisons require complete boundary coverage, the same account cohort, and a new saldomoment between boundaries. A zero baseline has no percentage; negative baselines use their absolute value. No future backfill.
- Allocations reserve existing savings; they never add assets. Balance reductions preserve allocations and display per-account deficits. In a deficit, only reductions to that account's allocations are accepted. Allocations may not exceed a goal target.
- Account type edits restate the savings classification of its history. Opening dates may not move past existing observations.

## Verification

- Required checks passed with local port/network access and temporary Minecraft directories: 209 backend tests, 181 frontend tests, ESLint, production build. Initial sandbox runs failed because port/process/network access was blocked; unrestricted reruns passed.
- Finance-specific tests cover exact cents, calendar validation, boundary comparisons/zero baseline, unknown coverage, transfers, edits, archive, atomic conflicts, allocations/deficits, HTTP ownership and module permission denial, plus additive/idempotent migration against disposable databases.
- Browser QA uses only a synthetic user in `/tmp/sbase-finance-qa.sqlite`, separate backend port 3401 and frontend port 3400.
- Browser confirmed dashboard integration, empty state, current + two savings accounts, historical/synchronized updates, transfer-invariant totals, individual chart data, goals allocated across two accounts, mobile over-allocation rejection, and past edits recalculating totals while blank accounts remain unchanged.
- Browser caught date inputs that displayed a date without persisting it through the shared input event path. Finance calendar fields now use the native input event; historical opening/bulk/as-of/deadline persistence was verified.
- Final `bun run test:all` exited 0: 209 backend tests, 181 frontend tests, ESLint. The command used `PORT=3417`, `MC_SERVERS_DIR=/tmp/sbase-finance-check-servers`, and `MC_TEMPLATES_DIR=/tmp/sbase-finance-check-templates` to isolate existing Minecraft tests.
- Final `bun run build` exited 0 with `/finance` in the production route manifest.
- Extra backend `tsc --noEmit` reports 28 pre-existing diagnostics. A clean `git archive HEAD` baseline produced the same diagnostics after normalizing paths and line numbers; no finance errors were added.
- Browser verified archive preserves historical/current totals, account-specific allocation shortfalls after balance reduction, preserved nominal allocations, and manual deficit reduction. Goal allocations did not increase tracked money. Desktop and 390/320px mobile views were inspected; tested views had no horizontal overflow and no browser console errors.
- QA servers stopped, browser tab closed, viewport reset, generated QA frontend output and temporary TypeScript include entries removed.
- Final diff reviewed for ownership, validation, module integration, privacy, archive/calculation semantics, and scope. `git diff --check` passed. No outstanding implementation or required verification work.
- Working user database untouched; its file hash is checked outside the repository. No deploy or push.

## Before use

1. Run `bun run db:migrate` against the intended deployment database to apply `0041_create_finance.sql`. This migration was deliberately not applied to the working user database.
2. Enable `finance` (Geldzaken) for the desired user through Pulse or `bun run db:user grant <username> finance`. Registration never grants access automatically.
3. Restart the app and open `/finance` or the Geldzaken dashboard link.

## Limits

Manual EUR balances only; no transaction or bank integration. Up to 200 accounts and 200 goals, and an absolute limit of 10 billion EUR per amount. Observation dates are changed by adding the correct date and removing the old observation. Goals show current reservations, not historical allocation snapshots.
