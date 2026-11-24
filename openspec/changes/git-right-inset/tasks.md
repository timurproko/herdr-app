# Tasks

## 1. Highlight-relative Git trailing alignment

- [x] 1.1 Change only shared Git PR right padding and repository-header trailing inset from 6px to 3px, with comments deriving Spaces' 8px padding minus 5px trailing pill margin; verify the robot hover box, pills and chevron slots move right by 3 logical pixels without changing their common column, 24px targets, agent-free reservation, title consistency or vertical anchors.
- [x] 1.2 Replace the complete-panel geometry regression's panel-relative oracle with actual Spaces row-highlight-to-Crew measurements; verify ordinary, pinned, scrolling, ghost and coordinator rows, both agent states, Open/Closed/merged, expanded/folded and continuation headers across 280–480px and 75–200% zoom including 130%, retaining mutation guards and separate wrapper-inset assertions.
- [x] 1.3 Update README.md and docs/TESTING.md to describe 3px highlight-relative padding, Git's retained 5px versus Spaces' 8px highlight-to-panel insets, and measured 100%/130% before/after values; verify no obsolete equality-of-panel-insets claim remains for this alignment contract.
- [x] 1.4 Run targeted geometry regressions, then once no other suite is running execute CI=true npm run test:ci; record measured insets and actual results and reconcile only necessary default-branch conflicts without modifying PR #56's branch. This run passed before the approved tab-strip extension; its final integration and required-check reporting are covered by task 2.4.

## 2. Symmetric tab count presentation

- [ ] 2.1 Remove visible-count-only tab/badge tooltips, retaining loading feedback and exact-number tooltips for counts displayed as 999+ above 999; verify accessible labels still expose exact totals and loading state in ordinary and coordinator views.
- [ ] 2.2 Explicitly constrain the painted count badge to its centred fixed-width reservation, with symmetric tab padding; verify one-, two- and three-digit counts preserve badge/tab positions and equal label-left/badge-right insets for both tabs, selected and unselected, at 280–480px and 75–200% zoom including 130%.
- [ ] 2.3 Update count-badge regressions and README/testing documentation together with the tab presentation; verify informative-only tooltip behavior, badge-text centring, symmetric padding and existing refresh/context-reset coverage, including bounded large counts.
- [ ] 2.4 Run targeted tests and once no other suite is running execute CI=true npm run test:ci after the tab additions; record results, reconcile default-branch changes without touching PR #56's branch, and include measured geometry and final-head required-check status in the report with native-pixel limitations explicit.
