# Proposal

## Why

The fixed row geometry from #39 reserves too little room for CI counts: the supplied Herdr screenshot replaces the count with an ellipsis and clips task progress and relative time mid-word. Preserve the no-jump contract while making the most important value readable and explaining when its data can remain stale.

## What Changes

- Flow both lower lines left at natural widths with constant gaps and trailing free space. Keep tasks/checks/labels/review order without blank horizontal reservations; preserve title/robot geometry, three line positions and block height.
- Keep full task and time wording when the complete line fits. Only measured overflow selects whole compact task/time forms before secondary clipping; checks retain full natural width and all values retain full tooltips in ordinary, coordinator and motion-preview rows.
- Cover completion/rerun invalidations and in-flight dirty follow-ups in existing webhook refresh paths; repair demonstrated stale-count defects and add an approved 45-second pending/unknown-only fallback for repositories without live coverage, with failure backoff and no webhook enrollment changes.
- Extend resolved geometry assertions to 280/320/360/390/480px and 75–200% zoom, checking full one/two-digit counts and meaningful compact values as well as natural-width/constant-gap/fit thresholds and unchanged title/vertical pixel-line-height guarantees.
- Document source-derived refresh timing and stale-data conditions, clearly separating fixture evidence from measured live latency.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Prioritized readable Git row metadata, compact bylines, and explicit completion-driven check freshness and its operational limits.

## Impact

Primary code: `src/plugins/git/mod/main.js` (shared row and ordinary refresh), `pulls.js` (display facts), and the existing aggregate/webhook path if a freshness defect is reproduced. Regressions: `tests/git-row-geometry.test.mjs`, `tests/support/git-row.mjs`, pagination/fleet/webhook fixtures. Documentation: README and applicable Git/testing docs. No native changes, deployment, webhook enrollment, account changes, or mutations to PRs #40/#41.
