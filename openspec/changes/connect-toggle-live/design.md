# Design

## Context

See proposal.md for motivation. The source already writes the preference synchronously in the switch callback: `spaces-ui.js` calls `updateSpacePreferences` and notifies Settings. The setter writes `custom.spaces.preferences`, clears fleet read/link caches on transitions and clears durable display on disable. There is no deferred Settings-close save in this path.

Attachment discovery currently starts from Crew's `spaces.refresh` and `workspace.context.refresh` events. Mounted Spaces emits the former at init and from its 250 ms lifecycle callback, not directly from the preference callback. Crew yields before verification and guards completion with the shared preference generation. The installed public SDK says `setShared` re-renders every mod; therefore the observed delay must not be explained away by assuming shared writes are silently local. The exact missed invalidation/lifecycle boundary still needs a reproducing trace before selecting the smallest fix.

`tests/fleet-preferences.test.mjs` checks a switch callback and saved boolean, but does not mount a separate sidebar or assert its rows. That test cannot detect this report. Existing fleet refresh tests cover persistence and stale replies and must remain valid.

## Goals / Non-Goals

**Goals:** Repair the preference-to-mounted-consumer lifecycle, retaining generic plugin boundaries and exact verified identity. Exercise the real Settings callback and separately mounted Spaces instance with Settings open.

**Non-Goals:** Native changes, new refresh timers, optimistic pair inference, changes to fleet ordering commands, portable identity persistence, forced focus/restart or unrelated toggle redesign.

## Decisions

### 1. Fix the demonstrated invalidation boundary, not a close handler

Trace preference publication, sidebar repaint and verification start/completion during a mounted-dialog reproduction. Use the shared value as truth. If the missing step is verification scheduling, emit the existing generic workspace refresh moment from the switch event and preserve Crew's yielded read path. If the missing step is mounted-consumer reconciliation, repair that consumer's preference-change invalidation using the supported host lifecycle. Do not add an unconditional repeated notify, a new polling loop or a dependency on dialog close. This keeps the repair at the cause rather than disguising it with arbitrary delays.

### 2. Preserve verification and generation safety

Enable initiates needed reads for all relevant ready machine groups through Crew's existing discovery/coalescing path, rather than only the selected Settings machine. Do not fabricate attached rows from names or role labels. Publish the completed verified pair into the existing display projection so order, numbering, chain and colour change together. Disable immediately removes attachment and invalidates pending enable-time results. Keep the existing persisted-display retention and action-verification distinctions.

### 3. Keep render pure

UI callbacks and yielded lifecycle work own changes, reads and notifications. Sidebar rendering only projects current preferences and verified display identities. No `cx.focus_handle()` or `cx.notify()` during render; assertions must fail on either call there. Moving focus or closing/reopening Settings is not an acceptable update mechanism.

### 4. Audit sibling switches without widening scope

Both last-tab switches use the same synchronous preference setter. Confirmation reads preferences when a close is requested; empty-space reconciliation reads them in its existing 250 ms lifecycle. Inspect these paths with Settings open and document whether the shared propagation boundary also delays them. Change their code only if the same reproduced cause applies, preserving existing automatic-space and process-exit rules.

### 5. Model separate mounted consumers in regression coverage

Drive the actual Settings switch callback and mounted Spaces row projection through distinct module instances sharing a host fixture. Assert native-order-independent projected row IDs/numbers, coordinator chain and badge fills before enable, after verification, after disable and after re-enable, with no close callback. Cover local and remote pairs, a deferred read, enable-then-disable with a late reply and verification failure. Do not replace production projection with a test-only imitation.

## Risks / Trade-offs

- [SDK mocks may overstate cross-mod reactivity] → Model the documented host invalidation and capture the missing native lifecycle evidence rather than claiming a boolean-only fixture proves repaint.
- [Extra event creates duplicate reads across mod copies] → Reuse the existing shared read lease, generation guards and yielded Crew refresh path.
- [Pending verification attaches the wrong space] → Retain exact same-machine identity validation and atomically publish only successful evidence.
- [An apparent preference fix accidentally changes close semantics] → Audit sibling consumers and limit changes to a demonstrated common cause.

## Migration Plan

No preference schema or data migration. After approval, implement the two outcomes in order, add the mounted regression, run targeted checks and the requested `CI=true npm run test:ci` once. Read required checks on the final implementation head and report their actual state; do not mark the PR ready or merge. Reverting the source fix restores the old lifecycle without rewriting user preferences or pair identities.
