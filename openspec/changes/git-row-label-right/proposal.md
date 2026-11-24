# Proposal

## Why

Git PR label pills currently follow tasks and checks, so their horizontal position varies between rows and moves when those facts change. Pinning the pill group to the content area's right edge makes review status easier to scan without changing the three-line row geometry.

## What Changes

- Right-align assigned label pills as one ordered group, ending at the same content-area edge as the title's reserved robot slot, without a separator before that group.
- Preserve the left natural-width tasks/checks run and its existing separators; put spare space between that run and labels. Keep any separate GitHub review-decision text on the left, after checks, with its existing priority below label text.
- Compact task progress first on actual overflow; then reduce secondary review-decision text, then clip the bounded label group, preserving complete checks and avoiding overlap or lone ellipses.
- Preserve exact label names, colours, tooltips, absent-label behavior, 74px blocks, all three lines and title/robot slots in ordinary, coordinator, pinned and motion-preview rows.
- Extend geometry regressions across 280–480px widths and 75–200% zoom, explicitly including 130%, and document the new alignment and overflow policy.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Replace the left-flowing assigned-label contract with a right-anchored label group while retaining natural left metadata, complete checks and fixed block geometry.

## Impact

The shared row renderer and measured overflow allocation in `src/plugins/git/mod/main.js`, `tests/git-row-geometry.test.mjs`, `tests/git-row-labels.test.mjs`, related row fixtures as needed, and README's Git row description. No data queries, native changes, dependencies, deployment or edits to existing PRs 44–47 are needed. This is a plan-only change pending approval because the current spec explicitly requires left-flowing labels and a separator.
