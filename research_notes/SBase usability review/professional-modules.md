# Cashflow, Minor and Resume usability and backend review

## Which current interactions should change?

### Takeaway
The modules already solve unusually specific workflows, but reliability should precede breadth: invisible failures, draft loss, incomplete save boundaries and missing ownership checks undermine user confidence. Findings below are confirmed by source inspection of the current working tree; runtime effects are inferred and have NOT been reproduced against user data. No server was started, mutations executed or application files changed. Existing dirty work was preserved.

### Cited Findings

**PM01 — Enforce ownership of every Cashflow and Minor subresource. Priority P0; effort M; confidence high, confirmed source.**
- Cashflow authentication checks module access, not record ownership: [auth](../../backend/src/context.ts:47). Invoice get/update/delete/paid/send handlers omit userId entirely: [routes](../../backend/src/routes/cashflow.ts:73); service reads by ID only [service](../../backend/src/modules/cashflow/cashflow-invoices.ts:74). Minor criteria, feedback and reflection do likewise [routes](../../backend/src/routes/minor.ts:92), [criteria](../../backend/src/modules/minor/minor-stories.ts:429), [feedback](../../backend/src/modules/minor/minor-evaluations.ts:141).
- Impact: a signed-in module user who obtains another record ID can reach code paths that read/change another user's records; list isolation alone does not protect records. No exploit attempted.
- Recommended option A: require userId in service signatures and join child records through their owner; validate all referenced client/project/trade-name IDs on create/update. Option B: central authorization repository/helpers with the same guarantees; less duplication, larger refactor.
- Acceptance: isolated two-user tests deny GET, update, delete, email, paid status, criterion, feedback and reflection access across users; legitimate owner flows pass. Cross-owner relationship assignment rejected. UI treats forbidden as access denied and retains drafts.

**PM02 — Make failures visible and recoverable. P1; S–M; confirmed source.**
- New invoice initialization and inline client creation swallow all errors [form](../../frontend/src/app/cashflow/invoices/new/new-invoice-form.tsx:123) and [client creation](../../frontend/src/app/cashflow/invoices/new/new-invoice-form.tsx:209). Detail load redirects away on every error, including transient network failures [detail](../../frontend/src/app/cashflow/invoices/[id]/page.tsx:37). Minor story save/upload/toggle errors go only to console [hook](../../frontend/src/app/minor/sprints/[id]/use-story-editor.ts:134).
- Impact: a button appears to do nothing; failed invoice initialization looks like empty client/project lists. A user may create duplicates or abandon work.
- A recommended: inline Dutch error near operation, persistent recovery action, explicit loading/empty/error states; preserve values. B: shared toast plus inline validation (faster breadth, toast alone insufficient for long forms).
- Acceptance: simulated 401, 403, 500 and offline responses have distinct actionable states; retry works without retyping; assistive tech announces failures; transient invoice detail failure stays on detail route.

**PM03 — Preserve invoice drafts and stop defaults overwriting user choices. P1; M; confirmed implementation with loss scenario inferred.**
- New invoice fields exist in React state [form](../../frontend/src/app/cashflow/invoices/new/new-invoice-form.tsx:35); client selection unconditionally changes first line price [rate](../../frontend/src/app/cashflow/invoices/new/new-invoice-form.tsx:70); invoice date edit unconditionally resets due date to +14 days [date](../../frontend/src/app/cashflow/invoices/new/new-invoice-form.tsx:171). No draft persistence/beforeunload found in these module directories.
- Scenario: enter custom rate and payment terms, change client/date, discover manual values silently changed; navigate away and lose unsaved form.
- A recommended: user-scoped local draft, restore/discard, dirty flags so defaults apply only to untouched fields; clear draft on successful save/logout. B: server draft autosave (cross-device, more API/cleanup work). Small option: navigation warning plus explicit “Apply client rate” action.
- Acceptance: interrupted 10-line invoice restores correctly; intentional rate/due-date edits survive client/date changes; explicit reset to defaults available; no cross-user draft exposure.

