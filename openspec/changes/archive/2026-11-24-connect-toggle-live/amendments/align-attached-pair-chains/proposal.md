# Proposal

## Why

The person now wants both members of an attached coordinator/fleet pair to show aligned chains before their Crew pills, rather than only the coordinator. The existing implementation and specification explicitly restrict the chain to the coordinator, so this is an amendment to PR #40's approved appearance contract.

## What Changes

- Show the existing muted outline chain immediately before Crew on both expanded attached rows, in one right-aligned column.
- Keep counts and worktree markers to the left of the chain, including multiple unrelated plugin tags; keep the chain/Crew group last.
- Keep chains absent while detached, renaming, in the compact rail and in drag chips; preserve the live preference lifecycle already delivered in this PR.
- Correct the specification's accidental projected-numbering promise: badges retain native selection indices, as required by the coordinator's conditional instruction after investigating shortcuts.
- Extend existing render and mounted-toggle regressions and update current documentation; leave the previously finalized archive intact as history.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-experience`: both expanded attached rows show matching chain/Crew groups, and number badges truthfully identify native keyboard-selection indices.

## Impact

`src/features/spaces/main.js`, `tests/spaces-worktree-layout.test.mjs`, `tests/fleet-toggle-live.test.mjs`, README and testing guidance. No native reorder, shortcut remapping, worker change, new IO or render-phase side effect. The original two PR outcomes are already implemented; only the new third outcome awaits implementation approval.
