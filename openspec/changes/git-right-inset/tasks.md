# Tasks

## 1. Highlight-relative Git trailing alignment

- [x] 1.1 Change only shared Git PR right padding and repository-header trailing inset from 6px to 3px, with comments deriving Spaces' 8px padding minus 5px trailing pill margin; verify the robot hover box, pills and chevron slots move right by 3 logical pixels without changing their common column, 24px targets, agent-free reservation, title consistency or vertical anchors.
- [x] 1.2 Replace the complete-panel geometry regression's panel-relative oracle with actual Spaces row-highlight-to-Crew measurements; verify ordinary, pinned, scrolling, ghost and coordinator rows, both agent states, Open/Closed/merged, expanded/folded and continuation headers across 280–480px and 75–200% zoom including 130%, retaining mutation guards and separate wrapper-inset assertions.
- [x] 1.3 Update README.md and docs/TESTING.md to describe 3px highlight-relative padding, Git's retained 5px versus Spaces' 8px highlight-to-panel insets, and measured 100%/130% before/after values; verify no obsolete equality-of-panel-insets claim remains for this alignment contract.
- [x] 1.4 Run targeted geometry regressions, then once no other suite is running execute CI=true npm run test:ci; record measured insets and actual results and reconcile only necessary default-branch conflicts without modifying PR #56's branch. This run passed before the approved tab-strip extension; its final integration and required-check reporting are covered by task 2.4.

## 2. Symmetric tab count presentation

- [x] 2.1 Remove visible-count-only tab/badge tooltips, retaining loading feedback and exact-number tooltips for counts displayed as 999+ above 999; verify accessible labels still expose exact totals and loading state in ordinary and coordinator views.
- [x] 2.2 Explicitly constrain the painted count badge to its centred fixed-width reservation, with symmetric tab padding; verify one-, two- and three-digit counts preserve badge/tab positions and equal label-left/badge-right insets for both tabs, selected and unselected, at 280–480px and 75–200% zoom including 130%.
- [x] 2.3 Update count-badge regressions and README/testing documentation together with the tab presentation; verify informative-only tooltip behavior, badge-text centring, symmetric padding and existing refresh/context-reset coverage, including bounded large counts.
- [x] 2.4 Run targeted tab count and geometry regressions and record results; the final isolated full suite and head-check reporting after all approved header polish is covered by task 3.3.

## 3. Consistent customization-owned header hover

- [ ] 3.1 Establish header ownership and opt only the customization sidebar title dropdown into the same 24px height, 4px radius and subtle hover fill as its inset icon buttons; verify native chrome, terminal-title defaults and Verifying text are untouched, with no invented pressed/focus state absent from the reference buttons.
- [ ] 3.2 Extend the real sidebar-title rendering regression to compare hover colour/opacity, radius and height against an inset iconButton and unpinned pin toggle across palettes; verify disabled-plugin/static-title and stale-popup behavior remain intact, and document ownership and retained pin-specific pressed state.
- [ ] 3.3 Run targeted tests, then once no other suite is running execute CI=true npm run test:ci after all additions; record results, reconcile default-branch changes without touching PR #56's branch, and report measured geometry and final-head required-check status with native-pixel limitations explicit.
