# Tasks

## 1. PR blocks retain identical title, icon and metadata geometry as optional facts change

- [x] 1.1 Normalize ordinary, coordinator and ghost rows to fixed title/byline/metadata line boxes and permanent state/robot slots; verify equal title right edges, line positions and heights with and without related agents, including an inert empty robot slot.
- [x] 1.2 Reserve independent tasks/checks/labels/review cells, icon cells and separator gutters, and separate optional byline facts without breaking legacy fact consumers; verify absent/arriving/removing groups and untouched/partial/done or digit-width changes never move neighboring anchors or produce visible placeholders/orphan dots.
- [x] 1.3 Add resolved-box geometry regressions through the real shared renderer at 280/360/480 logical-pixel widths and 75/100/125/150/200 percent zoom across ordinary, pinned, scrolling, coordinator, Open/Closed/merged and ghost variants; verify title truncation boundaries, all cell anchors, row height and following-row positions rather than only style attributes.
- [x] 1.4 Adapt existing label/pin/fleet expectations to distinguish invisible reservations from visible placeholders while retaining palette, tooltip, captured-action and measured-motion assertions; verify focused row-label, pin-swap and row-geometry fixtures pass and render guards reject focus allocation or synchronous notification.
- [x] 1.5 Document the three-line layout, blank horizontal-slot trade-off and synthetic geometry limits in README and docs/TESTING.md; verify the documented behavior matches the row regression matrix without touching Spaces or PR #38.

## 2. Same-context refresh preserves displayed rows until replacement facts are ready

- [x] 2.1 Preserve last-good ordinary repository rows/counts/pages/pin measurements on inconclusive same-context root-probe failure, retaining immediate invalidation for unrelated contexts and proven non-repositories; verify deferred root-success, transport/process failure, definitive absence and obsolete-reply cases in the location/pagination fixtures.
- [x] 2.2 Add render snapshots during manual, webhook, reconnect/show and aggregate refreshes, including partial PR-read failure and stale/Verifying transitions; verify existing rows/IDs/order/scroll geometry remain until each successful replacement, webhook pagination depth is preserved, and cold waiting shows no fabricated rows or values.
- [x] 2.3 Reserve optional panel count/status geometry wherever the deferred panel fixture demonstrates arrival-driven reflow, and fix any demonstrated same-home aggregate clearing path without changing identity/eligibility policy; verify loading feedback cannot displace retained rows and true home/repository/tab changes still obey existing guards.
- [x] 2.4 Extend immediate-spawn render guards and stale worker-action tests across the modified refresh paths; verify no render-time focus allocation or notification, no stale coordinator reads/navigation and no additional polling or real host operations.
- [x] 2.5 Update README and docs/TESTING.md with refresh-retention boundaries and evidence limitations; verify focused pagination, location, fleet, label and pin regressions pass without reducing existing safety assertions.

## Workflow follow-up

- Stop after publishing this plan as a draft PR; implementation requires explicit plan approval.
- After implementation, run the requested `CI=true npm run test:ci`, record the exit status and inspect required checks on the exact final head; report skipped or unavailable draft checks honestly, without a foreground watch loop.
- Keep the task PR draft; never manually mark ready, arm auto-merge or merge, and do not modify PR #38.
