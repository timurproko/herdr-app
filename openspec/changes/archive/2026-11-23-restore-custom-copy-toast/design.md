# Design

## Context

See proposal.md for motivation. Current `main.js` has PR #12's guarded synchronous clipboard observer but calls `notify` and always renders an empty div. Revision `42d2325` contains the requested private renderer together with the old startup latch and PowerShell clipboard polling; restoring that file wholesale would regress the fix.

The layout already mounts a zero-size floating observer at `edge: bottom, align: center`. The historical popup anchors at `bottom_center`; its opening comment incorrectly says bottom right. Use actual historical render/layout geometry, not that comment: “centered” means the existing bottom-center placement, not a new vertical-center redesign. `customization.json` already packages `ui.js` for this mod.

## Goals / Non-Goals

**Goals:** Restore presentation while retaining the current observation state machine and its Windows-only, best-effort contract. Add deterministic coverage of the newly restored presentation and animation lifecycle.

**Non-Goals:** Native copy-completion detection, broader platform support, changes to standard notifications, deployment or live clipboard/session operations.

## Decisions

1. **Transplant only the old presentation.** Restore `Popup` from `gpui-base`, terminal font resolution (`font_family`, then `font`), `U.meta`/`U.radius`, white text, `t.popover`/`t.border`, 10px horizontal and 4px vertical padding, 1px border, zero-size anchor, and original popup IDs/wording. Restore 16ms arming, 180ms ease-out opacity/top motion with 6px offset, and 2000ms visible hold. Repeated completed copies update the same popup and renew its lifetime, as before. Reject both a whole-file rollback and a new themed notification abstraction because each changes unrelated behavior.
2. **Keep the observer as fixed in #12.** Retain render-time window/settings subscriptions, fresh clipboard baseline when eligible, selection/focus/tab/generation callback guards, 300ms settle, 400ms bounded retries, immediate return after either show or same-text inference, and `cx.read_from_clipboard()`. Remove the standard notification import/call rather than using it as a fallback. No PowerShell or asynchronous clipboard process is needed for rendering.
3. **Give presentation its own cancellable lifetime.** Keep popup timers distinct from selection-check timers. Close or loss of eligibility hides the popup and invalidates queued animation callbacks; repeated shows supersede prior lifetime callbacks. Render only in the captured source tab. A new selection may replace pending observation without accidentally canceling an already-visible legitimate popup.
4. **Extend the existing VM harness, not live operations.** Stub chainable div nodes, `Popup`, theme, UI tokens and `cx.notify` so assertions inspect the returned tree and deterministic phase transitions. Make host standard `notify` fail if used. Retain all existing controller tests, changing standard payload checks to custom show/render assertions. Add font fallback, geometry/colors, source-tab suppression, animation timing, repeated-show refresh, disable/close cleanup and already-queued stale animation callbacks. No JavaScript frame loop or real clipboard is required.
5. **Document the same boundary.** README and docs/TESTING.md describe the custom centered terminal-font popup and what fixtures do and do not prove. The OpenSpec delta replaces the standard-toast requirement while preserving every existing lifecycle and inference scenario.

## Risks / Trade-offs

- [A full rollback reintroduces permanent cold-start disable and subprocess reads] → Keep #12's observer and transplant presentation only.
- [Canceled animation callbacks may already be queued] → Use presentation lifetime guards in addition to timer cancellation; exercise them with fake timers.
- [Held drags or unrelated clipboard updates can resemble copies] → Preserve the documented best-effort limitation; do not promise shortcut-copy coverage.
- [Synthetic tree assertions do not establish native pixels] → Compare renderer details to `42d2325`, run focused fixtures, and explicitly report that no live visual validation or deployment occurred.

## Migration Plan

No migration or installation is part of this task. Source changes remain on the draft PR; restoring the prior source commit rolls them back. Any later deployment or live visual check requires separate authorization.
