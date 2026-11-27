# Design

## Context

See proposal.md for motivation and specs/plugin-integrations/spec.md for observable behavior.

Observed implementation:

- `src/plugins/crew/project-kinds.js` supplies workflow/Delivery workflow before plain/Plain and gate/Gate. Wire values and capability version must not change.
- `src/ui/settings-kit.js::optionDropdown` uses one persistent 150px trigger for quiet and revealed modes but explicitly right-aligns row text and enables truncation. The separate Remove rail is 80px.
- `src/features/settings/plugins-ui.js::listRow` includes trigger/menu/Remove native focus in reveal. Selection restores trigger focus; Escape does likewise in the kit. That can leave pointer-origin focus masquerading as intentional keyboard reveal after dismissal.
- `reloadPlugins` spawns every plugin/group check; `registry.js::checkPlugin` uses Promise.all within each group. Crew tool checks add more fan-out. `once` memoizes facts within a context only, while Requirements and Projects deliberately get separate contexts.
- Crew's `on` calls `hc exec` directly through the facade. No matching 16-exec limit or refusal text was found in this customization's source. This locates the capacity failure downstream of these checks, but does not yet prove which native layer owns the exact limit.
- `src/plugins/usage/mod/main.js::hint` uses `HoverCard` with a 400ms open delay, 100ms close delay and `hintTable` from `src/ui/panel-kit.js`. The helper already lays out left-aligned columns on the shared menu surface, so the aligned table is feasible without a dotted-row fallback.
- Settings' only explicit solid inline-link underline found is `plugins-ui.js` descriptionLinks, used by Trello's real HTTPS **API key and token** link. No hover-only solid-underlined Settings text was identified in the inspected source; report this rather than changing unrelated controls.
- `project-kind-set.js` already gates capability and validates captured home/name/path/kind acknowledgement. Its home-owned error text, not a separate app-side coordinator check, supplies the sentence the brief rejects.

## Goals / Non-Goals

**Goals:** Preserve shared declarative rendering and transport boundaries; distinguish current pointer/keyboard intent from native focus restoration; treat execution capacity as pending work instead of setup failure; preserve authoritative machine-scoped data and no-replay guarantees.

**Non-Goals:** No native cap increase or native code edits, app deployment, real-home reads/writes, live coordinator or SSH interaction, new kind preference, ownership bypass, task changes or replacement of the Plugins UI architecture. No changes to existing unrelated underline styling.

## Decisions

### 1. Fixed kind text anchor, not a separately rendered quiet label

Keep the persistent dropdown trigger and reserved columns. Remove row-specific right alignment, reserve enough nonshrinking content width for the longest new caption, and avoid truncating row kind text. Preserve text padding and chevron space in both quiet and revealed modes. Change only presentation labels/order to Plain, Delivery, Gate; `workflow` remains the wire value. Reject per-caption widths because they move text during hover and break the common column.

### 2. Reveal tracks input intent and real current focus

Keep an open popup revealed when the pointer leaves. On selection, Escape and backdrop dismissal, explicitly retire popup reveal/focus ownership; preserve real keyboard navigation with modality-aware restoration rather than unconditionally interpreting restored focus as keyboard intent. Trigger and Remove must remain reachable by Tab and usable with Enter/Space. Do not simply remove focus support or depend on a later mouse-leave event: dismissal may occur after the pointer has already left. Test each close path, pointer still present, movement to a second row, keyboard-only operation, and late/machine-replaced callbacks.

### 3. Declare inline information rather than importing UI into Crew

Add a generic optional list-description hint declaration carrying label, column headings and rows. Crew owns only the text. Settings/kit owns accent placement, dashed underline, persistent keyboard focus target, no-op click and HoverCard rendering using the existing shared hintTable styling. Keep real descriptionLinks unchanged and dropdown options tooltip-free. Reuse/package the shared helper correctly; if exposing it through a common module is needed, do not copy its markup or introduce a plugin-specific renderer branch. Tooltip headers are not a Projects column header.

