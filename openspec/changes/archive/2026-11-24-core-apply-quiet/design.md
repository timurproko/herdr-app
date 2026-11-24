# Design

## Context

See `proposal.md` for motivation. All four supplied screenshots match Custom's `permissions.js` renderer and `main.js` footer composition; the fourth file is named `04].png`.

`coreChangeNotice` currently derives progress text from the shared operation. Apply first publishes an autostart job (Applying), then a relaunch job (Restarting). Status already renders Restarting for the latter. Footer mounting in `main.js` depends on `coreHasChanges`, so clearing the draft currently removes the footer entirely.

The fourth screenshot alone cannot establish elapsed disablement. Source inspection establishes a reproducible transitional cause: `pollPermissionRelaunch` publishes complete and starts `reloadPermissions`; that inspection sets `entry.loading`, disables Permissions/sign-in/Stop/Reboot, and retains cached pre-restart Running facts. There is no permanent latch in the normal success path: `finally` clears loading, but the bridge allows a 45-second inspection, so this need not be an imperceptible frame. The old facts can also temporarily preserve the old pending-change hint. This is a misleading completion/reconciliation state, not proof of permanently disabled controls.

## Goals / Non-Goals

**Goals:** Keep presentation quiet and stable; reconcile terminal operation state with verified runtime facts without a fake ready frame; make recovery timing explicit in asynchronous tests.

**Non-Goals:** Change restart execution, privileges, worker timeouts, polling cadence, native Herdr, other Settings editors or PR #40. Do not deploy or restart a live Core to validate a UI fix.

## Decisions

1. Capture the pre-Apply hint with the operation's machine/request identity and retain it through save, queue, restart and required reconciliation. Keep the original hint rather than blanking it during work: the user sees continuity and no duplicate progress. Idle/done has an empty reserved hint; failed edits return to their applicable draft hint. Preserve existing page errors independently. Old shared jobs without a captured hint must have a safe draft-derived fallback, never a progress label.
2. Keep Core's footer mounted at its existing height with a flexible left hint and fixed Discard/Apply buttons. They are disabled when clean. This deliberately prevents the current pending-only footer mount from resizing the content area when apply completes; other Settings footers remain unchanged.
3. Treat terminal job acknowledgement plus the necessary fresh inspection as one UI reconciliation interval. Retain the Status row's Restarting during apply reconciliation instead of declaring cached Running ready. Commit fresh facts, draft reconciliation and completed UI state together; release eligible controls immediately on that result. Do not simply ignore `entry.loading` or enable actions from stale facts. A failed inspection still clears the busy latch and surfaces the existing error, without claiming success or making unavailable actions safe.
4. Extend the existing mocked permissions harness with controllable promises and intermediate renders, not only its queue-draining helper. Assert save-in-flight, queued/restarting, complete-with-inspection-pending, fresh Running and rejected/unknown paths. Cover all four runtime controls, footer text and stable structural geometry; add a Settings composition assertion for footer presence through pending-to-clean. Keep cache/offline/unknown-permission and machine/request isolation regressions.

## Risks / Trade-offs

- [A retained hint is written in future tense while restart is underway] → This is the requested quiet reminder, not live state; Status is the single progress location.
- [Operation state completes before inspection or stale replies arrive] → Guard machine and request identity, preserve safety checks, and exercise delayed/replaced replies in fixtures.
- [A permanently reserved footer uses space while idle] → Reuse existing dimensions to avoid content and action movement; do not add another row.
- [Screenshots cannot prove duration or GPUI timing] → Report the source-backed transitional cause precisely; mocked tests prove state transitions, not live rendering or native session survival.
- [Draft CI skips hosted tests and the required aggregate] → Keep the PR draft as instructed, run the requested local CI suite after implementation, and report skipped/missing checks honestly rather than marking it ready.

## Migration Plan

No storage migration, new dependency or native patch. Add optional hint metadata compatibly for in-flight shared jobs. After plan approval, implement in the existing customization package and use the normal guarded deployment only if separately requested; rollback is a source revert followed by a separately authorized deployment.
