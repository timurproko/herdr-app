# Design

## Context

See proposal.md for motivation. `Usage.startClaim` captures the machine, submits one grant for the entry's account, and already calls `refresh` with `force`, `reportId` and `signedIn`. The store publishes version-5 machine-qualified caches through `setShared`; the summary reads the active machine's cache and its pinned report/window keys. Claude card refresh currently widens collection to all Claude accounts, whereas Codex uses a report-scoped collection.

The existing reset regression exercises a single view's card, successful transport and refilled bar. It does not assert automatic updates in a separately mounted sidebar view. The native shared-state contract says `setShared` rerenders all mods, so adding another force refresh or optimistic percentage assignment without reproducing the missing boundary would be speculative.

The new cross-view fixture exposed two concrete boundaries: Claude reset follow-up
was provider-wide rather than account-scoped, and a pre-reset collector lasting
over 60 seconds exhausted the retry loop before its 135-second loading lease
ended. The latter dropped the forced fresh read entirely. The implementation
uses an account-only refresh option and the existing lease duration for both
waits; reset continuations carry the original enable epoch.

## Goals / Non-Goals

**Goals:** Correct the smallest existing target/publication boundary that the cross-view regression exposes, retaining captured identity, shared cache ownership and native rendering.

**Non-Goals:** No changes to reset APIs, grant eligibility, confirmation, layout, informational text, account selection, native files or credentials. No new timer, watcher, refresh button, global refresh-all action or cross-machine cache propagation.

## Decisions

1. Extend the existing synthetic summary/reset fixture to keep distinct dialog and summary instances with their own props and machine contexts. Drive the actual confirmation, claim and follow-up collector path and observe summary updates on shared-state publication, not by manually requesting Refresh all. Include a second pinned account and another machine's cache. This distinguishes target mistakes from stale rendered presentation; the current single-card assertion cannot.
2. Keep authoritative collected reports as the sole source of quota values. Correct reset follow-up scope/publication within the Usage controller/store; never hard-code a 100-percent refill because model-specific grants may clear only some windows. Preserve ordinary Claude provider-refresh behavior outside the reset-specific path.
3. Retain existing single-flight, timeout, Retry-After and enable-generation guards. A completion belongs to the captured machine/account even if the dialog picker changes. Existing failed-read presentation remains authoritative rather than promoting retained numbers to a successful refill.
4. Use only targeted fixture tests. The intended implementation checks are a rebuilt packaged `scripts/usage-summary.test.mjs` and `tests/usage-plugin.test.mjs`, plus the account fixture only if collector filtering changes. No real reset credits, credentials or live sessions are needed.

## Risks / Trade-offs

- [A synthetic reproduction may not cover every native cause of stale presentation] → The regression demonstrates lost post-reset collection and account replacement using independent VMs; native-only repaint behavior is not claimed as independently validated.
- [Synthetic shared-state behavior differs from native mod snapshots] → Model separate props/context and shared publication explicitly; if native-only behavior remains, request focused disposable UI evidence rather than modifying native internals.
- [A provider reset only clears selected windows] → Publish the returned authoritative windows rather than inventing quota values.
- [A late reset/read can outlive selection or enable changes] → Keep request and plugin-generation checks and assert isolation from unrelated caches.

## Migration Plan

No preference or cache schema migration is expected. Use the normal source build/publication path after approval; reverting the focused Usage correction restores prior behavior without changing stored pins.
