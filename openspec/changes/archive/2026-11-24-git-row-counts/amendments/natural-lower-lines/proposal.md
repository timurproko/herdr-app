# Approved amendment: natural lower-line flow

The person explicitly requested this display refinement in the same PR after finalization. It supersedes the fixed lower-line cells, empty metadata reservations and always-compact wording in the original design; freshness behavior remains unchanged.

## Outcome

Shared PR bylines and metadata flow left at natural widths with constant separator gaps and trailing free space. Full wording remains while the complete line fits. On actual overflow, task wording becomes a whole fraction and byline time becomes compact before author/label/review clipping. Checks never shrink or truncate. Absent groups reserve no horizontal space. Preserve the title's agent reservation, state slot, three explicit-pixel line boxes and 74px block height, including late-data and all row variants.

## Implementation plan

- Measure native natural full/compact content and available line widths with clipped invisible probes and post-layout, changed-only callbacks; choose shortening from the whole-line fit rather than guessed character widths or fixed percentage/cell budgets.
- Keep tasks, checks, assigned labels and review-decision order. Render only present groups and separators between them. Keep full values in tooltips and prevent lone-ellipsis paint.
- Revise geometry assertions for natural widths, constant gaps, left alignment and trailing free space at 280/320/360/390/480px and 75–200% zoom. Retain title/vertical invariants, full checks containment, explicit-pixel line-height mutations and label/interaction coverage.
- Update the current spec delta and canonical requirements plus README/testing guidance. Leave publication ordering, queue ownership, remote readiness and bounded fallback code untouched.
- Run focused checks, push and tick the amended display outcome. Run the requested full local CI command once alone with a 1,800-second timeout; inspect final-head hosted required checks and rewrite the complete Crew report.

## Approval

The coordinator forwarded the person's exact layout and regression requirements together with an explicit instruction to implement them in PR #42. No new product decision is outstanding. This amendment affects display outcome 1 only; the delivered freshness outcome stays checked.
