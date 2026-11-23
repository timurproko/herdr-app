# Proposal

## Why

The Updates explanation added in pull request 20 is too large. Restore the exact short paragraph from its parent commit; the current specification explicitly requires the longer explanation, so this needs a scoped specification correction before implementation.

## What Changes

- Restore the paragraph to: “Herdr looks for both every hour and tells you in the corner. herdr-core runs your terminals, so they keep running through its updates.”
- Assert the complete historic text in `tests/update-row.test.mjs`, excluding Custom cadence and relay details from this paragraph.
- Align the current explanation requirement and maintained documentation with the short copy, retaining detailed cadence documentation and historical archives.
- Preserve the quiet unknown-revision title from pull request 20 and every update behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `customization-lifecycle`: Replace the long Settings explanation requirement with the exact short historic paragraph without changing discovery cadence or relay behavior.

## Impact

Implementation affects `src/features/settings/main.js`, `tests/update-row.test.mjs`, `docs/COMMANDS.md` and `docs/TESTING.md`. The main specification is updated through this change's delta on finalization; archived changes remain historical. No dependencies, workers, deployment or native files change. After approval, run `CI=true npm run test:ci` before reporting implementation.
