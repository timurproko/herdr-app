# Tasks

## 1. Checks and task-progress icons share a one-pixel downward offset

- [x] 1.1 Lower both shared icon slots by one logical pixel without moving text or separators; delivered in `7d714fb` and checked by the geometry regression.
- [x] 1.2 Cover every task/check variant, descendant paths, ordinary/pinned/scrolling/coordinator/ghost rows, horizontal invariance and 18px/74px boxes; 62,100 comparisons and offset-removal mutations pass.
- [x] 1.3 Document the synthetic regression and measurement limits in docs/TESTING.md; the isolated Windows `CI=true npm run test:ci` passed all 182 suite entries on the original icon head.

## 2. Every PR row item exposes only informative tooltips

- [x] 2.1 Resolve title/pill fit with the explicitly approved 512-entry shared distinct-string/style/font/zoom measurement cache and existing available-width callbacks; focused fixtures prove warm-cache reuse and one pending probe per snapshot.
- [x] 2.2 Retain exact event timestamps and newest-workflow failing/pending check names from already-read facts; facts/rerun and fallback fixtures demonstrate detail preservation with unchanged counts and request numbers.
- [x] 2.3 Apply the design's per-item tooltip table using existing full/compact/allocated-width facts, including fully clipped review/label recovery on a surviving hover target; tooltip fixtures cover complete, compact, clipped and informative cases and ancestor hover chains.
- [x] 2.4 Expose known related-agent display identity and non-visible state semantics without loosening target guards; ordinary/coordinator agent-link fixtures cover known/unknown/stale/absent/ghost cases and retain accessibility labels.
- [x] 2.5 Update conflicting unconditional-tooltip tests and document the complete item table in README/testing guidance; row/label/agent and complete-panel geometry fixtures pass at supported widths/zooms including 100% and 130%, with unchanged probe/read counts.

## 3. Truncated Git titles and headers use a readable contained Unicode ellipsis

- [ ] 3.1 Diagnose native suffix, selected face/weight and glyph clipping at 100%/130%, comparing PR titles, repository/panel headers and lower-line text; record the actual cause and native-versus-proxy evidence rather than inferring it from the screenshot alone.
- [ ] 3.2 Apply only the diagnosis-matched customization remedy from the design, preserving the original full string and existing measurements; a fitting string remains unchanged and an overflowing rendered string ends in U+2026 without a host patch or extra probes.
- [ ] 3.3 Add title/header suffix and glyph-containment regressions for ordinary/pinned/scrolling/coordinator/ghost and folded-header paths at both requested zooms; mutation cases detect baseline-only clipping or an underscore/ASCII-period suffix while 20px/74px geometry and icon offsets remain unchanged.
- [ ] 3.4 Document the diagnosed cause, chosen font/containment remedy, exact visual evidence and remaining native limits; focused tooltip/ellipsis and geometry suites pass with no unrelated header-hover, paging or rate-limit edits.

## Workflow follow-up

- Outcomes 2 and 3 and the bounded shared measurement route are explicitly approved. Do not build hidden per-row probes on every render or use guessed character budgets.
- If reliable measured title fit still proves unavailable, the person approved keeping full-title tooltips while the other items remain informative-only; report that exception if used.
- After implementation, run the requested isolated `CI=true npm run test:ci` when no other local suite is running, then read the final-head required check results. Do not claim the original head's passing local suite proves later auto-refresh/plan heads.
- Leave readiness/finalization to delivery automation; never merge or arm auto-merge. No installation or live-session modification is authorized.
