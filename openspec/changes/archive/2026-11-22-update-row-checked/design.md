# Design

## Context

See proposal.md for motivation. In Settings main.js, native Check now sets `this.asked = Date.now()`. The existing 300 ms timer refreshes this timestamp while `updates().checking` and clears it once its age reaches 3000 ms. Rendering shows disabled ✓ Up to date only while that timestamp is younger than 3000 ms and `u.checked` is truthy; busy feedback takes precedence. Thus expiry is based on the request timestamp as refreshed by busy ticks, not a separate timer started at completion.

The custom row already uses a 112px slot and owner.button, but customizationRowState only returns Check now or Update outside busy states. Its controller exposes pending, error and snapshot state; cached checks alone must not arm transient feedback.

## Goals / Non-Goals

**Goals:** One implementation of the existing native timing and slot/button presentation, used by native and custom rows with their respective request/busy/result state.

**Non-Goals:** No new feedback policy, persistent timestamp, worker behavior, deployment or live-home writes. Only the explicitly authorized stock source files are read from the installed home. Preserve native app/core shared-request behavior and all existing custom safety/availability predicates.

## Decisions

- Factor the native recent-request condition, existing timer maintenance and 112px slot/button markup into reusable Settings logic, then route both native and custom check actions through it. Keep native and custom request state scoped to the operations they actually run; do not let one check arm another row's confirmation. Reject a custom-only timeout or copied markup because these would create the parallel mechanism the request forbids. Package any extracted helper through customization.json.
- Only a requested successful current custom check qualifies: require a verified revision and successful current check, with busy, error, available-update and unknown-outcome states retaining precedence. Do not treat a cached success, retained availability or failed request as confirmation.
- Extend tests/update-row.test.mjs with a controlled clock, observable builder properties and timer callbacks to cover native/custom parity, disabled confirmation in the same slot, expiry to Check now and unchanged other states. Keep stale-click guards. Use only fixture VM checks and checkout-local build output.
- Preserve already-wired marker predicates and rendering; make native and custom availability share the same marker path on every surface. The missing compact popup Settings-entry marker will reuse the stock six-pixel accent circle, not a new badge design. Extend rendered VM coverage, rather than relying on the current source regex assertions, for all four native-app-ready/custom-available combinations on the expanded Settings icon, compact More trigger, compact popup Settings entry and Settings Updates navigation item. The expected result is native OR custom, so native readiness still lights a marker when Custom is current. Also cover Core-only readiness and the managed-Core exclusion in Settings navigation.

## Native marker inventory and existing Custom wiring

Read-only audit of the installed stock `frame/settings/main.js` and `mods/workspace-chrome/main.js`, compared with this checkout:

| Surface | Stock native behavior | Custom behavior before this change / action |
| --- | --- | --- |
| Expanded workspace footer Settings | App ready adds `div().size(6).rounded_full().bg(t.accent)` inline after Settings text | footerIcon already includes custom availability in source, but the maintainer reports NO visible dot on Herdr 0.1.16 / Custom b7e00d57 with Update available. Custom's icon-only adaptation uses top(2)/right(2). Predicate presence is not proof it works. Diagnose the existing path, not a second dot. |
| Collapsed workspace footer | App ready adds that circle on Settings at top(5)/right(6); ordinary Settings tooltip remains unchanged | Custom uses a More trigger instead of the stock Settings row; its existing top(2)/right(2) six-pixel accent dot already includes custom availability. Retain the existing native/custom-shared markup. |
| Compact More popup Settings entry | Stock workspace-chrome has no More popup | Custom menu currently has no availability marker for either native or custom updates. Add the same six-pixel accent circle to the Settings entry for native OR custom availability, keeping the existing More-trigger marker. |
| Settings left navigation Updates item | App ready OR unmanaged Core ready adds `div().w(7).h(7).rounded(4).bg(t.accent)` | Already adds custom availability to that exact predicate and exact marker markup. Keep it and add real rendered assertions. |
| Other badges/tooltips | Neither inspected stock file adds any update-dependent badge/count/tooltip or title marker; collapsed Settings has its normal Settings tooltip | No extra update tooltip, badge/count, per-section footer-shortcut dot or Configure-menu marker is required. Preserve ordinary tooltips and navigation. |

