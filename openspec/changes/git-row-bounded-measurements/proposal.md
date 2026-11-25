# Proposal

## Why

PR #61's first tooltip/ellipsis implementation exceeded the native watchdog at 100 cold mounted rows, including the already supported ordinary list. Review also reproduced a same-ID title edit losing its available width until a resize. The person explicitly requested this rework and approved the native/full-title-tooltip fallback instead of title measurement.

## What Changes

- Preserve the delivered icon offsets and informative lower-line tooltips.
- Remove title, per-pill and candidate-prefix measurement subtrees entirely. Native Segoe UI truncation supplies readable U+2026 at the original size/weight; PR titles always retain full-title hover as the approved fallback.
- Limit shared intrinsic probes to four per complete render, share the budget between repository headers and lower-line groups, reuse the 512-entry style/font/zoom cache, and let native callbacks advance later batches without delaying rows.
- Prioritize the known ordinary visible slice using existing scroll bounds; fall back to display order when no viewport facts exist. Cache settings once per render entry, not per row/string.
- Preserve allocated physical geometry by element ID across string/style invalidation and re-normalize it for current zoom.
- Add fully mounted ordinary/coordinator 30/60/100/200-row baseline-relative tree budgets, zoom/font cold-start and same-ID changed-size-only regressions, and an opt-in native timing gate against fc0dfde.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Approve the full-title tooltip exception, preserve native readable ellipses without title probes, and bound mounted-row measurement/build work and geometry lifetime.

## Impact

Shared Git row/header rendering and scroll-bound observation, existing tooltip/geometry/native fixtures, new baseline tree-size fixture and native benchmark, README and testing/render-budget documentation. No dependencies, request cadence, paging semantics, native host patch, deployment or changes to PR #56/#59.

The previous `git-row-informative-tooltips` archive is preserved. This change records the explicitly requested performance repair in the same open PR rather than undoing its finalized commit.
