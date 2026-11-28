# Design

## Context

See proposal.md for motivation. The inspected implementation has three distinct concepts which must not be confused:

1. `src/shared/panel-state.js` stores per-tab sidebar visibility/view, reconciled by mounted Tabs through `syncPanelState`. It does not capture agent content. The unpinned default and `custom.panel.view` reopen hint are separate from the tab pins.
2. `src/plugins/files/mod/location.js` and `src/plugins/git/mod/location.js` independently resolve current native selection, the shown/peek terminal and `paneDirectory`'s live directory. Files has an important exception: a file-viewer tab retains the previous explorer source. Git additionally supplies explicit tab PR association and application identity. Git's aggregate already asks for provider context using `location().space`.
3. Git's selected PR row is also called a pin, but is unrelated to the header toggle. Its renderer, agent-link refresh, loading animation and native interruption recovery belong to concurrent PR #104 and are not this change's implementation surface.

### Current storage and restart behavior

The shared value `custom.panel.tabs` version 1 is `{default:{open,view},pins:{[qualifiedTabId]:{space,open,view}}}`. Calls use public `shared`/`setShared`; the SDK persists public shared values locally, as documented in docs/ARCHITECTURE.md. Existing pins therefore can survive restart if their qualified tabs still exist. They are excluded from portable preferences, but “runtime state” in the README does not mean memory-only. No directory, terminal, PR inventory or rendered tree is saved by today's pin. `custom.panel.view` follows only the unpinned default.

### Existing-spec contradictions requiring explicit replacement or qualification

- workspace-experience / Target-bound workspace operations / **Per-tab sidebar pin** explicitly promises per-tab choices that do not affect another tab. Replace this scenario: one held sidebar now spans all selections.
- plugin-integrations / **Space entry preserves order without pin motion** and **Selected-agent pin and remaining-section projection** require the current selected agent's PR to follow navigation or clear. While the header is held, “selected” for the sidebar must instead mean its captured effective source. Unheld behavior remains unchanged.
- plugin-integrations / **Agent navigation shares pin motion** requires stage/robot navigation to move the destination PR into the ordinary pinned slot. A held header is an exception: the action may navigate, but cannot replace its held sidebar source or animate into the destination.
- plugin-integrations' Files selected-machine, coordinator-selection, different-space invalidation and coherent-agent-entry rules otherwise imply following native selection. The added source-scope requirement explicitly qualifies those rules while held; actual effective-source replacement, plugin disablement, identity loss and authorization checks remain meaningful.
- README's per-tab explanation and docs/ARCHITECTURE.md's **Right-sidebar tab pins** section will be updated with implementation. The header pin is not a request to change GitHub PR selection rules when unheld.

## Goals / Non-Goals

**Goals:** Separate sidebar source from native focus, keep a single shared owner of pin state, retain acknowledged native layout projection and existing controls, and make restart and legacy behavior explicit.

**Non-Goals:** Static screenshots or frozen GitHub/filesystem facts, new refresh scheduling, portable pin preferences, PR/render cache redesign, native patches, Core document changes, terminal input, automatic navigation or a Git re-render fix.

## Decisions

### 1. Freeze the source, not a rendered tree

On the pin press, capture the context currently supplying the displayed panel: qualified machine/route, space, tab, shown terminal identity, directory and the location metadata required for Git association. Include Files' retained explorer source when a file viewer is selected; do not accidentally capture its mod pane or some background terminal. Keep the directory value captured at the press rather than following subsequent cwd changes.

Use a small shared context helper at the resolution boundary, consuming the existing directory/selection contract rather than importing a plugin implementation into shared code. The displayed panel's already-resolved context can be supplied to the capture boundary so Files' previous-explorer exception is preserved; any local resolver registration or snapshot must be synchronous/pure, and validated against current native selection at the event. Do not introduce shared writes, IO or notifications from `location()` or render.

While held, both `location.js` adapters return the captured effective context before considering the currently focused agent. With the header unpressed, their existing behavior, including file-viewer fallback and shown/peek rules, remains. Git's aggregate therefore continues resolving the captured coordinator space without changing its renderer. Existing Refresh, webhook and shown-panel updates may change facts within that source; this is a contextual hold, not an immutable snapshot of PRs or files.

**Alternative rejected:** Caching native elements or duplicating Git/Files inventories would create stale callbacks, unbounded persistence and direct coupling to PR #104. Pinning just a tab ID would still follow cwd and pane/agent changes and would not hold what is currently shown.

### 2. Replace the per-tab map with one versioned held record

Keep only `{version:2,default:{open,view}}` in durable `custom.panel.tabs`, retiring its per-tab pins. Store the one `{open,view,source}` held record in Herdr's cross-mod, in-memory `sessionStorage` under `custom.panel.session`. The existing file-header/reload bridge uses the same app-session facility; refresh mounted consumers through the existing window refresh API after event-time writes. `source` contains bounded validated location scalars only, never callbacks, native handles, credentials or inventory. Stable `files` and `changes` view IDs remain.

