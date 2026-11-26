# Tasks

## 1. Shared Spaces and Agents trailing grid

- [x] 1.1 Implement the recommended design grid with shared existing UI primitives, plain Crew labels and collapsed-only child-space counts; assert exact machine/coordinator chevron and hover bounds, plus/Crew right edges, Agents number/time alignment and simultaneous Crew/count placement in real-renderer fixtures at 100%/130%.
- [x] 1.2 Extend spaces-worktree-layout, agents-dot-column and relevant fleet/reorder coverage for local/remote groups, one/two/three children, long names, truncation, selection, compact badges, native shortcuts and captured block membership; preserve Git's existing 3px trailing inset with an independent geometry oracle.
- [x] 1.3 Update README and docs/TESTING.md for plain Crew and collapsed counts, reconciling legacy pill/no-count wording without changing native identity or action-authority documentation; check against the workspace delta.

## 2. Tab-spaced sidebar rename

- [ ] 2.1 Put Cancel on the shared chevron axis for coordinator, child and ordinary space editors, using existing 24px icon buttons, 2px button gap and 4px input gap; assert measured production tab/space geometry and hidden nonediting controls.
- [ ] 2.2 Extend rename-selection/space-rename regression cases for Enter, Escape, blur, repeated rename and captured remote targets; document the trailing-column contract in the existing rename guidance and verify no draft/selection behavior changes.

## 3. One complete-lifecycle Git loading line

- [ ] 3.1 Replace the pending-CI-only one-shot sweep with the same single native moving line throughout shown-panel cold, warm and background work in ordinary/coordinator modes; use scoped lifecycle completion and assert overlapping requests, stale verification, long reads, error, hide, disable, context replacement and dormant cooldown behavior.
- [ ] 3.2 Remove the Git header bulb/tooltip, make only Git cold Loading dot and Refresh static, and retain cold text, warm rows, visible failures and shared activity elsewhere; update git-inventory-presentation, fleet-git, relevant refresh/diagnostic fixtures and README/testing guidance with assertions against duplicate panel-loading animations.
- [ ] 3.3 Adapt disposable interface/rename native fixtures for the full combined change, checksum-verify the supplied 0.1.18 archive/executable, capture synthetic 100%/130% local/remote one/multiple-child, long-name, hover/rename and cold/warm/background Git states under the crew task folder; inspect two moving-line phases, completed states and cleanup receipts proving all owned processes stopped.

## Workflow follow-up

- Stop after publishing this draft plan and wait for explicit implementation approval; all tracked tasks remain unchecked until code and tests land.
- During implementation tick each delivered PR outcome immediately after its code/tests commit; refresh main before the last outcome and leave readiness to automation.
- Dispatch the test workflow on the exact final implementation/finalized head, confirm Windows and Ubuntu pass, report known gaps honestly and stop without merge or auto-merge.
