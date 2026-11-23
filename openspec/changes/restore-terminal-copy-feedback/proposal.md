# Proposal

## Why

Terminal text reaches the clipboard but Custom can show no copy confirmation: its existing observer permanently disables itself when the host's window snapshot is unavailable during cold startup. Its selection/clipboard heuristic also cannot reliably distinguish completed copies, repeated shortcut copies, and a selection still being dragged.

## What Changes

- Make successful terminal copies produce the same standard success toast used by other Custom copy actions, including mouse copy-on-select, explicit shortcuts, and repeated copies of unchanged text.
- Replace selection/clipboard inference with a confirmed native copy-success signal; never display clipboard contents in feedback or read arbitrary clipboard text to infer success.
- Cover startup, repeated copies, disabled copy-on-select, empty selections, and stale terminal bindings with controller-level regressions, not just label/helper assertions.
- Gate implementation on a separately approved supported host copy-success capability. Herdr 0.1.16 exposes selection changes but no copy-success event; this repository must not patch or rebuild the native host to obtain one.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-experience`: Successful terminal copies receive standard, success-driven feedback without changing native copy or terminal behavior.

## Impact

- Custom copy controller/model, its tests, layout slot and manifest packaging; host facade/compatibility contract if an approved copy event becomes available.
- Current observed host: Herdr 0.1.16. Its common native copy routine writes the clipboard without notifying; its SDK cannot report completion to a mod.
- **Blocking dependency:** maintainer approval of an upstream native copy-success API and availability of a reviewed host release. That native work is outside this checkout and is not authorized by this proposal. Alternatively, explicitly approve narrower best-effort selection-only scope; that is not equivalent to the requested every-copy guarantee.
- No implementation, deployment, native patch, terminal input, process restart, or keybinding changes in this planning PR.
