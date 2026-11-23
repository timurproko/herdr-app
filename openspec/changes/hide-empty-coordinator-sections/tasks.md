# Tasks

## 1. Tab-specific repository sections and ordinary empty states

- [x] 1.1 Filter rendered sections using selected-tab eligible rows or applicable read notices before folding, while retaining the full repository inventory for enrollment and updates; verify with mixed Open/Draft and Merged/Closed renderer fixtures.
- [x] 1.2 Base empty presentation on qualifying sections and reuse ordinary Git's settled tab wording while retaining loading/unverified feedback; verify both empty tabs, notice-only sections and all-folded eligible sections.
- [x] 1.3 Extend fleet renderer/read-notice/history/enrollment regressions for tab switching, saved-fold reappearance, expired history and hidden-tab enrollment choices; retain render-phase focus/notify guards and run the targeted fixtures.
- [x] 1.4 Update README, docs/ARCHITECTURE.md and docs/TESTING.md for visibility, unchanged totals, retained folds and inventory-based enrollment; verify descriptions match the spec delta and fixture assertions.

## 2. Enrollment banner geometry matches ordinary Git without account drift

- [ ] 2.1 Give enrollment an explicit compact choice-trigger presentation and align its actual card/content geometry with ordinary Git; verify equal height/padding/icon dimensions and a common icon/text/Settings/chevron centre line.
- [ ] 2.2 Extend tests/choice-menu.test.mjs and its renderer support to compare actual ordinary/coordinator card geometry at representative zooms while retaining existing account, popup, keyboard and render-phase assertions; run choice-menu and fleet-enrollment fixtures.
- [ ] 2.3 Update README, docs/ARCHITECTURE.md and docs/TESTING.md for the compact enrollment-only presentation and unchanged account default; verify documentation and the revised shared-choice spec agree.

## Workflow follow-up

- Implementation remains blocked until the maintainer approves this draft plan.
- After implementation, run the requested `CI=true npm run test:ci`, refresh from the latest default branch without incorporating unrelated unmerged PR #34, and report required checks on the exact final head.
- Leave readiness and OpenSpec finalization to delivery automation; do not manually mark ready, merge or deploy.
