# Proposal

## Why

Settings currently titles Custom as `herdr-app-custom revision unknown` when trustworthy installed provenance is absent. The requested quieter title conflicts with the existing explicit spec wording, and the paragraph beneath the rows incorrectly groups Custom with the native hourly checks despite its newer 120–180 second cadence and merge hints.

## What Changes

- Show only `herdr-app-custom` when the installed revision is unavailable, retaining the existing seven-character suffix when known in every row state and removing any repeated unknown-revision placeholder in user-facing tooltip/footer/menu text.
- Preserve provenance detection, unknown-revision Update availability, current-status rules, update locks, failure messages and unknown-update-outcome diagnostics.
- Distinguish native Herdr/herdr-core hourly checks from Custom's healthy 2–3 minute checks and configured merge hints in Settings and maintained documentation.
- Add state-matrix regression coverage and adjust the existing check fixture that expects the removed title placeholder.
- Report the existing Herdr 0.1.17 deployment refusal without changing reviewed host versions or deploying.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `customization-lifecycle`: Replace the unknown-revision title placeholder with a bare product name and document the distinct native and Custom discovery cadences without changing detection or installation behavior.

## Impact

Implementation targets `src/shared/customization-update-model.js`, the explanatory copy in `src/features/settings/main.js`, `tests/update-row.test.mjs`, `tests/update-check.test.mjs`, `README.md`, `docs/COMMANDS.md` and `docs/TESTING.md`. Inspect the row renderer and other user-facing consumers for repeated placeholders; keep shared title formatting centralized. No new dependencies, worker changes, host profile updates, native modifications or deployments are proposed. Archived OpenSpec changes remain historical records.
