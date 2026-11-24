# Tasks

## 1. Highlight-relative Git trailing alignment

- [x] 1.1 Change only shared Git PR right padding and repository-header trailing inset from 6px to 3px, with comments deriving Spaces' 8px padding minus 5px trailing pill margin; verify the robot hover box, pills and chevron slots move right by 3 logical pixels without changing their common column, 24px targets, agent-free reservation, title consistency or vertical anchors.
- [x] 1.2 Replace the complete-panel geometry regression's panel-relative oracle with actual Spaces row-highlight-to-Crew measurements; verify ordinary, pinned, scrolling, ghost and coordinator rows, both agent states, Open/Closed/merged, expanded/folded and continuation headers across 280–480px and 75–200% zoom including 130%, retaining mutation guards and separate wrapper-inset assertions.
- [x] 1.3 Update README.md and docs/TESTING.md to describe 3px highlight-relative padding, Git's retained 5px versus Spaces' 8px highlight-to-panel insets, and measured 100%/130% before/after values; verify no obsolete equality-of-panel-insets claim remains for this alignment contract.
- [ ] 1.4 Run targeted geometry regressions, then once no other suite is running execute CI=true npm run test:ci; record final measurements and actual results, reconcile only necessary default-branch conflicts without modifying PR #56's branch, and report required-check status on the final head with native-pixel limitations explicit.