**PM04 — Define invoice lifecycle, send history and reminders. P1 core / P2 reminders; M–L; confirmed source.**
- Email method sends attachment and returns success without changing invoice status or persisting sentAt [send](../../backend/src/modules/cashflow/cashflow-invoices.ts:334). Status list filtering happens on stored status before overdue status is computed [list](../../backend/src/modules/cashflow/cashflow-invoices.ts:28), so querying overdue need not include stored-sent invoices whose due date has passed.
- Impact: successfully emailed draft can still appear as draft; displayed overdue badges and filtered results may disagree. Recipient retries have no durable history visible here.
- A recommended: explicit Draft → Sent → Paid transition, timestamped send attempts, canonical derived overdue predicate shared by counts/filters. Add manual reminder queue next. B: outbox plus recurring invoice/reminder scheduler for heavier use; requires delivery/idempotency handling. External invoicing integration is another option if automation demand outgrows this module.
- Acceptance: successful send records attempt and moves draft to sent; failed send retains draft with retry; duplicate retry cannot silently double-send; overdue counts/filter/detail agree; user controls reminder recipients and schedule.

**PM05 — Save invoices atomically and calculate authoritative totals. P1; M; confirmed source.**
- Create inserts parent then lines outside transaction [create](../../backend/src/modules/cashflow/cashflow-invoices.ts:180). Update writes parent, deletes all existing lines, then reinserts [update](../../backend/src/modules/cashflow/cashflow-invoices.ts:285). totalCost is trusted from body [line](../../backend/src/modules/cashflow/cashflow-invoices.ts:308); routes cast unvalidated body as any [route](../../backend/src/routes/cashflow.ts:72).
- Impact: later insert failure can leave a partial invoice even after UI reports save failure. Quantity/rate/discount and total can disagree through direct API requests or future UI defects.
- A recommended: runtime input schema + server total calculation with explicit rounding rules + transaction encompassing header/lines. B: shared calculation package consumed on both sides, server still authoritative; larger maintenance investment.
- Acceptance: malformed later line rolls back entire update; total equals agreed formula; nonfinite values/unknown types rejected; discount/credit conventions documented and tested. This is an engineering integrity finding, not tax/compliance advice.

**PM06 — Prevent unrelated Minor saves from erasing drafts. P1; M; confirmed source.**
- reloadSprint replaces self-evaluations/teacher assessments by default and always replaces reflection fields [reload](../../frontend/src/app/minor/sprints/[id]/use-sprint-data.ts:31). Feedback add/delete invokes it [feedback](../../frontend/src/app/minor/sprints/[id]/use-sprint-data.ts:51), as does saving a story [story](../../frontend/src/app/minor/sprints/[id]/use-story-editor.ts:129).
- Scenario: type reflection or assessment, switch to feedback, add feedback, return: server snapshot overwrites the unsaved text. Hook retains form state across tabs, making this an especially surprising interaction.
- A recommended: separate server snapshot from dirty field drafts; merge only untouched fields after background reload. B: independent section autosave with version checking and explicit status; more seamless but more synchronization work.
- Acceptance: edits in every tab survive unrelated save/delete/reload; save failure leaves draft intact; conflicts are surfaced; explicit discard restores latest server state.

**PM07 — Separate saving Minor work from public publishing. P1; M–L; confirmed source, deployment behavior unverified.**
- Saving self-evaluations notifies publication [save](../../backend/src/modules/minor/minor-evaluations.ts:108); reflection save ALSO notifies [reflection](../../backend/src/modules/minor/minor-evaluations.ts:184), despite module guide describing only self-evaluation trigger. Webhook uses 3-second fire-and-forget request and console warning only [notifier](../../backend/src/modules/minor/publish-notifier.ts:9). UI module search found no public publishing terminology. Configuration restricts publication to the designated user.
- Impact: “saved” does not tell the author whether content was made public or whether public site is stale; evaluations and assessments are sequential separate saves, so snapshot timing can observe partial update [UI save](../../frontend/src/app/minor/sprints/[id]/use-sprint-data.ts:161).
- A recommended: explicit Publish action, snapshot preview, last successful publication, pending/error indicator; publish transactionally consistent snapshot. B: retain auto-publish but clearly label save action and show sync status/retry, with draft opt-out.
- Acceptance: author can identify exactly what is public; webhook failures do not masquerade as successful publish; later teacher/other edits trigger consistent refresh or visible unpublished-change state. Preserve existing snapshot contract/n8n integration; do not modify external site without separate approval.

