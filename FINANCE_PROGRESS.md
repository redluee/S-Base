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
- Working user database untouched; its file hash is checked outside the repository. No deployment.

## Before use

1. Run `bun run db:migrate` against the intended deployment database to apply `0041_create_finance.sql`. This migration was deliberately not applied to the working user database.
2. Enable `finance` (Geldzaken) for the desired user through Pulse or `bun run db:user grant <username> finance`. Registration never grants access automatically.
3. Restart the app and open `/finance` or the Geldzaken dashboard link.

## Limits

EUR balances entered manually or via ING CSV; no transaction storage or bank connection. Up to 200 accounts and 200 goals, and an absolute limit of 10 billion EUR per amount. Observation dates are changed by adding the correct date and removing the old observation. Goals show current reservations, not historical allocation snapshots.

## ING import follow-up

- [x] Parse ING CSV with integer-cent post-transaction balances; choose one final balance per account/date and validate row order/continuity.
- [x] Preview masked source accounts, explicit destination mapping or account creation, date selection and conflict replacement; atomic user-scoped import.
- [x] Add responsive Dutch import UI, synthetic parser/service/security tests, repository checks, isolated browser verification.
- Use CSV with `Saldo na mutatie` (comma or semicolon export); the PDF selected in the screenshot is not parsed. Existing source reference: https://github.com/cjswart/ing-mt940-camt053 .
- No transaction storage, file storage, bank credentials, new dependencies or schema changes. Raw CSV is processed in memory; only selected dated balances are saved.
- Importing older history may explicitly move the account opening date earlier, preserving all existing observations. No observations are inferred before the earliest imported balance.
- Same-day closing balance uses the CSV's explicit chronological order, checked against transaction amounts and running balances. Detected running-balance gaps and order conflicts are rejected. A complete unfiltered export is required; the first/last omitted transaction cannot be detected from a CSV alone.

### ING import verification

- `bun run test:all` passed after QA cleanup: 228 backend tests, 184 frontend tests, ESLint. Production `bun run build` passed. `git diff --check` passed.
- Added 19 backend tests for quoted/multiline CSV, exact money, daily closing selection in both orders, missing/invalid/future data, transfer totals, idempotency, explicit replacement, historical opening-date consent, allocation preservation, atomic rollback, ownership and module permission denial. Added 3 frontend selection tests.
- Isolated browser QA used synthetic data in `/tmp/sbase-ing-qa.sqlite`. A CSV with two source accounts created a current and savings account with five historical observations. The mobile dashboard correctly showed EUR 620.29 total and EUR 520.00 savings, including historical dates and progression. No horizontal overflow or console errors on the tested 390px mobile view. Desktop preview was also verified.
- QA frontend output initially entered the lint scan; removed the generated directory and temporary TypeScript includes, then reran the full checks successfully. QA servers stopped, browser tab closed and viewport reset.
- No schema migration or added runtime dependency. The working database file hash remains unchanged. No real bank export was provided; validation used synthetic ING-format CSV fixtures.

## Total-money chart follow-up

- [x] Make the combined current + savings history prominent, with a secondary savings line and clear inclusion labels.
- [x] Default the dashboard to all-time history and add pointer/touch/keyboard inspection. Preserve unknown coverage gaps and calendar dates.
- [x] Verify chart data/geometry, total-vs-savings calculations, desktop/mobile presentation, repository checks, and production build.
- The existing backend already includes savings accounts in tracked totals. This is a presentation improvement, with no schema or working-database changes.

### Total-money chart verification

- Final `bun run test:all` passed: 228 backend tests, 192 frontend tests, ESLint. Final production `bun run build` and `git diff --check` passed.
- Added 8 chart tests covering inclusion of all current/savings accounts, archived balances, transfers, unknown coverage without future backfill, individual series, zero/negative amounts, line gaps, calendar geometry over DST, and finite constant/single-point scales. Total extrema are separate from the savings component used for shared scaling.
- Browser checked the combined chart on desktop and 390px mobile using the existing synthetic QA database only. Verified EUR 8,500 total including EUR 7,000 savings, first-date EUR 600.29 including EUR 500 savings, pointer selection, keyboard slider navigation, and series switching. No horizontal page overflow or console errors in the tested mobile view.
- QA processes stopped, browser tab closed, viewport reset, and temporary build/type entries removed. The working database hash is unchanged. No schema or dependency changes.

## ING savings-export compatibility fix

- [x] Support savings CSV with separate `Bedrag` and `Valuta` columns alongside existing `Bedrag (EUR)` exports. Retain exact cents, row continuity, daily closing balances, and explicit destination/date selection.
- [x] Validate EUR on every row whenever `Valuta` is present. Reject missing/other currencies and ambiguous amount columns before any writes.
- [x] Suggest savings for new accounts only when every source row's `Rekening naam` explicitly identifies a spaarrekening. The user can still change the type; existing account types remain unchanged.
- [x] Add regression coverage for comma/semicolon variants, both sort orders, multiple savings sources, same-day closing, currency rejection, editable type suggestions, and importing a transfer into combined/savings totals.
- Format reference: the ING Oranje Spaarrekening CSV listing at https://ehhb.nl/viewtopic.php?t=36 uses `Bedrag` + `Valuta`, ISO dates, and a separate account name. Tests use invented identifiers and amounts only. No user export has been supplied, so other layouts and PDF remain unverified/unsupported.
- `bun run test:all` passed: 233 backend tests, 193 frontend tests, ESLint. Production `bun run build` passed. `git diff --check` passed.
- Desktop preview recognized a synthetic savings CSV; mobile (390px) created the savings account and two observations. The combined chart increased by exactly EUR 500.29 to EUR 9,000.29, with EUR 7,500.29 savings. No horizontal overflow or console errors in the tested view.
- QA used the disposable database only. Servers stopped, tab closed, viewport reset, temporary frontend output/type includes removed, and the working database hash remains unchanged. No migration or added dependency is needed for this fix.
