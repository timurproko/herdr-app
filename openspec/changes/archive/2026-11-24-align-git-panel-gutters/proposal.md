# Proposal

## Why

Git row highlights sit 5 logical pixels inside the panel while Spaces highlights sit 8 pixels inside the sidebar, making Git look crowded. The existing trailing-alignment spec explicitly preserves that difference, so matching the outer gutters requires an approved spec change.

## What Changes

- Match both Git highlight gutters to the actual Spaces renderer's 8px inset and retain its 6px corner radius.
- Align repository headers, notices, Loading/empty states, scroll fades and the bottom enrollment banner to that content column in ordinary and coordinator views, including pinned, scrolling and ghost rows.
- Preserve the 3px highlight-to-trailing-control gap, the 8px highlight-to-leading-content gap, control sizes and vertical geometry; accept 6px less title width overall.
- Extend complete-panel geometry regression coverage to compare both edges, radius and inner insets against actual Spaces at 280–480px and 75–200% zoom.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Replace the explicit unequal panel-to-highlight gutter contract with equal Spaces-derived gutters, preserving inner trailing alignment and adding a consistent Git content column.

## Impact

Focused changes to `src/plugins/git/mod/main.js`, `tests/git-right-edge.test.mjs`, related geometry fixtures only if needed, and the Git geometry wording in `README.md`. No Spaces renderer changes, new dependencies, Git/GitHub behavior changes, host patches or deployment. Preserve unrelated work in PRs 56, 59, 61 and 62.
