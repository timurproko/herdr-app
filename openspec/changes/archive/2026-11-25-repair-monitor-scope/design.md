# Design

## Context

See `proposal.md` for motivation. Source inspection confirms:

- `monitor-actions.js` reads `custom.git.webhook-state.members`; `actions.js` deliberately clears those notice facts after Add/Remove, Configure and credential creation.
- `added-repositories.js` already provides durable confirmed rows via `addedRepositories(scope)`, keyed by `relay|lowercase GitHub login`. Add/Remove updates these before clearing notices. Missing/mismatched records return null; confirmed empty records return an empty array.
- `ensureMonitors` fingerprints configuration on the existing `sidebar.sync` lifecycle, coalesces host updates and provisions missing/outdated owned packages. Explicit setting hooks currently omit relay/GitHub-account changes.
- `tools/core-ci-monitor.mjs` independently builds scope from legacy fields and notice members; it must agree with the runtime path rather than reintroduce a bad allowlist during explicit updates.
- `CoreCIMonitor.cycle` silently returns for empty scope and skips unselected targets. `monitor-runner.js` unconditionally overwrites successful cycles with `health:ready`; its report callback retains only the latest event.
- Existing receipt claims and delivery outcomes already protect unchanged CI, conflicts and merge cleanup. Owner resolution remembers the oldest local live PR owner; several matching agents do not all get messages.

## Goals / Non-Goals

**Goals:** Use the existing confirmed selection as the sole monitor scope and prove propagation into written worker config. Make intentional waiting/suppression and delivery evidence inspectable locally, without changing delivery decisions.

**Non-Goals:** No live deployment, app restart, saved-setting rewrite, task installation, real sends, new desktop scheduler or UI. No state-selection change, early failed-job alerts, template edits, receipt migration, ownership changes, coordinator messages or global cross-host deduplication.

## Decisions

### 1. Read confirmed selection, not disposable observations

In `monitorConfig`, derive the exact current relay/GitHub-account scope and use names from `addedRepositories(scope) ?? []`. Lowercase/deduplicate and retain current repository validation/size limits. Missing account/relay identity, wrong scope or an empty confirmed selection yields no repositories. Never fall back to `repository`, `ciMonitorRepositories`, another account or notice members.

Keep scope projection reusable by the explicit management CLI, preferably as a small pure helper accepting public settings and the durable record, with the existing added-list accessor remaining the runtime authority. Both consumers must have fixture parity. Do not import native plugin APIs into Node management tooling.

Alternative rejected: repairing `updateNoticeState` to retain membership. That cache is intentionally invalidated and is not authoritative selection. Alternative rejected: legacy fallback, which can resurrect removed or cross-account targets.

### 2. Reuse the existing synchronization lifecycle

Retain `sidebar.sync`/`ensureMonitors` for startup, code replacement, connected-host changes and confirmed Add/Remove changes. Ensure its fingerprint reflects durable selection and scope identity. Include relay/GitHub-account setting changes in existing explicit synchronization hooks so scope mismatch revokes reachable worker targets promptly. Configure/credential invalidation must never transiently write an empty config for unchanged scope.

Use synthetic plugin-action tests to drive Add/Remove/Configure and credential invalidations, not only edit in-memory rows. Exercise installed configuration writes through `monitor-host.cjs` with disposable roots and fake task/Core/GitHub APIs. Restart fresh module/engine instances to rule out accidental dependence on ephemeral caches. No persisted desired-state job or new timer is introduced.

### 3. Summarize monitoring truthfully and journal sanitized reasons

The engine will report explicit suppression reasons at existing decision points, with repository, PR and terminal where verified. Include no monitored repositories, agent state not selected, workflow still running and already sent; preserve existing delivered/refused/unknown events. Unknown or attempted receipts mean already recorded, not confirmed successful delivery.

Expose cycle summary counts/reason sufficient for the runner to report a non-ready waiting/suppressed state when enabled scope is empty, no targets are found or every candidate is skipped. A verified no-action/waiting cycle is not an infrastructure failure. Verification failures remain unavailable rather than being overwritten with ready. The CLI status projection must preserve the relevant diagnostic reason/counts, not just a running task flag.

Add `diagnostics.json` beside existing worker state: versioned, atomic, at most 128 sanitized records and 64 KiB, coalescing repeated unchanged reason episodes. Entries carry timestamp, outcome/reason and nullable repository/PR/terminal. Bound and validate fields; omit raw command output, templates, transcripts, paths and credentials. Keep this separate from `history.json` and `owners.json`: diagnostics cannot claim, release or replay receipts. Diagnostic writes are best-effort and must not interrupt normal verification/delivery. Probes collect reports in memory only.

Alternative rejected: toast/panel markers or a new status watcher. Alternative rejected: making diagnostic history the duplicate receipt store, which would change safety behavior and retention.

### 4. Correct only contradictory touched guidance

Update `GIT-CI-FIX.md` and `GIT-WEBHOOKS.md` to distinguish independent companion delivery from shown-panel CI presentation, document completed-workflow timing, current message types/templates and remembered ownership, and describe local diagnostic outcomes. Update companion guidance where scope, ownership or diagnostics would otherwise contradict these changes. No new message content is authored.

## Risks / Trade-offs

- [Confirmed selection absent or belongs to another account] → Stay empty and explain it; never infer authorization from visible PRs, legacy preferences or cached notices.
- [Offline managed host retains its prior configuration] → Preserve existing explicit sync failure reporting and document that desktop-side revocation cannot reach an offline host.
- [Suppression repeats every minute] → Coalesce unchanged episodes and cap entries/bytes; diagnostic failures do not affect delivery.
- [All-skipped status confused with broken infrastructure] → Separate waiting/suppressed summaries from unavailable verification and actual send acknowledgement; tests cover both.
- [Two configuration producers diverge] → Use a shared pure scope projection where practical and assert runtime/CLI fixture parity.
- [Existing exactly-once claim is host-local] → Retain receipt semantics and document that separate hosts still have separate journals.

## Migration Plan

After a normal authorized customization update, existing enabled preferences and confirmed added repositories should take effect through mounted startup/code-reload lifecycle: **no preference re-save and no desktop/agent restart**. The normal guarded lifecycle updates reachable owned companion packages and synchronizes corrected scope; already-closed desktops must run the updated desktop once, and offline hosts must reconnect. Synthetic code-replacement/startup and installer tests must establish this before the implementation report states it as delivered behavior.

No live app, settings, task or monitor state will be touched to test activation. Preserve all existing receipt and owner files during package replacement. Rollback is the existing guarded source deployment/package lifecycle; do not delete live runtime state to roll back. No executable change is made until this plan is approved.