The pin's pressed state is independent of the currently selected tab. Explicit view or visibility edits while held update the single pin, not the default or source. Closing and reopening retain it. Unpin drops the held record and projects the ordinary shared default, resolving the current native selection immediately. Width stays native/global.

Per the approved revision, the held context does not survive an app restart: session storage starts empty, the pin is unpressed and normal current-agent following resumes. Reloaded mods within the same running session share the held record. Neither `setShared` nor portable preferences receive the source. Missing/offline source identity during the session cannot redirect to the new selection; existing empty/unavailable/last-good paths apply and Unpin remains usable. Do not auto-unpin within the session, guess replacement identities or add explanatory UI.

**Alternative rejected:** A map keyed by the active tab retains the old unwanted behavior. Module-only storage loses the hold when switching packaged mods; persisted shared storage would restore an unwanted pin after restart. Turning this into a portable preference would expose machine/session references and change scope.

### 3. Preserve captured-control and layout acknowledgement guards

Continue using `changePanel` and the existing yielded `syncPanelState` projection from Tabs. Update its desired choice to the global held choice when present, with plugin availability remaining a reversible projection. Do not schedule a new poller or replay layout commands from intermediate acknowledgements.

Pin clicks and title menus retain captured native-tab/store-generation checks so a stale callback cannot pin another agent, release a newer pin or retarget a changed source. A fresh title menu opened on another selected agent may change the held view, but never recapture its source. Both plugins disabled still hides the sidebar, preserving the record; explicit choices while fallback is active have the existing deliberate-choice behavior.

Keep the same Usage pin asset, 24px target, pressed fill/border and hover treatment. Change accessibility wording from “for this tab” to holding/releasing the sidebar. No tooltip, status line, button, setting or option is added.

### 4. Stay outside PR #104's implementation

Limit Git edits to `src/plugins/git/mod/location.js` and `src/plugins/git/panel.json`. Do not edit Git `mod/main.js`, `mod/agent-links.js`, render, loading or animation helpers, `tests/pr-agent-links.test.mjs` or `tests/features/git-refresh-native.mjs`. Preserve the location API shape so the unchanged renderer and its existing guards receive a stable source while held and an ordinary source change upon release. Stage/robot actions keep their existing live-target guards; location remains held after navigation, so destination settlement must not retarget the panel. Targeted fixtures must exercise this boundary. If it requires a renderer change, stop and report the coordination blocker rather than enter PR #104's code.

## Risks / Trade-offs

- [Legacy pins have no content source] → Retain the v1 default and migrate to `pin:null`; do not select one old map entry or fabricate its terminal/cwd. This deliberately retires prior per-tab pins once.
- [Files is currently retaining an explorer behind a file viewer] → Capture the displayed resolver result, not just raw native focus, and add an explicit regression before claiming source capture works.
- [Late async reads or stale controls] → Preserve existing request/enable guards, test held-to-live release and recapture, and compare captured pin/store identity on actions.
- [Dead source or cross-machine ID collisions] → Keep exact qualified source identities, refuse substitute terminal/provider authority, retain existing unavailable behavior and allow explicit release.
- [Holding a coordinator while navigating] → Resolve provider context from the held space, but retain independent current owner/home/membership verification; the pin is presentation scope, not a lease.
- [Native navigation may arm Git's existing pin-motion wait] → Test that a held effective location never settles into the destination or changes content. Do not modify its animation path to work around a discovered conflict.
- [Meaning of “freeze”] → Hold the captured source and selected view across navigation and cwd changes, while existing scoped refresh continues. No persistence of pixel-perfect or permanently stale content is proposed.

## Migration Plan

After approval, deliver the three outcomes in tasks.md in order. First implement v2 state, source capture, migration and existing control semantics with focused state/UI fixtures and architecture documentation. Then integrate Files source resolution and packaging with its regressions and README behavior description. Finally integrate ordinary/coordinator Git at its location boundary with Git and cross-view availability/compatibility regressions and the corresponding documentation. Each outcome includes its own tests and documentation.

Migrate valid v1 state only from a yielded lifecycle or explicit event. Unknown future versions remain untouched with pin mutation disabled. An older build encountering durable v2 must preserve it rather than reinterpret it; rollback resumes native unpinned behavior without a Core or preference rewrite. App restart always drops the session hold. Deployment is not performed as part of this planning task.

Planned targeted commands: `node --experimental-vm-modules tests/panel-state.test.mjs`, `node --experimental-vm-modules tests/panel-pin-ui.test.mjs`, `node --experimental-vm-modules tests/git-location.test.mjs`, `node --experimental-vm-modules tests/regression/files-location.test.mjs`, `node --experimental-vm-modules tests/sidebar-plugins.test.mjs`, and the existing panel-switch fixture plus a new focused held-context fixture as needed. Run only the fixtures actually affected, not the full suite. Native proof, if later authorized, uses a disposable fake-data fixture and is reported separately from build-only checks. No app instance or server is needed for this plan.
