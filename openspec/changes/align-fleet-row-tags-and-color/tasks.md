# Tasks

## 1. Right-aligned space tags after worktree metadata

- [x] 1.1 Reorder expanded row content to name, ahead/behind counts, worktree marker and tags; compare rendered child order and the final tag edge against a tag-only coordinator row.
- [x] 1.2 Preserve the chevron-axis inset only for untagged markers; cover ordinary/attached local and remote rows, multiple/no tags, hidden markers, long names and rename with `node tests/spaces-worktree-layout.test.mjs`.
- [x] 1.3 Update README's worktree/tag placement text and the relevant TESTING.md coverage description; check that documentation and the spec delta agree about tagged versus untagged rows.

## 2. Coordinator-coloured chain badges in both sidebar modes

- [x] 2.1 Render an inset white outline chain in the numbered badge's filled 16px rounded shell using the current projected coordinator's resolved colour; assert shell dimensions, fill and glyph in expanded and compact fixtures.
- [x] 2.2 Exercise distinct parent/child colours, named and literal hex overrides and coordinator recolouring with the real colour resolver; retain left text anchors, muted fleet names, badge-only rail, click/tooltip targets, disabled numbering and single coordinator drag-chip assertions.
- [x] 2.3 Update README's fleet badge description and TESTING.md coverage text; run `node tests/spaces-worktree-layout.test.mjs` and `node tests/fleet-reorder.test.mjs` to check presentation and unchanged block behavior.
- [x] 2.4 Run `CI=true npm run test:ci` once on the completed implementation and record its actual result and any remaining native visual-validation limit without deploying.

## Validation result

`CI=true npm run test:ci` passed on Node 24.22.0 / Windows: 165 supported suite entries, 3 documented exclusions. Targeted Spaces rendering and fleet-reorder fixtures also passed. These fixtures do not prove native pixels; no deployment or changed live-app visual validation was performed.

## Workflow follow-up

- Obtain approval of this draft plan before editing implementation files.
- Inspect and report the required checks on the final implementation head; leave readiness and finalization to automation, never mark ready or merge.
- Report the PR, worktree, branch, commit, change ID, behavior and known gaps to the fleet-row-align task report, then run `crew done fleet-row-align` and stop.
