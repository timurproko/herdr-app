# Proposal

## Why

The person approved aligning Git's trailing controls with Spaces after the right-anchored labels in PR #48. Git's robot target was inset 13px while Spaces Crew pills use 11px, and repository chevrons sat outside the robot column.

## What Changes

- Reduce only PR row right padding from 8px to 6px, accounting for Git's 1px panel border and 4px list inset.
- Reserve a centred 24px chevron slot in Git repository headers with the same trailing inset; preserve Spaces' existing header defaults.
- Exercise complete Git panels against actual Spaces Crew geometry at 280–480px and 75–200% zoom, including 130%.
- Preserve hit targets, absent-agent reservations, tooltips, callbacks and all vertical geometry.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Specify the shared trailing inset and slot/glyph alignment across Git row variants and coordinator repository headers.

## Impact

Git row and repository-header presentation, configurable shared header trailing geometry, resolved-box regressions and documentation only. Builds on the unmerged `origin/fix/git-row-label-right`; no deployment, host changes or edits to other pull requests.
