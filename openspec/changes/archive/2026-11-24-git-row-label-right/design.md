# Design

## Context

See proposal.md for motivation. `Main.pullRow` and `pullLine` in `src/plugins/git/mod/main.js` render ordinary, coordinator, pinned, scrolling and ghost/motion-preview rows. The current measured run inserts a dot between every present group and allocates all spare width at the end. Full/compact invisible probes and deferred, context-guarded size callbacks already select semantic shortening. The existing geometry tests explicitly enforce left-flowing labels, so both implementation and its oracle must change together.

The current spec's shared metadata, label presentation and stable geometry requirements explicitly encode the old behavior. Their delta is why this visual change requires approval before implementation.

## Goals / Non-Goals

**Goals:** Preserve the independent byline and the fixed row/slot geometry while giving assigned labels one stable right anchor. Keep the existing measured, zoom-normalized overflow decision rather than guessing character widths.

**Non-Goals:** No new GitHub reads, label-role classification, renamed labels, colour changes, timers, native patches, deployment, robot actions or modifications to PRs 44–47. A GitHub review decision remains distinct from an assigned label named Review, Rework or Approved.

## Decisions

1. **Use the existing content edge.** The group's trailing pill edge aligns with the outer right edge of the title line's reserved 24px robot control, not the inset SVG glyph or panel border. Keeping it inside the same content column avoids new padding or title-slot changes. A fixed panel-relative offset would couple unrelated geometry and is rejected.
2. **Split status placement, not the shared byline contract.** Keep tasks/checks and any separate review-decision text in a natural-width left run with the current 3px dots and 6px gaps. Place assigned labels in one source-ordered, right-aligned group with flexible free space before it and no joining dot. Preserve normal minimum inter-group breathing room when both sides exist. No-label rows have no right-hand placeholder or label reservation. Do not stretch individual task/check cells or reorder labels by review role.
3. **Measure both sides together.** Extend the current measured status allocation to include the natural label group and the left run, accounting for left separators but not a separator before labels. Compact task wording only when the combined line actually overflows. Then reduce separate review-decision text, followed by the label group's available width. Keep checks and compact task fractions non-shrinking. A clipped bounded label group remains right-anchored; its visible trailing pill reaches the content edge. Use tidy clipping without an ellipsis-only fragment, retaining the existing full-name strip/line tooltips. Reject equal-width columns and fixed text budgets because both waste room and shorten fitting values.
4. **Retain native measurement discipline.** Reuse invisible full/compact probes, ID-keyed geometry, zoom normalization and context guards. No render-time notifications, JS frame loops or reset of geometry on unrelated PR refreshes.
5. **Update the geometry oracle narrowly.** Continue asserting natural gaps and widths for the byline and left status run; replace only the all-left/trailing-space expectations for assigned labels. Compare rightmost pill edges across different task/check values, absent checks/tasks, one/multiple/no labels, separate review decisions and late fact changes. Cover all shared variants, Open/Closed, 280/320/360/390/480px and 75/100/125/130/150/200% zoom. Retain checks containment, fixed 74px blocks, line anchors, title slots, tooltips and mutation tests.

## Risks / Trade-offs

- Extremely long or numerous labels cannot remain whole beside protected checks → compact tasks first, reduce separate review text next, clip label text last, and expose all names through existing tooltips. No extra line or horizontal overflow.
- Clipping a right-aligned multi-pill strip can conceal earlier labels → preserve source order and a full group tooltip; test that the visible trailing pill still ends at the shared edge.
- Synthetic geometry does not prove GPUI pixels → report this limit; inspect real native UI only with explicit authorization. No deployment is part of this plan.
- Broad suites may already be running → after approval, run the requested `CI=true npm run test:ci` only once no other suite is active and report actual results; inspect required checks on the final implementation head without marking ready or merging.

## Migration Plan

No state or data migration. After approval, change the shared renderer, focused regressions and README together. Reverting that implementation commit restores the former layout; no installed/runtime files are edited directly.
