# Proposal

## Why

The maintainer wants the customization update row named `herdr-app-custom`, matching the lowercase hyphenated style of `herdr-core`.

## What Changes

- Rename only the display constant and old-label quotations in tests, fixtures, README, docs and specs, including archived update-row text.
- Preserve all behavior, layout, identifiers and other wording; never deploy or touch the live Herdr home.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `customization-lifecycle`: name the existing customization update row `herdr-app-custom`.

## Impact

`src/shared/customization-update-model.js`, update-check/update-row fixtures, README, `docs/COMMANDS.md` and label-quoting specs/docs. The constant only builds the displayed title; native update rows use separate state and commands, not label comparison or parsing.
