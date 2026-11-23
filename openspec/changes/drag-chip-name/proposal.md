# Proposal

## Why

Attached spaces should retain their own numbered identities, including in the single drag chip, while the coordinator's trailing chain marker explains the relationship. This supersedes the filled fleet chain badge from #35 and the earlier chain-badge version of this plan; attached badges still share the coordinator's colour without overwriting the fleet's saved colour.

## What Changes

- Show the fleet's own ordinary numbered badge in the expanded list and compact rail (for example, `2 crew` below `1 coordinator`), with the coordinator's resolved badge colour while attached.
- Move the chain to the expanded coordinator row, immediately before its Crew tag, as a small muted outline icon matching the worktree marker's size, slot, gap and vertical alignment; do not put a chain in either row's badge or the compact rail.
- Use a fixed metadata order: ahead/behind counts, worktree marker, coordinator chain, plugin tags. Keep Crew tags in their existing shared right-aligned column and the chain adjacent to Crew when other plugin tags exist.
- Keep colour changes synchronized in the list, rail and chip. Choosing a colour from either attached row edits the coordinator's colour; the fleet's saved colour and Automatic setting are untouched and return after detachment.
- Show exactly one drag chip with the grabbed row's own numbered badge and name, using the shared coordinator colour while attached; keep coordinator-first pair movement unchanged.
- Keep the fleet name aligned and muted only while inactive; active fleet names use exactly the ordinary selected-space colour and weight. Match ordinary hover/selection handling in expanded and compact views, preserving independent selection, existing tooltips, worktree visibility, rename hiding, pairing/persistence, drop guards and attachment-off behaviour.
- Replace superseded regressions and update README, reorder/testing documentation and all affected workspace specification scenarios.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-experience`: attached numbered badges and shared display colour, coordinator chain metadata, colour-menu targeting, grabbed-member drag chips and retained presentation across refresh/reload.

## Impact

Implementation touches `src/features/spaces/main.js` and the colour action/picker path in `src/features/menu/main.js` (and `space-colors.js` if needed). The menu's ordinary actions must remain bound to the clicked space; only its colour control resolves a captured coordinator target through the generic workspace-link registry. Existing colour state remains the write boundary, with no colour copying, migration, new preference or pair record. Tests cover rendering, gestures, both-origin block moves, mouse/keyboard colour actions, stale menu guards and immutable saved fleet colour. Pull requests #34, #36 and #37 remain outside this task and will not be modified. No native change, live deployment, shared drag API or dependency change is required.
