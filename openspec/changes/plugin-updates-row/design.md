# Design

## Context

See proposal.md for the replacement design requested for PR 115. The current branch still renders `pluginUpdateSection` after the Herdr explanation and retains the first implementation's scan-expiry fix. `customizationUpdateRow` already composes `owner.row` with `updateCheckSlot`; that is the visual reference, not a new section design.

`plugins-updates.js` owns connected pending facts, read tickets, a renewable 90-second discovery lease, and a finite sequential batch. Discovery currently publishes `nextCheck` and errors but no aggregate successful check timestamp. Per-plugin unknown results preserve pending facts; they cannot establish that every connected target is current. Existing notification readers use `pluginUpdateAvailable()` independently of Settings markup.

## Goals / Non-Goals

**Goals:**
- One pure row presentation over the existing shared facts, placed directly after Custom and before the unchanged explanation.
- Truthful checked-at and current feedback, without changing action transport or losing named failure evidence.
- Retained lease-expiry and retired-owner protection, including stale retained callbacks.

**Non-Goals:**
- A new batch executor, scheduler, native patch, details panel, per-machine UI, tooltip, setting or provisioning path.
- Replacing the Custom updater's durable receipt/recovery system or extending it to plugin writes.
- Changing notification predicates, portable preferences or ordinary Plugins page actions.

## Decisions

### Reuse the existing row and check slot

Replace the section renderer with a plugin update row, with title `herdr-app-plugins`, shared description styling and the same fixed action slot as `customizationUpdateRow`. Compose it in `main.js` immediately below Custom; keep one unchanged explanation below all four rows. Remove section-only wrappers and per-machine rows. Rename the renderer/output mapping if appropriate so source and packaged names describe a row.

Keeping a hidden/conditional section was rejected: the row must remain visible when current and provide Check now.

### Project concise state outside the renderer

Use a pure presentation model to select description, action, label, current feedback and enabled state from a single snapshot plus captured runtime context. Status priority is active update progress, unresolved/failed batch outcome, active discovery, confirmed pending availability, failed/unknown check, then verified current or not checked. Preserve known pending update and failure evidence across a refresh rather than briefly claiming current.

Group availability by plugin and machine using the existing inventory order, with short sentence punctuation. Use the same description area for progress and results, with actionable machine failures taking priority over success details. Bound summaries for the ordinary one- or two-line presentation; do not add rows, controls or a parallel details block to fit large inventories.

### Record aggregate check completion truthfully

Extend runtime-only discovery metadata with attempted/completed and successful checked times, and enough aggregate result classification to distinguish complete known evidence from partial/unknown checks. Only a current owner completing the connected inventory and applicable checks can publish a new successful completion time. A missing tool is known absent, not a pending installation. Failed/unknown checks retain last-known availability but do not renew current confirmation or claim a successful new check.

A batch's completed authoritative rechecks can establish the current result for its selected targets; reconcile against all connected pending facts before showing aggregate current. Incomplete, failed or uncertain outcomes retain their short failure status, not a refreshed all-current timestamp.

### Keep explicit action dispatch and expiry guards

Check now invokes `refreshPluginUpdates` with explicit force through the existing discovery path. Update invokes `updatePlugins` unchanged in local-first sequential policy and per-plugin safety. Re-read current presentation at click time so retained nodes and duplicate pre-paint clicks cannot dispatch the wrong action. Disable actions only for an unexpired scan, current batch or ordinary plugin fix, with existing closed/checking guards retained.

Reuse the existing check-feedback helper and the existing Settings feedback cadence for the recent successful-check indication; do not add a new timer. Expired scan metadata must not sustain Checking, block an action, or allow late obsolete publication. Notification-dot readers continue using their existing confirmed-pending predicate.

## Risks / Trade-offs

- [Partial discovery might look current] -> distinguish successful complete checks from unknown provider results and cover failed-first/failed-recheck cases in controller and row fixtures.
- [A compact status could bury a failure behind successes] -> prioritize named failures/uncertainty and use concise grouped outcome summaries in the single existing description area.
- [A new row changes native fixture row counts and anchors] -> update real Settings/marker coverage to require four rows and the unchanged explanation beneath them, without a Plugins heading or block.
- [Expired metadata or a retired owner could strand actions] -> retain real-controller owner-retirement tests with before/exact/after expiry and stale-callback checks.

## Migration Plan

No persisted preference or receipt schema migration is required. Existing shared metadata without a successful aggregate timestamp renders not checked rather than inventing currency. The existing discovery/batch facts remain usable. Update README, docs/PLUGIN-UI.md and docs/TESTING.md in the same implementation outcome, and run only the touched row/controller/marker tests plus any directly affected check-feedback fixture. No live installation or native process operation is part of this change.