**PM08 — Make portfolio export readiness consistent and observable. P2; M; confirmed source.**
- Bulk PDF exports without the preflight that Excel runs [PDF/Excel](../../frontend/src/app/minor/export/client.tsx:77). JSON export also lacks it, which is acceptable for raw backup, but purpose should be clear. Sprints fetch sequentially [fetch](../../frontend/src/app/minor/export/client.tsx:68); export failures only log to console.
- A recommended: common readiness summary for submission-oriented PDF/Excel, links directly to missing fields, optional clearly marked incomplete export; keep JSON backup permissive. Show progress and retry failed download. B: asynchronous export job for large portfolios; more infrastructure, unnecessary until real scale demands it.
- Acceptance: identical incomplete sprint produces matching readiness advice in PDF/Excel; backup remains available; export cancellation/retry does not clear selection; failure visible; bounded parallel fetch avoids linear latency.

**PM09 — Make Resume autosave reliable before navigation. P1; M; confirmed source.**
- Debounced effect waits 600ms and clears timer on cleanup [autosave](../../frontend/src/app/resume/[id]/client.tsx:77); settings and selected items are separate sequential writes, no flush/revision/serialization in this effect. Export uses current local state [export](../../frontend/src/app/resume/[id]/client.tsx:182).
- Scenario: change and immediately leave; pending timer cancels and update is unsaved. Overlapping requests may finish out of order; PDF can contain unsaved state while subsequent reopen differs.
- A recommended: serialized autosave queue, single atomic versioned editor endpoint, visible saved/saving/offline/retry status, local recovery and navigation flush/guard. B: explicit Save button plus dirty guard (simpler, less fluid).
- Acceptance: navigate within 600ms and return without losing work; artificial slow/out-of-order requests cannot revert latest edit; failed item save cannot claim entire CV saved; downloadable draft is explicitly distinguished when persistence failed.

**PM10 — Restore keyboard reordering and usable touch targets. P1; S; confirmed source.**
- Resume reorder arrows are hidden at lg breakpoint; grip is a nonfocusable separator with only pointer handlers [controls](../../frontend/src/app/resume/[id]/client.tsx:253). Therefore desktop keyboard users lose reorder controls. Cashflow invoice delete is a 14px icon + 12px padding (about 28px including border), below repository 44px target [delete](../../frontend/src/app/cashflow/invoices/[id]/page.tsx:147); paid-date has no explicit accessible label [date](../../frontend/src/app/cashflow/invoices/[id]/page.tsx:120).
- A recommended: retain up/down buttons at all widths, descriptive per-item labels, announce position changes, 44px targets and explicit input labels. B: implement full keyboard drag interaction (space/arrow/escape), but arrows are lower-risk and more discoverable.
- Acceptance: keyboard-only user reorders at 1440px viewport; screen reader hears item and new position; mobile delete/date/edit controls meet 44px project convention without overlap.

**PM11 — Offer archive/restore and impact previews for deletion. P2; M; confirmed source.**
- Resume library deletion warns it affects all CVs [confirmation](../../frontend/src/app/resume/library.tsx:117), and service deletes every corresponding resume item [backend](../../backend/src/modules/resume/index.ts:213). Minor feedback deletion has no confirmation or undo [handler](../../frontend/src/app/minor/sprints/[id]/use-sprint-data.ts:73). Invoice uses generic permanent-delete confirmation [handler](../../frontend/src/app/cashflow/invoices/[id]/page.tsx:59).
- A recommended: archive library/feedback records, undo toast and recoverable trash; show affected CV names/count before deleting shared entries. For sent invoices preserve history and offer clear void/correct workflow (requirements must be agreed before implementation). B: retain hard delete with explicit impact dialog and version snapshots; less schema work but slower and less forgiving.
- Acceptance: accidental delete recoverable; restore recovers links/order/overrides; deletion consequence clear before commit; per-user authorization applies to trash too.

**PM12 — Add focused Resume output modes rather than a broad career suite. P2; M–L; product opportunity, not confirmed defect.**
- Current editor offers font/layout/item choices and PDF export [editor](../../frontend/src/app/resume/[id]/client.tsx:55), with real PDF preview [preview](../../frontend/src/components/resume-pdf-preview.tsx:42). Reusable library and per-CV description override already solve tailoring well [override](../../frontend/src/app/resume/[id]/client.tsx:178).
- A recommended: add simple single-column template, output-language choice, export preflight (page count, overflow, text reading order) and structured JSON backup. B: Word export/import if applications frequently require editable documents; higher maintenance. C: retain present scope, add only quality checks. Do not copy AI assistant/job tracker features merely because competitors offer them.
- Acceptance: same data works in both layouts; selected language controls section/date labels; exported text order is checked using sample CV; long content fits readable pages; backup roundtrips without loss. No ATS defect was demonstrated; two-column PDFs require actual extraction testing before claiming one.

