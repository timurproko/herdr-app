# Design

## Context

See proposal.md for motivation and specs/workspace-experience/spec.md for the behavior contract.

### Findings

- `src/features/copy-toast/main.js:32` permanently sets `off` if `window()?.platform` is not `windows` at init. The facade normalizes unavailable native window data to an empty object. Herdr 0.1.16 starts with a null window snapshot, synchronously loads layout mods during initial `sync`, and publishes window facts in the first render. The observer therefore treats transient unavailability as permanent incompatibility; later renders never read terminal selections.
- The same init guard permanently suppresses even explicit-copy feedback when copy-on-select is off. The observer only schedules on changed selection endpoints; unchanged repeated copies cannot trigger it.
- `model.js:copyDecision` assumes success when the clipboard stays unchanged after one retry. That cannot distinguish recopy from a held drag, failed copy, or unrelated clipboard contents.
- Native `TerminalView::select(Release)` calls the common `copy` routine when copy-on-select is enabled. Explicit `terminal.copy` reaches that same routine. `copy` obtains selection text, writes the clipboard, and returns true without raising a toast or exposing a copy event. Programmatic selection alone does not copy.
- The shipped terminal pane context menu has split/zoom/right-click-routing/close actions, not Copy. The reviewed palette and standard shortcut invoke `terminal.copy`; Custom's optional Ctrl+C broker queues the same native command.
- Files and Git copy actions explicitly call `notify({title:'Path copied', body:..., level:'success', timeout:3000})` after writing. The terminal observer instead draws a private zero-sized-anchor popup. A highlighted selection is not a notification source in the stock toast mod.

Native-source references are the read-only `herdrdev/herdr-app` tag `v0.1.16`: `src/mods.rs` (Snapshot default; publish_window), `src/window.rs` (new/sync/load and render), and `src/terminal.rs` (copy/select). No native source or binary was modified.

### Actual verification

The original Bash tab disappeared during inspection; no replacement terminal was created. In an existing local A1 terminal, the supported `terminal.select` command selected the visible word `yes`, then `terminal.copy` copied it. A local PowerShell clipboard equality check returned true and length 3. An app screenshot captured the highlighted word with no copy toast. Selection was subsequently cleared. This proves the explicit native copy path writes the clipboard; it is not a mouse-release reproduction or live instrumentation of the initial `off` value.

A scratch VM reproduction loaded the actual controller with an initially unavailable window snapshot, then supplied `platform: windows` and rendered again: `permanentlyDisabled: true`, `selectionReads: 0`. This reproduces the startup latch without modifying project code or the installed mod. It does not instrument the live instance's init.

Existing tests cover signatures, counts, labels and the heuristic's assumptions, not the controller's initialization or successful-copy delivery. `node tests/copy-toast.test.mjs` passed unchanged; new coverage must exercise the real controller against mocked native delivery.

## Goals / Non-Goals

**Goals:** truthful every-copy confirmation using the existing standard toast renderer; no clipboard-content sampling; safe cold startup and duplicate/stale-event handling.

**Non-Goals:** native implementation in this checkout, terminal input injection, automatic keybinding edits, OSC 52 program writes, changing selection semantics, deployment or host restart during planning. No new native-file patch exception.

## Decisions

### Require a supported success boundary before implementation

Herdr 0.1.16 cannot meet the full contract at the mod layer: there is no mouse-release or copy-success event, copied-text API, or native command completion receipt. A native selection snapshot is insufficient. The implementation is **blocked** until the maintainer approves a separate upstream API effort and a reviewed release provides a successful-copy signal.

The required contract is a per-window, non-persistent, uniquely identified event from the common native copy routine after its clipboard operation succeeds. It identifies the source terminal and optionally a character count, never the copied contents. Identical recopy actions produce distinct events; empty/failed copies produce none. Final API spelling and delivery mechanics require upstream review before any consumer code is written. Plan approval alone does not authorize editing a different checkout or native binaries.

Rejected alternatives:

- Fixing only the startup guard: restores best-effort selection feedback but cannot cover repeated explicit copies or prevent false success while dragging.
- Reading the clipboard through GPUI instead of PowerShell: avoids subprocess overhead but still does not establish a copy happened or identify its source.
- Intercepting shortcuts/context menus: misses native mouse selection, palette/CLI actions, user-defined bindings, and repeated identical copy completion.
- Polling clipboard sequence numbers: OS-specific, misses identical writes the host skips, and misattributes unrelated application writes.

### One Custom toast owner

Once the supported event exists, adapt it through `src/integration/herdr/host.js` and the reviewed compatibility profile. Keep one layout-owned controller, consume each event once without persistent replay, and call the existing `notify` API with success level and the existing 3000 ms copy-toast duration. Use the existing character-count wording if the host provides an authoritative count; otherwise use `Text copied`. Never include clipboard contents in the toast.

Remove the PowerShell clipboard reads, selection settle/retry assumptions and private popup/animation path. Retain or simplify the layout slot/manifest only as required to mount the controller once. Do not latch unavailable startup facts as unsupported, and do not gate explicit-copy feedback on copy-on-select.

The event consumer must validate event/source identity and reject duplicate, pre-mount and stale events. Copying remains entirely native. A newer host that already owns a standard native copy toast must not also enable this consumer; select one owner in the reviewed contract to prevent duplication.

## Risks / Trade-offs

- [Unsupported installed host] → Block implementation pending the supported event contract, rather than invent a current API or silently weaken the requirement.
- [Copy event and window focus change race] → Capture source identity, bound event lifetime and reject stale delivery; never read a later terminal's clipboard or selection to fill missing facts.
- [Duplicate native and Custom feedback] → Review single-owner behavior with the host capability before enabling the consumer.
- [Synthetic tests do not prove mouse release or rendering] → After separately authorized deployment, inspect actual local Bash mouse selection and explicit/repeated Copy with screenshots and clipboard equality checks; do not inject terminal input.

## Migration Plan

1. Obtain plan approval and resolve the separately authorized upstream API dependency. If only a small selection-only fix is desired instead, revise the scope/spec/outcome before implementation.
2. On the reviewed supporting host, implement the facade consumer and focused controller regressions together; retire heuristic code and stale packaging in the same outcome.
3. Use targeted unit tests and build/package validation; request authorization for real-app deployment and interaction checks. Do not change the currently installed app as part of this plan.
4. Roll back through existing guarded deployment tooling if authorized rollout fails. No persistent copy-event history or clipboard snapshots require migration.
