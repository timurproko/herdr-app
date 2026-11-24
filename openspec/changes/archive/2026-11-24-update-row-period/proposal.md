# Proposal

## Why

Custom's running update descriptions omit the full stops already used by the rows above it. Diagnostic descriptions also have inconsistent sentence endings, so Settings > Updates should use the same punctuation throughout.

## What Changes

- End all four Custom running descriptions with a full stop: `Updating to 27b86ac.`, `Updating other machines to 27b86ac.`, `Updating.`, and `Updating other machines.`.
- Audit every Custom description and both sibling rows authored in this checkout; consistently terminate description sentences without double stops, including dynamic failures and diagnostic suffixes.
- Preserve button ellipses, revision provenance, update scope, controls, layout and safety guards.
- Update exact-string tests and current documentation/spec examples; retain historical archived change records.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `customization-lifecycle`: Consistent sentence punctuation in Settings update-row descriptions, including the existing target-aware and targetless running text.

## Impact

Presentation-only changes in `src/shared/customization-update-model.js` and `src/features/settings/main.js`, plus focused updater tests, `README.md`, `docs/TESTING.md` and applicable current specification wording. No native sources, installed files, deployment or update behavior changes.
