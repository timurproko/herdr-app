# Proposal

## Why

Git PR rows show hover text that only repeats fully visible task progress, check counts, bylines and labels. The person also reports truncated bold titles ending in a low flat mark instead of a clearly readable ellipsis; both additions need a coherent row-presentation contract before implementation.

## What Changes

- Preserve the already implemented one-logical-pixel downward offset for every task/check icon variant and its fixed-height/horizontal geometry regressions.
- Show a PR-item tooltip only for information absent from the visible item: its full clipped/compact value or additional known facts. Apply per item to title, number, author, time, tasks, checks, labels, review, state and robot in both views.
- Reuse existing fit measurements and layout callbacks; do not add hidden per-row probes or fetch data on hover. Preserve exact timestamps and failing/pending check names when existing facts provide them, and identify the related agent when known.
- Ensure overflowing PR titles, coordinator repository sections and other Git header text end in a fully visible U+2026 at 100% and 130%, preserving fixed line/row boxes. Diagnose the native suffix, selected face/weight and clipping before selecting the customization-layer fix.
- Update tooltip and geometry regressions, conflicting unconditional-tooltip expectations, and feature documentation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Make PR item tooltips information-dependent, reconcile existing unconditional full-value tooltip requirements, and require a readable contained ellipsis for Git titles and headers.

## Impact

- `src/plugins/git/mod/main.js`: shared row, measured-fit selection, labels and title/repository/header rendering.
- `src/plugins/git/mod/pulls.js`: preserve already-read timestamp/check-name details without changing newest-workflow semantics or counts.
- `src/plugins/git/mod/agent-links.js` and the coordinator target projection: expose already-known display identity without new reads or weaker action guards.
- Existing row/label/agent/pagination/fleet tests and `tests/support/git-row.mjs`; add focused tooltip/ellipsis assertions.
- README and testing documentation; no dependencies, native rebuild/patch, live deployment, request cadence, paging changes or edits to PRs #56/#59.

## Delivery state

PR #61 already contains the icon correction. The tooltip and ellipsis additions are a plan only, awaiting approval; no runtime code for those additions is implemented by this proposal.