PR #7 contains the claimed predicates for the expanded footer icon, compact More trigger and Settings navigation, but the maintainer's real expanded-footer observation disproves the claim that predicate/fixture coverage established working delivery. The compact popup Settings-entry marker is missing outright. No installation repair is authorized.

## Availability delivery trace and unresolved real-app cause

- `CUSTOMIZATION_UPDATE_KEY` is `custom.customization-update`. Both Settings manual checks and chrome's mount/hourly checks execute the same `refreshCustomizationUpdates` function and publish `updateProjection(snapshot)` with `setShared` after worker replies; this is not an hourly-only writer. Failure paths also publish, retaining confirmed availability as designed.
- `customizationUpdateAvailable()` reads `shared` on every call, not once at mount. Both expanded footerIcon and compact render evaluate it; the checked-in Custom layout uses the same mod with `{footer:true}` for its footer and without props for its brand. Skipping the controller on the footer copy does not, by itself, prevent reading globally shared state.
- Settings' Updates sidebar and its custom row read this same shared snapshot within the same render. The row's Update action and availability helper both use `check.available === true`; there is no separate sidebar availability cache.
- The 0.1.16 SDK says every mod can see shared values and setShared re-renders every mod. Released `src/mods.rs` confirms one shared store and `set_shared` queues `Request::Refresh` on a changed value; `src/window.rs` handles that by refreshing every loaded mod root. Thus adding a custom polling/notification mechanism is not justified by the inspected host implementation.
- Existing sidebar-footer fixtures replace the availability helper with a boolean and directly call render after changing it. update-row fixtures use a synchronous Map and no cross-copy render scheduler; Settings navigation is only checked with a source regex. These tests cannot detect a broken real cross-copy publication/redraw or rendered visibility.

**Approved resolution and observed result:** The maintainer approved implementation without a speculative fix if the host-like VM path passes, with no native instance launched. The new fixture uses separate Settings/header/footer/menu VM contexts, JSON-marshaled shared values and changed-value publication dispatching queued root refreshes. It invokes the real Settings Check now callback and real controller/helper; no hourly callback, remount, availability stub or directly forced footer render is needed for the transition. Expanded footer, compact More trigger and Settings navigation all receive the manual publication. All native/Custom availability combinations, native-only/Custom-only marker equality and managed-Core navigation guards pass.

Running this harness against the pre-implementation source at cb9a07e fails specifically with markers `[true, true, false, true]`: only the More-popup Settings entry lacks its marker. The expanded-footer failure does **not** reproduce. Accordingly this change adds only the missing popup marker and leaves existing footer/navigation predicates and publication/redraw behavior unchanged. It does not claim to fix or explain the real-app missing-dot observation.

For the next natural occurrence after this PR advances main beyond the installed build, tools/inspect-update-markers.mjs and docs/COMMANDS.md provide a read-only capture of the already-running desktop: selected persisted shared/check facts before and after a screenshot, status/layout/zoom/errors, saved footer configuration/size overrides, configured colors and installed-source fingerprints. Tests use fixture homes and a mocked status/shot CLI, checking byte-for-byte home preservation. The tool explicitly reports last-render availability as unknown: Herdr 0.1.16's supported CLI does not expose mod trees, in-memory shared values or render timestamps, and disk state must not be misrepresented as that evidence. No native app or live UI capture was run during implementation; further runtime instrumentation, if these observations cannot distinguish the cause, remains separately authorized work.

## Risks / Trade-offs

- [Timing drift during extraction] → Exercise the exact 300 ms busy refresh and 3000 ms age boundary; do not replace it with a completion-based duration.
- [False success from retained snapshots or errors] → Cover fresh success, cache-only status, failure, unknown outcome and Update precedence in VM fixtures.
- [Native rendering regression] → Both native rows consume the shared markup without changing their native predicates, dimensions or disabled styling.

## Migration Plan

No stored-state migration. This task stops at source/tests and bot-promoted PR checks; deployment and live UI interaction are excluded. A later source revert can remove the change without runtime-data recovery.