### Inferences
- Trustworthy save/error/undo behaviors offer more value immediately than adding many module features.
- Prioritize PM01 then PM02/05/06/09/10; lifecycle/publishing make a second coherent release; expansion is optional.
- Avoid wholesale replacement of Minor with generic task software: learning-outcome mapping, dual criteria, vacation-adjusted sprints and submission formats are domain-specific strengths.

### Gaps
- No runtime/browser or production Fedora/cloudflared reproduction was performed by this researcher. Failure timing and cross-tab races are code-derived scenarios for isolated verification.
- No mutation-based authorization test was executed; source confirms missing checks, but final behavior should be reproduced in an isolated in-memory two-user test.
- Public publishing may be disabled in local environment. No secrets inspected, webhook called or external site modified.

## What do comparable apps justify adding?

### Takeaway
Compare workflow patterns, not feature counts. Invoice Ninja supports an incremental lifecycle/reminder roadmap; Linear provides a strong reference for drafts/recovery; Reactive Resume provides output portability references. These are first-party product claims accessed 2026-10-19, not independent usability benchmarks.

### Cited Findings
- Invoice Ninja documents recurring invoices, automatic reminders, client portal and payment tracking [official features](https://invoiceninja.com/features/). Recommendation: durable send/payment history first; optional reminders next; portal/payment integration only if client volume warrants it. S-Base already combines clients/projects/expenses/invoices; no evidence user needs full accounting replacement.
- Linear retains temporary local drafts when navigating and offers persistent drafts on close; it also exposes description history [official issue docs](https://linear.app/docs/creating-issues). Recommendation: adapt draft preservation and history to Minor writing, not generic team-management complexity.
- Linear allows undo and restoration from recently deleted issues [official deletion docs](https://linear.app/docs/delete-archive-issues). Recommendation: archive/restore for expensive-to-reconstruct study evidence and reusable CV entries.
- Reactive Resume advertises multiple templates, PDF/Word exports, JSON data portability and text-based PDFs [official product](https://rxresu.me/). Recommendation: prioritize portable high-quality outputs and language/layout choice; ATS marketing is not evidence that S-Base fails ATS parsing.

### Inferences
- Additional portal, AI writing, job tracking or team collaboration is optional and should be validated by actual use frequency.
- A small shortlist of trustworthy features fits the requested “smooth power tool” better than parity with established products.

### Gaps
- Competitor services were reviewed through official documentation, not trial accounts or hands-on tests. Moneybird, FlowCV and Notion were not independently evaluated because the primary references above sufficiently support the proposed patterns.

## What should be preserved and how should recommendations be verified?

### Takeaway
Retain the domain capabilities and actual-PDF preview; test realistic interruptions instead of merely happy-path CRUD.

### Cited Findings
- Resume preview builds the same PDF blob and protects against stale preview generations [preview](../../frontend/src/components/resume-pdf-preview.tsx:42). Preserve this visual/export agreement while hardening save behavior.
- Resume supports per-CV text override without changing shared description [override](../../frontend/src/app/resume/[id]/client.tsx:178), and library deletion already explains cross-CV impact [warning](../../frontend/src/app/resume/library.tsx:118). Improve with impact details/recovery.
- Minor global story reorder uses transaction and owner constraints [reorder](../../backend/src/modules/minor/minor-stories.ts:413); apply the same standard to remaining subresources.
- Minor Excel preflight already enumerates per-sprint issues and permits intentional incomplete export [export](../../frontend/src/app/minor/export/client.tsx:90); extend rather than replace.
- Invoice inline client creation keeps context inside invoice composition [form](../../frontend/src/app/cashflow/invoices/new/new-invoice-form.tsx:209). Preserve this convenience while adding error feedback and preserving edited values.

### Inferences
- Validation matrix: keyboard at desktop/mobile width; network interruption before/after save; fast navigation; edit two tabs before saving one; repeated slow saves; invalid second invoice line; multi-user cross-record tests; long multilingual CV PDF; incomplete portfolio export; disabled/failing publish integration.
- Use synthetic, isolated data only and non-destructive schema migrations for any future approved implementation.

### Gaps
- No screen reader session, PDF extraction run or user interview was performed. Findings about actual reading order, visual contrast and user preference need these checks before final implementation decisions.
