# Proposal

## Why

The shared Git PR row currently paints assigned labels as solid blocks, unlike GitHub's quieter dark-theme pills in the supplied reference. Use GitHub's actual colour derivation so arbitrary label colours remain legible without changing the compact metadata layout.

## What Changes

- Render dark-palette labels with an 18% label-colour background, lightness-adjusted coloured text and a 30% adjusted-colour border, using Primer's perceived-lightness switch and HSL formula.
- Use Primer's solid-background, contrasting black/white text and near-white border rule on light palettes; follow the effective panel palette rather than an unrelated system appearance preference.
- Preserve exact emoji/name strings, fully rounded 18px pills, bounded single-line strips, complete tooltips and the identical shared renderer in ordinary/coordinator views and both tabs.
- Replace the solid-colour regression with formula coverage across several hues and extreme colours, and update the README, testing documentation and label-presentation specification.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Specify theme-aware GitHub label colours while preserving existing shared metadata, sizing, tooltip and refresh contracts.

## Impact

Changes are limited to the shared pill in `src/plugins/git/mod/main.js`, a Git-local pure colour helper, `tests/git-row-labels.test.mjs`, and documentation/specification artifacts. No GitHub data reads, coordinator aggregation, fleet-link presentation, preferences, dependencies or native changes are needed. PR #18 remains independent. No deployment is requested.

Formula source: [Primer React IssueLabelToken CSS](https://github.com/primer/react/blob/2128032dca65a1bd565fe382c2e91c638c6473a4/packages/react/src/Token/IssueLabelToken.module.css), with RGB/HSL input rounding from [IssueLabelToken.tsx](https://github.com/primer/react/blob/2128032dca65a1bd565fe382c2e91c638c6473a4/packages/react/src/Token/IssueLabelToken.tsx). Exact equations, theme classification and checks are recorded in `design.md`.
