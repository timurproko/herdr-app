# Tasks

## 1. Per-machine reset choices use the existing Settings patterns

- [x] 1.1 Add stable reset-type/account/scope metadata to the Usage model and worker, retaining individual grant eligibility within grouped types; fixture tests cover Claude Full/model scopes, Codex coverage, repeated credits, unknown types and unusable grants.
- [x] 1.2 Normalize default-off automatic reset preferences and empty machine-scoped selections; focused preference tests prove account/organization isolation, no implicit new-type consent and exclusion from portable exports.
- [x] 1.3 Add a generic declarative expandable grouped-checkbox body to page fields and declare Automatic reset in Usage; renderer/contract tests cover native checkbox behavior, existing toggle/panel styles, off/on/fold behavior, captured-machine callbacks and absence of extra controls or messages.
- [x] 1.4 Document the declaration extension in docs/PLUGIN-UI.md and the defaults/choices in README.md; compare the declared UI with the two supplied reference pictures using synthetic provider data and save proof outside the checkout in the crew task folder.

## 2. Fresh selected-machine quota readings spend at most one authorized reset per depletion

- [ ] 2.1 Add real-read provenance and a pure eligibility policy separate from display freshness; targeted tests cover raw 0/1/1.01 thresholds, display-mode independence, scope matching, unavailable inventory, stale/reused/failed/future data and obsolete account/machine/generation evidence.
- [ ] 2.2 Add yielded Usage lifecycle collection ownership for the active-space machine while automation is enabled, sharing existing TTL/cadence and single-flight collection; plugin fixtures prove operation with summary/dialog absent and no new work while inactive, closed, disconnected or disabled.
- [ ] 2.3 Add the private durable account admission journal with exclusive locking, atomic reservations and stable request IDs, and wire manual/automatic arbitration; concurrent fixture workers prove one admission across views/windows and machine switches, with fail-closed storage/corruption behavior and no unresolved-receipt eviction.
- [ ] 2.4 Revalidate exact target credentials, applicable quota and selected usable grant in the existing reset worker action before automatic submission; mocked transport tests prove no unrelated or unticked spend, no reset-type cascade, Retry-After compliance and refusal after changed scope/identity/consent.
- [ ] 2.5 Persist depletion exclusion through refusals, timeouts, unknown results, process death, restarts and toggle cycling; focused episode tests prove only later authoritative recovery or a proven new natural quota period permits another automatic claim, never still-low follow-up or a changed timestamp alone.
- [ ] 2.6 Document desktop ownership, selected-machine limits, normal check latency, no closed-app daemon and private receipt/recovery semantics in README.md and docs/ARCHITECTURE.md; focused lifecycle tests exercise the documented behavior with synthetic machines.

## 3. Automatic resets refresh captured quotas and identify the spend through an existing success toast

- [ ] 3.1 Share PR #107's claim/account-only refresh continuation between manual and automatic origins; Usage regressions prove local/remote authoritative dialog, reset-inventory and pinned-summary updates without Refresh all, including a slow pre-reset collector and preservation of unrelated accounts, pins and inspection.
- [ ] 3.2 Emit one deduplicated existing-style success toast only for a confirmed automatic spend, identifying captured machine/provider/account/type; notification fixtures prove manual success stays silent, no false refresh claim follows a failed read and no Settings/dialog messages or new actions appear.
- [ ] 3.3 Extend obsolete/disabled and failed-refresh fixtures around automatic completion, proving no invented refill, second spend, new-target overwrite or revived follow-up work; document confirmed-spend versus refresh-result behavior beside the Usage feature notes.
- [ ] 3.4 Run only affected Usage, Settings contract, policy and journal tests; inspect a disposable synthetic-provider UI with proof pictures outside the checkout, stop every started disposable process, and record the exact targeted commands/results and any remaining gaps.
