# Proposal

## Why

The local update phase should identify this machine explicitly, matching the existing other-machines phase. The current specification pins the old wording, so this wording-only fix needs a narrow spec delta.

## What Changes

- Replace known-target local progress text with `Updating this machine to <revision>.`, including updates with no peers.
- Update the assertions pinning that text; preserve all other phase text, revision formatting, layout, timing and update logic.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `customization-lifecycle`: Adjust only the known-target local update sentence.

## Impact

The sentence is rendered by `src/shared/customization-update-model.js`, consumed by Settings. Its pinned assertions are in `tests/update-row.test.mjs`, `tests/update-check.test.mjs` and `tests/update-runner.test.mjs`. No dependencies, host operations or screenshot proof are needed.
