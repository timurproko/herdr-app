# Design

## Context

See proposal.md for motivation. The source already writes the preference synchronously in the switch callback: `spaces-ui.js` calls `updateSpacePreferences` and notifies Settings. The setter writes `custom.spaces.preferences`, clears fleet read/link caches on transitions and clears durable display on disable. There is no deferred Settings-close save in this path.

Attachment discovery currently starts from Crew's `spaces.refresh` and `workspace.context.refresh` events. Mounted Spaces emits the former at init and from its 250 ms lifecycle callback, not directly from the preference callback. Crew yields before verification and guards completion with the shared preference generation. The installed public SDK says `setShared` re-renders every mod; therefore the observed delay must not be explained away by assuming shared writes are silently local. The missing boundary is the preference event itself: there is no direct discovery trigger there. The mounted-dialog fixture fails before the fix with zero reads for both machines after draining all shared invalidations; only a later Spaces lifecycle event can start them. After emitting the existing generic refresh event from the switch, the same fixture starts both reads and renders the attached rows without advancing a timer or closing Settings.

`tests/fleet-preferences.test.mjs` checks a switch callback and saved boolean, but does not mount a separate sidebar or assert its rows. That test cannot detect this report. Existing fleet refresh tests cover persistence and stale replies and must remain valid.

Native baseline evidence on installed App 0.1.17 narrows the claim: disabling detached immediately with Settings open; enabling had a saved true preference and active read lease while still independent at one second, then showed the chain/shared colour/attached order by seven seconds with the same dialog still open and no errors. Thus a hard close-only repaint freeze was not reproduced on this run, and verification latency must not be called a failed repaint. The repair removes reliance on the next sidebar lifecycle tick; it does not claim to eliminate the bounded Crew verification read. Screenshots and selective state observations are kept under ignored `.artifacts/`, not committed as private UI data.

## Goals / Non-Goals

**Goals:** Repair the preference-to-mounted-consumer lifecycle, retaining generic plugin boundaries and exact verified identity. Exercise the real Settings callback and separately mounted Spaces instance with Settings open.

**Non-Goals:** Native changes, new refresh timers, optimistic pair inference, changes to fleet ordering commands, portable identity persistence, forced focus/restart or unrelated toggle redesign.

## Decisions

### 1. Fix the demonstrated invalidation boundary, not a close handler

Emit the existing `workspace.context.refresh` plugin moment immediately after changing the fleet preference in the Settings event callback. Crew already yields before reading, so it can safely verify all relevant machines even with inline spawn. Shared publication already repaints the sidebar, as native disable demonstrated; no extra repaint machinery is needed. Do not add an unconditional repeated notify, a new polling loop or a dependency on dialog close. Other switches do not emit this fleet-specific lifecycle event.

### 2. Preserve verification and generation safety

Enable initiates needed reads for all relevant ready machine groups through Crew's existing discovery/coalescing path, rather than only the selected Settings machine. Do not fabricate attached rows from names or role labels. Publish the completed verified pair into the existing display projection so order, numbering, chain and colour change together. Disable immediately removes attachment and invalidates pending enable-time results. Keep the existing persisted-display retention and action-verification distinctions.

### 3. Keep render pure

UI callbacks and yielded lifecycle work own changes, reads and notifications. Sidebar rendering only projects current preferences and verified display identities. No `cx.focus_handle()` or `cx.notify()` during render; assertions must fail on either call there. Moving focus or closing/reopening Settings is not an acceptable update mechanism.

### 4. Audit sibling switches without widening scope

Both last-tab switches use the same synchronous preference setter. `closeWithConfirmation` reads preferences when a close is requested; `reconcileSpaceStarts` reads them in its existing 250 ms lifecycle. Neither depends on fleet discovery or a Settings-close callback. The mounted fixture checks immediate saved values without new fleet requests; the existing close/lifecycle fixtures exercise consumers. No production change to either sibling is needed.

### 5. Model separate mounted consumers in regression coverage

Drive the actual Settings switch callback and mounted Spaces row projection through distinct module instances sharing a host fixture. Assert native-order-independent projected row IDs/numbers, coordinator chain and badge fills before enable, after verification, after disable and after re-enable, with no close callback. Cover local and remote pairs, a deferred read, enable-then-disable with a late reply and verification failure. Do not replace production projection with a test-only imitation.

## Risks / Trade-offs

- [SDK mocks may overstate cross-mod reactivity] → Model the documented host invalidation and capture the missing native lifecycle evidence rather than claiming a boolean-only fixture proves repaint.
- [Extra event creates duplicate reads across mod copies] → Reuse the existing shared read lease, generation guards and yielded Crew refresh path.
- [Pending verification attaches the wrong space] → Retain exact same-machine identity validation and atomically publish only successful evidence.
- [An apparent preference fix accidentally changes close semantics] → Audit sibling consumers and limit changes to a demonstrated common cause.

## Migration Plan

No preference schema or data migration. After approval, implement the two outcomes in order, add the mounted regression, run targeted checks and the requested `CI=true npm run test:ci` once. Read required checks on the final implementation head and report their actual state; do not mark the PR ready or merge. Reverting the source fix restores the old lifecycle without rewriting user preferences or pair identities.
