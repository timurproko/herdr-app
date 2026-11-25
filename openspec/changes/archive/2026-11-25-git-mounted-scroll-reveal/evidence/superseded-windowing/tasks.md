# Tasks

## 1. Coordinator lists append on scroll with exact-height windowing, stable anchors and bounded cached row builds

- [x] 1.1 Replace `taskSections` replacement pages and page controls with per-home/tab revealed depth and a flat folded-item projection; cover initial ten items, automatic ten-item append, all-row reachability, unchanged full totals and zero scroll-triggered aggregate/GitHub reads in coordinator fixtures.
- [x] 1.2 Add prefix-height window selection, bounded overscan and exact top/bottom spacers for 74px PRs, shared headers, notices, gaps and padding; extend `tests/git-panel-errors.test.mjs` to scroll through 100 PRs and assert only windowed rows build under the unchanged operation/element ceilings at each depth.
- [x] 1.3 Keep existing probe/label caches and fresh native callbacks; extend cache tests across unmount/remount, zoom and stale measurements, including the 100-label row and full-label tooltips.
- [x] 1.4 Preserve stable native scroll identity and first-visible row anchors across same-context refresh, inserted facts, append, fold and tab return; cover narrow/wide panels and zoom, notice-only sections, ordinary pinned/older rows and existing pin-motion regressions without editing concurrent styling or notice policy.
- [x] 1.5 Update README, architecture and render-budget guidance for continuous windowing; extend `tools/measure-git-render.mjs` to drive reveal/scroll and record native render-build samples plus built-row counts after 30/60/100 loaded rows, including deep windows, in disposable app homes.

## 2. Both Git lists reuse Spaces and Agents scroll metrics and passive edge fades

- [x] 2.1 Package and compose `SidebarScrollState` with `topFade`/`bottomFade` through the Git panel manifest; verify the build resolves the canonical shared helpers, with existing 40px gradients, edge thresholds and scrollbar clearance rather than copied behavior.
- [x] 2.2 Chain shared metrics into ordinary and coordinator content/frame events without replacing existing pin cancellation or GitHub cursor paging; add start/middle/end/fitting-list, scrollbar, resize, append, fold and zoom fade fixtures with no render-time notify/focus or scroll-triggered inventory reads.
- [x] 2.3 Document the exact reused components and preserve enrollment outside the scroller; extend enrollment and ordinary pagination regressions to confirm footer visibility, retained scroll and explicit load/retry behavior.

## 3. Coordinator safety probes follow viewport rows and reject obsolete window replies without widening reads

- [x] 3.1 Replace aggregate page-based fallback snapshots with actual viewport-intersecting PR identities and a monotonic selection generation; extend `tests/git-safety-paging.test.mjs` for overscan/fold/off-window exclusion and held replies after scroll-away-and-back, tab changes and refreshed projections.
- [x] 3.2 Retain 45/120-second cadence, backoff, merge/close totals, thin probes, per-call repository routing and existing ordinary safety selection; update safety/fallback fixtures to prove scrolling itself starts no extra probes or full-inventory reads.
- [x] 3.3 Update webhook and architecture scope wording from current page to viewport window, matching implemented behavior and documenting retained stale-data limits.
- [x] 3.4 Once no other suite is running, run `CI=true npm run test:ci` for integration, repeat the 30/60/100 native measurements on the final implementation and inspect checks for the exact pushed head; report actual statuses, timing scope and any remaining gaps without marking the PR ready or merging it.
