# Tasks

## 1. Git content gutters match Spaces without changing inner row geometry

- [ ] 1.1 Adjust ordinary, pinned, scrolling, coordinator and ghost outer geometry to the actual Spaces 8px left/right gutter; preserve 8px leading inset, 3px trailing gap, 6px radius and existing vertical geometry, verified by complete-panel renderer comparisons.
- [ ] 1.2 Align repository headers, notices, Loading/empty feedback, native scroll clipping/fade bounds where applicable, and both enrollment footer cards to the same column without changing actions or paging, verified by feedback/footer geometry cases.
- [ ] 1.3 Extend `tests/git-right-edge.test.mjs` to measure both actual Spaces edges, badge inset and radius at 280/320/360/390/480px and 75/100/125/130/150/200% zoom, including folded and continuation headers, absent/live robots, Open/Closed/merged rows and asymmetric-gutter mutation guards; verify the focused regression passes.
- [ ] 1.4 Update README geometry numbers to distinguish outer and inner gaps and retain existing metadata/title reservation rules; verify focused row geometry, label, pin-motion and enrollment regressions pass with the accepted 6px narrower title budget.

## Workflow follow-up

- After implementation approval, incorporate main changes as related PRs land without editing their scope; run `CI=true npm run test:ci` once no other suite is running, then report final-head required-check status and measured before/after numbers.
- Leave readiness and merging to the existing delivery workflow and maintainer; this task never marks ready or merges.
