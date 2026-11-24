# Tasks

## 1. Repeated fleet off/on toggles reattach after current verification while obsolete replies remain rejected

- [x] 1.1 Extend the packaged Settings/Spaces fixture to begin verified, retain the same module instances and shared state, then repeat off/on at 0, 1000 and 15000 ms with realistic delayed reads and existing timer callbacks; after its passing matrix reproduce the failure in disposable native execution and capture PR 44 diagnostics before runtime edits.
- [x] 1.2 Trace the failed sequence through preference generation, shared reader token/deadline, attempt TTL, identity signature and display publication; record the demonstrated cause and distinguish it from the recovered live expired-read observation in a checkout artifact.
- [x] 1.3 Replace the decoder's per-character allocations with bounded bulk decoding and give raw-reply processing a two-second lifecycle-owned deadline independent of finally; verify one-MiB replies and abandoned continuations in native and packaged execution without weakening generation/identity guards.
- [x] 1.4 Add repeated-cycle regressions for selected coordinator and fleet, one/seven workers, old successes and failures before/after the latest reply, local/remote groups and 0/1/15-second delays; assert obsolete replies cannot overwrite current facts and interrupted processing recovers at two seconds instead of 45.
- [x] 1.5 Preserve independent colours and row order on every off transition, shared colour and both chain markers after successful on verification, truthful native numbers, guarded action authority and unchanged native topology; verify through the real row renderer and focused existing fleet regressions.
- [x] 1.6 Prefer explicitly advertised Crew fleet-view status with narrow capability fallback and project legacy output before native decoding; exercise actual PowerShell projection, preserve historical Open/Draft eligibility, and document the expected separate Crew contract and legacy source-enumeration limit. Update testing documentation, run targeted/OpenSpec checks, then CI=true npm run test:ci only after confirming no other suite is running.
- [x] 1.7 Report final-head required-check statuses and any draft-related skipped checks without claiming they passed; leave the PR unmerged and never mark it ready, and document any unresolved reproduction or native-validation gap.
- [x] 1.8 Replace quadratic stdout/stderr collection with linear appends and one-pass projection; add real PowerShell 5k/20k/50k-line scaling and measure the full native transport-to-attachment path at 10 KiB, 400 KiB and one MiB/4096 tasks.

## 2. Enabled current coordinator verification uses standard loading without restoring cross-toggle inventory

- [x] 2.1 Route enabled current coordinator candidates to Loading immediately; remove cross-toggle provider/aggregate caches and clear inventory rather than restoring any previous list after off/on.
- [x] 2.2 Use the ordinary Git panel Loading bulb/text for empty verification, remove the special Verifying header, preserve Stale inventory treatment and keep sanitized diagnostics in existing indicator tooltips.
- [x] 2.3 Scope authoritative negative suppression to current dependency identity; cover completion-before-toggle Loading/fresh-only publication, changed-owner pending reads, slow/failed reads, existing Stale behavior and stale callback/IO refusal; retain the native Loading evidence and update specs/docs.
