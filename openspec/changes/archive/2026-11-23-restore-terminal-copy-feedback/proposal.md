# Proposal

## Why

Terminal text reaches the clipboard but Custom's copy observer permanently disables itself when window/platform facts are unavailable during cold startup. The approved narrowed scope restores best-effort mouse copy-on-select feedback without requiring a native host change.

## What Changes

- Wait for published Windows window facts instead of permanently opting out during initialization; resume observation when copy-on-select becomes enabled.
- Retain bounded selection-settle/clipboard inference for native mouse copy-on-select, using the supported GPUI clipboard reader rather than launching PowerShell.
- Send the existing character-count wording through the app's standard success toast instead of drawing a private floating popup.
- Add controller regressions for missing-then-published window facts, simulated mouse selection/copy, unchanged text, disabled copy-on-select, and canceled/stale work.
- Document that explicit/repeated shortcut copies with unchanged selections cannot be detected reliably without an upstream copy-success capability. The heuristic is best effort, not a confirmed-copy guarantee.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-experience`: Best-effort standard terminal copy-on-select feedback recovers after cold startup while preserving native terminal and clipboard ownership.

## Impact

- `src/features/copy-toast/`, its controller tests, and user documentation. Existing layout/manifest mounting remains stable.
- Uses only the installed host's public selection snapshots, GPUI clipboard reader and standard `notify` API; no upstream dependency, native edits, keybinding changes, or terminal input.
- Approval explicitly accepts selection-only best-effort scope, including uncertainty while a drag remains held or unrelated clipboard contents change. OSC 52 and reliable explicit/repeated shortcut notifications are out of scope.
