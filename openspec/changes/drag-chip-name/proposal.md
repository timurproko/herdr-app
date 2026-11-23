# Proposal

## Why

Dragging an attached fleet row currently shows the coordinator's number and name rather than the row the user grabbed. The single drag chip should preserve the grabbed row's visible identity without changing the pair's block movement.

## What Changes

- Show the fleet's own name and coordinator-coloured filled chain badge when its attached row starts a drag.
- Keep the coordinator's numbered badge and name when its row starts a drag, with exactly one chip in either case.
- Preserve pair dimming, insertion markers, acknowledged ordering, cancellation, pairing/persistence and attachment-off behaviour.
- Update rendering/drag regressions and the README, reorder documentation and workspace specification describing the chip.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-experience`: the linked-space block preview represents the grabbed member, not always the coordinator.

## Impact

The focused implementation is in `src/features/spaces/main.js`, reusing the existing row badge renderer. Regression coverage belongs in `tests/spaces-worktree-layout.test.mjs` and `tests/reorder.test.mjs`, alongside existing block-order coverage in `tests/fleet-reorder.test.mjs`. No shared drag API, host commands, preferences, persistence or dependencies change. Pull requests #34, #36 and #37 are outside this task and will not be modified.
