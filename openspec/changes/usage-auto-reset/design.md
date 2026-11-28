# Design

## Context

See `proposal.md` for motivation and the spec delta for the behavior contract.

- `src/plugins/usage/mod/settings-page.js` declares four machine-scoped fields; Settings renders them through `pluginPage()` in `src/features/settings/plugins-ui.js`. That renderer currently handles toggle/choice page fields, not nested grouped checkboxes.
- `src/plugins/usage/model.js` normalizes preferences and defines the ten-minute collection TTL. Display freshness intentionally tolerates old values during collection; it is not spending authority.
- `store.js` coalesces collectors per machine, reuses reports from other machines and merges scoped results. Its reusable reports do not currently carry strict action provenance. A collector failure can retain prior reports for presentation.
- `bridge.cjs` discovers exact account credentials privately. Claude grants report `clears`, but normalization currently discards that applicability and groups by friendly name. Codex returns individual credit rows and aggregate applicability counts. Display names alone cannot safely identify affected quotas.
- Manual Reset uses `claimReset()` and the existing provider actions. PR #107 (merge `27c55b9d1bdf4763909b6b1aec076b2a5ec40965`, already in this branch's ancestry) added the account-only authoritative refresh continuation consumed by dialog and sidebar. Manual success remains silent.
- Collection currently lives in mounted Usage views. The summary can be hidden. Permanently mounted workspace chrome already emits `sidebar.sync`; plugins use that lifecycle for shared long-lived work. The host exposes `notify()` and existing features use compact success toasts.

## Goals / Non-Goals

**Goals:** Separate display data from spend authority; make consent explicit and durable per machine; admit at most one automatic claim per account depletion across mod copies/windows and selected-machine changes; reuse current collection, transport, reset actions and refresh semantics.

**Non-Goals:** No always-on remote agent, closed-app behavior, background scan of all machines, CLI account switching, native modification, new quota provider, new consume endpoint, live-provider tests or portable automation consent. Other independent clients redeeming credits outside this Herdr installation remain the provider's authority; do not claim a distributed transaction with those clients.

## Decisions

### 1. Declare the nested UI rather than drawing a Usage-only Settings page

Extend the generic page-field declaration with an optional expandable grouped-checkbox body, drawn by the shared renderer/kit using existing `collapsible`/`disclosure` and native `Checkbox`. The Usage declaration supplies data, labels and captured-machine setters only. Keep the ordinary Automatic reset switch identical to existing Usage switches. Turning it on opens the body; turning it off hides the body without erasing selections. Its ordinary disclosure can fold it; add no extra action or explanatory content.

Group provider → exact account → reset types. Consolidate multiple credits/grants of the same semantic type into one checkbox; model scopes remain separate. Persist a default-false master switch plus a validated, bounded set of provider/account/organization/scope selection keys in Usage's existing machine preferences. Never key consent by display name, email, ordinal position or consumable credit ID. A changed or unknown scope cannot inherit consent. Leave the portable preference allowlist unchanged for these account-linked authorization fields and exclude operational receipts entirely.

Alternative rejected: an independent custom Settings renderer or dropdown of grants would break current UI ownership and the requested simple checkbox layout.

### 2. Keep a precise provider scope model

Retain sanitized reset applicability and stable type identifiers from provider responses alongside current display fields. Map Claude's explicit cleared quota fields to the normalized session/weekly/model/surface windows; do not infer a model from a friendly label alone. Keep enough per-grant information that grouping cannot merge distinct scopes or authorize an unusable grant using another grant's flags. Choose the earliest-expiring usable grant within the selected exact type.

For Codex, use only reset coverage established by the reset/usage payload and known provider semantics for its reported full reset. Aggregate available/applicable counts alone, an arbitrary credit title or unknown future type do not prove coverage. Reported types can appear as unchecked choices, but unknown coverage never spends. Paused, expired, unsupported, cooling-down, unavailable or empty resets are ineligible. No selection is silently substituted with Full reset or another model.

Alternative rejected: `any quota <= 1` plus any available reset could spend a model-specific reset against an unrelated exhausted quota.

### 3. Run on the desktop's current machine, not in a new service

The coordinator runs on the computer running the open Herdr desktop. Extend Usage's plugin lifecycle with a yielded, coalesced collection owner for the selected active-space machine only when Automatic reset and Check usage are on. It must work even when Summary in sidebar is off, there are no pins and Usage is closed. Use existing ten-minute TTL/minute refresh scheduling and shared single-flight ownership rather than faster provider polling or a second collector. The existing mounted-view path joins the same work. Settings' explicit Refresh still targets its captured header machine for display, but cannot trigger automation for a machine other than the active-space machine.

Provider collection and reset execution use existing `exec(..., {on: capturedMachine})`: this computer locally, a ready connected remote machine over the current transport. The trigger never scans unselected machines. Window inactivity, sleep and app closure stop new automatic checks/claims; there is no daemon or replay queue. Return to active use requires a real target-machine read before spending. A submitted provider request may finish after closure and cannot be undone.

### 4. Spend only from newly witnessed, revalidated evidence

Evaluate candidates after a current successful collector completion, not during render, on a timer reading persisted caches, or from `reportDisplayable()`. Preserve provenance separately from display state: captured machine, exact account/organization, request and enable generation, real-read versus reuse, and receipt age. `checkedAt` added while publishing cached data is not enough.

A candidate requires current consent, enabled Usage/Check usage, active app, ready target machine, exact account, known reset coverage, current inventory and finite raw remaining percentage in [0, 1] on an applicable quota. This threshold does not depend on the Used/Remaining display setting. Failed accounts, overall failures, last-success values, future/invalid times, expired evidence, reuse and obsolete requests cannot trigger. An automatic candidate derived from reused display data waits for a genuine target-machine collection; keep normal display reuse intact.

