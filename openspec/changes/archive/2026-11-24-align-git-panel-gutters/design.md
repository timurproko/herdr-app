# Design

## Context

See `proposal.md` for motivation. Baseline `tests/git-right-edge.test.mjs` passes 1,440 complete-panel and 1,500 replacement-page comparisons, explicitly asserting Git's old 5px gutter. The real Spaces renderer fixture measures an 8px highlight gutter, 8px highlight-to-content inset, 3px highlight-to-Crew-pill gap and 6px radius. Git already uses the same inner insets and radius; only its outer column differs.

The Git panel has a 1px border plus 4px list padding, producing its current 5px highlight gutter. Ordinary pinned content, the scroll viewport and motion overlay have separate wrappers. Coordinator replacement pages and both footer renderers also own padding. There are no explicit Git fade elements in the current renderer; native scroll clipping must follow the narrowed content column without adding a new fade feature.

## Goals / Non-Goals

**Goals:** Make the smallest presentation-only change that gives every list presentation and feedback surface the same measured outer column. Keep border accounting explicit and distinguish outer gutter from inner content padding.

**Non-Goals:** No Spaces changes, icon nudge, tooltip/ellipsis changes, fleet presentation, paging redesign, rate-limit changes, new fades, header/tab chrome redesign, deployment or live agent navigation.

## Decisions

- Derive the target geometry from the real Spaces renderer in the existing complete-panel regression, not screenshot estimation or isolated-row equalities. Compare left and right edges independently, plus row radius, leading content and trailing controls.
- Use 7px horizontal padding inside Git's 1px panel border to achieve 8px outer gutters. Retain existing vertical padding. Prefer a small local shared list-inset value over a broad shared-UI refactor; do not change global sidebar tokens or Spaces geometry.
- Apply the column consistently to pinned/list/page wrappers, ghost-card coordinates, repository headers, notices and feedback, scroll clipping/fade bounds where applicable, and ordinary/coordinator enrollment footer cards. Inspect `main.js` and `enrollment-picker.js` independently so the footer does not retain 4px padding. Preserve nested 8px content padding rather than double-insetting notices or Loading indicators.
- Keep row leading padding at 8px, trailing padding at 3px and radius at 6px. With outer gutters increasing by 3px on each side, leading content moves from 13px to 16px from the panel and trailing controls from 8px to 11px. Available title width decreases by 6px. At 130% zoom the new outer gutter is 10.4px and the trailing inner gap remains 3.9px.
- Extend mutation guards so asymmetric gutters and a shifted-but-locally-aligned subtree fail, alongside existing trailing-slot and panel-border mutations. Exercise ordinary, pinned, scrolling, ghost and coordinator rows, folded/continuation headers, notices, Loading/empty states and footer cards across the existing width/zoom matrix.

## Risks / Trade-offs

- Narrower titles/metadata → Accepted 6px reduction; retain natural-width shortening rules and run focused geometry/metadata regressions.
- Ghost coordinates or native clipping diverge from real rows → Measure full-panel overlays and scroll wrappers rather than changing row padding alone.
- Concurrent changes in the same module → Incorporate main as related PRs land, preserving their behavior; avoid unrelated edits from PRs 56, 59, 61 and 62.
- Synthetic geometry is not native paint → Report renderer measurements as synthetic, not screenshot/native proof. No live deployment is authorized by this plan.

## Migration Plan

No persisted state or compatibility migration. Update source and documented geometry together; normal customization build/deployment can carry the eventual change. Reverting the focused presentation commit restores the old gutter without changing preferences or PR data.
