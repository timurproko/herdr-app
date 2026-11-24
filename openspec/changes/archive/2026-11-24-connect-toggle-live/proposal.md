# Proposal

## Why

Changing Settings → Spaces → Connect fleet space to coordinator currently leaves the visible sidebar unchanged until Settings closes. Preference changes must reach the mounted sidebar and start any necessary verification without requiring another interaction.

## What Changes

- Make attachment enable/disable update the mounted sidebar while Settings remains open, including ordering, numbering, chain placement and badge colours on every applicable machine.
- Start required fleet verification from the preference-change lifecycle, publish its result when available and reject superseded replies without guessing a relationship.
- Inspect the other two Spaces switches for the same delay; change them only if they share the demonstrated cause.
- Add mounted-dialog regressions for both directions, delayed verification and rapid reversal, with render-phase safety assertions.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-experience`: explicitly require immediate fleet preference propagation with Settings open and verification-driven publication without a close event.

## Impact

Likely boundaries are `src/features/settings/spaces-ui.js`, the shared Spaces preferences, mounted Spaces lifecycle and Crew's existing generic workspace refresh contribution. Tests must exercise separate mod instances rather than just read back the saved boolean. No native patch, new polling loop, space/session mutation or change to persisted pair/action authority is proposed.