Before the destructive request, recheck settings/generation/identity and have the target worker revalidate the captured account's quota, selected grant and coverage through its existing read helpers. Respect provider Retry-After; failed revalidation stops without spending or changing accounts. No newly collected replacement grant outside the selected type is allowed. This narrow extra read happens only for a candidate spend, not on every UI tick.

### 5. Use a durable admission receipt, not a view-local busy flag

Move claim arbitration to a common Usage controller used by manual and automatic paths. Use a private local reset-admission journal under the desktop Herdr home's `.customizations/usage/`, with exclusive Node file locking and atomic writes, following the worker's existing conservative lock/write patterns. Its account key is provider/account/organization across target machines: the same account's scarce resource must not get two admissions merely because two windows selected different machines. Machine and scope remain part of the captured receipt and consent checks. The journal holds bounded identifiers/hashes, quota-period/depletion facts, stable request ID and outcome, never credentials or raw provider responses; it is not synced or exported.

Reserve the account depletion durably before any provider POST. Storage/lock failure fails closed. One reservation covers all currently depleted overlapping windows, rather than one reservation per checkbox or grant. Deterministically choose one eligible checked type, preferring the narrowest proven scope, then earliest expiry and stable type order. Never run a Full reset/model-reset cascade from the same snapshot. Manual/automatic claims share the in-flight/reconciliation exclusion; ordinary manual confirmation remains unchanged.

Reuse the receipt's stable request ID in the existing provider request rather than generating a fresh one in each view. Provider idempotency is an additional safeguard, not a substitute for local exclusion. A timeout, malformed reply, refusal, process death or crash after reservation does not clear admission or initiate an automatic retry; releasing an abandoned process lock does not delete its spend receipt. Toggle cycling and restart do not reset a depletion. Corrupt, unsupported or capacity-exhausted journal state refuses new automation instead of evicting unresolved safety records.

Rearm only from later authoritative target-account evidence: all depleted windows recorded in the episode have recovered above 1%, or a proven new natural quota period replaces them after the original period has actually ended. A changed reset timestamp alone is not proof of a natural period, particularly after a reset. Recovery must postdate the attempt; then a later fresh depletion can receive a new receipt. Merely losing a grant, exhausting a busy lease, seeing a new inventory count, failing a refresh, or receiving still-low post-reset numbers cannot rearm. Conservatively blocking an ambiguous episode is preferable to consuming a second scarce reset. There is no automatic spend retry UI or option.

Alternative rejected: a Set in the Usage view, a cache TTL or a claim lease alone loses history across reload/restart and can consume successive grants on repeated low readings.

### 6. Share PR #107's continuation and use one existing-pattern receipt toast

Extract/reuse the existing claim-and-account-only-refresh continuation outside the dialog so both origins use the same action and guarded cache publication. Preserve its wait through a pre-reset collector's full 135-second lease and its captured epoch, machine and report. Keep automatic reconciliation from triggering another spend. Never set quota to full optimistically, modify pins/account inspection or refresh unrelated accounts.

On confirmed automatic `result: reset`, use host `notify({level: 'success', ...})` once, with a short title such as **Automatic reset used** and body identifying machine, provider, account and reset type. Deduplicate against the receipt; do not claim that quota refreshed unless the read succeeds. No new Settings/dialog success line, banner, button, tooltip or option. Manual reset success stays silent; existing explicit-reset errors remain unchanged. Non-success automatic outcomes use existing diagnostics/failure state, not new informational messages.

### 7. Focused fixtures and visual evidence only after approval

Cover pure consent/scope/threshold policy, the new declaration/checkbox rendering, current-versus-reused provenance, admission persistence/concurrency and the real scoped refresh flow. Use fake account stores and mocked provider reads/POSTs; never claim a real credit. Worker journal tests use a disposable home and actual concurrent child processes where needed. UI checks use synthetic providers in a disposable app, with screenshots and scratch only in the crew task folder, stopping every started instance before reporting.

Target existing Usage suites (`tests/regression/usage.test.mjs`, `usage-summary.test.mjs`, `usage-accounts.test.mjs`, `tests/usage-plugin.test.mjs`) and `tests/plugin-ui-contract.test.mjs`, adding focused policy/journal tests. Run only affected files/subtests and required fixture packaging, not the full local suite. Update README's Usage behavior, architecture lifecycle/state notes and the declarative UI contract in the same change.

## Risks / Trade-offs

- [Polling latency] → Automation acts at the next successful allowed read, not exactly when a running agent crosses 1%; retain current provider rate limits rather than promising real-time monitoring.
- [Unknown reset semantics] → Display provider-reported types but fail closed until scope can be established; never guess from labels.
- [Ambiguous request outcome or storage failure] → Persist admission and do not retry automatically. This can intentionally miss a reset opportunity, but cannot consume a second reset to resolve uncertainty.
- [Independent clients or desktops] → Provider availability/idempotency remains authoritative outside this installation; no new distributed service or cross-machine credential store is introduced.
- [Disablement after dispatch] → Recheck before submission and suppress obsolete follow-ups; an already-submitted irreversible provider action cannot be cancelled or rolled back.

## Migration Plan

Existing preferences normalize to Automatic reset off and an empty selection. No account receives implicit consent. Add only owned private journal files and explicitly mapped runtime/helper output as needed. Publish implementation through the normal feature-branch draft PR path; no live deployment during planning. Turning the toggle off disables future automation without deleting choices or safety receipts. Reverting code leaves receipts intact and preserves PR #107's manual refresh behavior.
