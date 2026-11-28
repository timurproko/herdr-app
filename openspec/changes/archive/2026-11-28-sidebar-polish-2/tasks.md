# Tasks

## 1. Agents group chevrons use Spaces square hover controls

- [x] 1.1 Reuse the shared Spaces disclosure presentation in Agents group headers with propagation-safe fold handlers; verify one toggle per activation, unchanged header folding and no agent selection in a focused renderer fixture.
- [x] 1.2 Preserve chevron centres and number/status spacing at 100% and 130%; extend and run tests/agents-dot-column.test.mjs and tests/agents-grouping.test.mjs for both fold states and unchanged group order.
- [x] 1.3 Document the shared group-chevron treatment in the relevant README sidebar description and confirm the diff changes no unrelated sidebar interaction.

## 2. Git stage and verdict buttons share tight longest-caption sizing

- [x] 2.1 Introduce common caption-derived sizing in Git's stage/verdict controls only, preserving existing measurement guards and single-element verdict structure; verify the longest caption has exactly 6px side padding and shorter captions are centred in tests/git-stage-box-geometry.test.mjs.
- [x] 2.2 Cover fixed captions, Build rounds 2–99 and supplied longer rounds across ordinary/coordinator, visible/probe/ghost presentations at 100%/130%; run the focused geometry, stage interaction and mounted render-budget fixtures without relaxing existing row or builder limits.
- [x] 2.3 Update the native sizing fixture and README, docs/ARCHITECTURE.md and docs/TESTING.md descriptions that promise own-caption widths; confirm Git headers, reads, cache/reveal and pin motion remain outside the diff.

## 3. Crew contributes a default-on Spaces label toggle with contextual alignment

- [x] 3.1 Declare Crew's hidden default-true label-visibility setting and generic Show icons menu contribution; verify enabled-only checked rows, setting persistence and disabled callback refusal in focused registry/Crew fixtures.
- [x] 3.2 Compose plugin entries through Spaces' existing checked menu rows and include them in popup height; verify row order, check updates, menu staying open and unchanged Machine status/Worktree icon toggles.
- [x] 3.3 Scope Crew tag suppression to Spaces queries without removing attachment/count/disclosure or terminal-pane Crew badges; cover local/remote, connected/independent and plugin off/on cases in focused Spaces/tag fixtures.
- [x] 3.4 Remove blank count/disclosure rails on childless Crew rows and align label right edges with the machine-chevron column; update PR 103 assertions in Spaces layout and Git right-edge tests at 100%/130%, retaining the existing parent grid when children exist.
- [x] 3.5 Update README and plugin contribution documentation for the new menu entry and its presentation-only scope; run only directly affected Spaces, Crew and plugin-boundary tests and record any remaining native pixel-validation gap.
