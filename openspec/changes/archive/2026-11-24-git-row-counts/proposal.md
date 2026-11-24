# Proposal

## Why

The fixed row geometry from #39 reserves too little room for CI counts: the supplied Herdr screenshot replaces the count with an ellipsis and clips task progress and relative time mid-word. Preserve the no-jump contract while making the most important value readable and explaining when its data can remain stale.

## What Changes

- Allocate stable metadata budgets by priority: complete checks icon/count first, assigned review-label pills next, task progress next, with the separate review-decision text using the remaining budget. Keep the existing visual order and blank reservations when optional facts are absent.
- Use whole compact task progress and relative-time forms rather than mid-word or lone-ellipsis values, retaining full tooltips in ordinary, coordinator and motion-preview rows.
- Cover completion/rerun invalidations and in-flight dirty follow-ups in existing webhook refresh paths; repair demonstrated stale-count defects and add an approved 45-second pending/unknown-only fallback for repositories without live coverage, with failure backoff and no webhook enrollment changes.
- Extend resolved geometry assertions to 280/320/360/480px and 75–200% zoom, checking full one/two-digit counts and meaningful compact values as well as existing no-shift and pixel-line-height guarantees.
- Document source-derived refresh timing and stale-data conditions, clearly separating fixture evidence from measured live latency.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Prioritized readable Git row metadata, compact bylines, and explicit completion-driven check freshness and its operational limits.

## Impact

Primary code: `src/plugins/git/mod/main.js` (shared row and ordinary refresh), `pulls.js` (display facts), and the existing aggregate/webhook path if a freshness defect is reproduced. Regressions: `tests/git-row-geometry.test.mjs`, `tests/support/git-row.mjs`, pagination/fleet/webhook fixtures. Documentation: README and applicable Git/testing docs. No native changes, deployment, webhook enrollment, account changes, or mutations to PRs #40/#41.