### 4. Admission and batching, not exception suppression

Add a bounded Settings request admission path at the shared plugin transport boundary, with a conservative active limit and captured liveness checks before dispatch and after waits. Settings groups also need bounded start fan-out so expensive probes do not all begin together. Avoid globally serializing unrelated Git/fleet work or changing their established lifecycle contracts.

Trace the exact refusal in public pinned Herdr App/Core source during implementation, recording source/version and whether a configurable public cap exists. No runtime saturation experiment is allowed. If native, leave its cap unchanged and report that it cannot be raised within this customization boundary. App-side admission must still tolerate unrelated native callers consuming slots: recognize only the confirmed structured pre-start refusal (and an exact legacy form if required), delay with capped backoff and recheck liveness before retry. Do not classify arbitrary process stderr mentioning concurrency as a safe retry.

Known read checks may wait/retry while retaining presentation. Command deadlines start on actual admission; repeated contention retains pending state with capped retry delay and terminates on context retirement. Limit each native attempt with existing timeouts and avoid a tight loop. Never replay an ambiguous submitted mutation; the setter's uncertainty/reconciliation contract stays intact.

Batch Crew's read-only tool/platform/hook inventory into one bounded machine command for the tool list, retaining per-tool result interpretation. Reuse round facts across sibling groups only when the same captured machine/session/check epoch proves compatibility; avoid a persistent status cache or a cross-context promise retaining a dead native task. Keep explicit Requirements Check independent of slow Projects listing. Sharing benign probe facts must not share completion authority.

### 5. Pending is not a broken requirement

While checks queue or retry proven contention, retain same-context confirmed list rows and prerequisite results/badges. Show normal checking activity separately; never publish a temporary error/missing result that contributes a false to-fix count. Cold checks remain unknown/pending. Machine/session changes retire presentation and callbacks as today. Real unsupported, permission, connection, malformed-result and process failures still use actionable normal failure paths.

### 6. Crew owns coordinated kind application

Keep version-1 capability gating, the existing exact set-kind arguments, matching stored-value validation and authoritative reread. A supported success while a coordinator owns the home is just success; do not run ownership checks or display a warning. Map older `home-owned` replies to a short neutral line such as **Delivery kind was not changed. Refresh and try again.** without the forbidden direction to use another session. Preserve other refusals and uncertainty handling. No fallback to Add, configuration edits or automatic write replay.

## Risks / Trade-offs

- [Other mods/native clients can occupy all execution slots] → Admission plus exact pre-start refusal retry, not a claimed global semaphore over callers the app cannot control.
- [Native tasks can be abandoned on view teardown] → Bound admission ownership, use current-session guards, and cover fake cancellation/replacement so slots cannot leak indefinitely.
- [Queued checks could outlive their context or monopolize capacity] → Fair bounded starts, capped retry delay and liveness checks before every attempt; no rendering-side commands.
- [Focus behavior differs between pointer and keyboard dismissal] → Modality-aware tests for all three close routes and open-close-move, retaining keyboard accessibility.
- [A shared helper changes unrelated plugins] → Opt-in description hints/row choice styling and targeted declaration/legacy-row regressions.
- [Parallel Crew update is not yet installed] → Fake both successful coordinator-owned acknowledgement and legacy home-owned refusal; do not claim live interoperability evidence.

## Migration Plan

No persisted-state or wire-contract migration. Update current README/plugin UI guidance with implementation, leave archived specs untouched. Rollback is reverting the source change; no home, task, coordinator or deployment state is changed by this work. Local verification uses targeted fakes only; any disposable output belongs in the crew task folder. Stop disposable processes before reporting. Push through the repository's publication path and dispatch CI on the final draft head if application tests would otherwise skip, then report without waiting or polling.

## Open Questions

- Exact native cap provenance and availability of a public configuration knob remain unconfirmed from source. Resolving this only changes the diagnostic report and conservative admission value, not the chosen queuing/batching or no-native-edit approach.
