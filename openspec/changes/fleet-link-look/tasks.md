# Tasks

## 1. Coordinator Crew tags remain visible while only attached fleet tags are omitted

- [x] 1.1 Narrow the Crew plugin's verified-binding tag suppression to the child; packaged plugin assertions retain the coordinator's Crew label/tooltip, hide the attached fleet's tag and preserve unrelated workers and plugin tags.
- [x] 1.2 Cover binding invalidation, attachment off and Crew disabled in packaged fixtures; only verified attached children receive the special omission, with no new discovery or state writes.
- [x] 1.3 Correct README and docs/TESTING.md tag descriptions; the documented coordinator/child behavior agrees with the delta specification and focused regression results.

## 2. Attached fleet rows use a muted vector elbow in expanded and compact sidebars

- [x] 2.1 Add and package a thin no-fill elbow SVG, replace Spaces chain-badge consumers in expanded rows, compact rail and paired previews, and remove obsolete Spaces-only chain mapping; build output resolves the SVG with the intended thin stroke and no text connector.
- [x] 2.2 Anchor the expanded elbow's vertical stroke beneath the parent badge centre, bend toward an inset muted child name and retain normal row height/hover/selection; render-tree assertions compare leading geometry and theme colour with the supplied mockup's layout.
- [x] 2.3 Add compact/paired-preview regression assertions for the elbow, ordinary numbered badges and unchanged fleet selection/tooltip and paired dragging; focused rendering/reorder fixtures pass without native input or deployment.
- [x] 2.4 Replace README and docs/TESTING.md link-glyph descriptions with expanded elbow and compact-rail behavior; documentation and the delta specification describe the same presentation.

## 3. Worktree markers align with machine chevrons even beside Crew tags

- [x] 3.1 Anchor the trailing branch slot to the machine header chevron's right inset and centre line for ordinary and attached rows, keeping tags to its left; numeric render assertions compare actual header/row anchors rather than merely checking child order.
- [x] 3.2 Extend local/remote rendering cases for Crew and unrelated/multiple pills, long names, child indentation, tag-only rows, hidden icons and renaming; existing ordinary-worktree order and avatar checks still pass.
- [x] 3.3 Document right-edge alignment in README and fixture scope in docs/TESTING.md; the added workspace requirement captures tagged and untagged ordinary/attached rows while historical archived changes remain untouched.

## 4. Consolidated Git repositories fold independently with visible counts and no redundant wording

- [x] 4.1 Remove the aggregate header's `Recorded task PRs` text and entire generic incomplete-list notice without replacement; render assertions cover reported and unreported tasks while preserving Git title/tools, empty states and scoped error/setup behavior.
- [x] 4.2 Extract a shared expanded section-header presentation helper in `src/ui/ui.js` and use it for Spaces machine headers and Git repository headers; regressions compare chevron geometry/style and retain machine plus/status controls, fold actions and drag guards.
- [x] 4.3 Add default-expanded per-repository folding backed by a dedicated localStorage JSON set like `machines.folded`, with visible repository name and task-scoped Open/Closed counts; assertions cover independent toggles, tab/context/refresh changes, panel recreation and no preference export.
- [x] 4.4 Extend `tests/fleet-git.test.mjs` for live counts while collapsed, zero counts, hidden/restored scoped body notices, no extra fetches and no false empty state when all sections fold; update README, docs/TESTING.md and docs/ARCHITECTURE.md to describe folding and remove the promised generic incomplete notice.
- [ ] 4.5 Run the complete CI-selected suite once with `CI=true npm run test:ci` on Node 24, including git-location, pr-agent-links and sidebar-refresh; record actual results and repair affected shared-header stand-in exports without weakening or excluding coverage.

## Workflow follow-up

- Obtain plan approval before editing implementation, tests or active product documentation.
- Keep this PR draft; do not mark it ready, merge or deploy. Native pixel validation remains explicitly unclaimed unless separately authorized.
