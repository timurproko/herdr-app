# Tasks

## 1. Right-anchored Git PR label groups with preserved left flow

- [x] 1.1 Change shared status placement in `src/plugins/git/mod/main.js` to keep tasks/checks and separate review-decision text naturally left-aligned, put ordered assigned pills at the outer robot-control/content right edge, and remove the joining separator; verify focused row tests cover ordinary, coordinator, pinned, scrolling and ghost rows, both tabs, and missing labels/checks/tasks.
- [x] 1.2 Adapt measured overflow allocation to compact tasks first, reduce separate review text next and clip labels last while protecting complete checks and compact fractions; verify fitting full wording, exact fit thresholds, bounded multi-label clipping, no overlap/lone ellipsis and retained tooltips in focused row tests.
- [x] 1.3 Update `tests/git-row-geometry.test.mjs`, `tests/git-row-labels.test.mjs` and related fixtures as needed to compare rightmost pill edges across changing task/check content and absent checks at 280/320/360/390/480px and 75/100/125/130/150/200% zoom; verify unchanged left-run gaps, fixed title/robot slots, three lines, 74px blocks and mutation failures with the targeted test files.
- [x] 1.4 Update README's Git metadata description with the chosen content-edge anchor and overflow order; verify it agrees with the spec delta and focused regression assertions.

## Workflow follow-up

- After implementation approval and completion, run `CI=true npm run test:ci` only when no other suite is running, and report its actual result.
- Inspect required checks on the final implementation head and report their status; keep this PR draft and do not merge or edit PRs 44–47.
- Plan handoff stops before implementation; native UI validation and deployment are not performed by this plan.
