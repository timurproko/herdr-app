# Tasks

## 1. Git stage and verdict controls fit their captions with normal padding

- [ ] 1.1 Remove the common stage/verdict minimum-width probe/cache and dependent keys/harness assumptions; assert each caption's natural width plus 6px side padding with `node tests/git-stage-box-geometry.test.mjs` at 100% and 130% zoom.
- [ ] 1.2 Preserve guarded actions, title width, right rail and 74px row height across ordinary, coordinator, pinned and ghost presentations; check `node tests/git-stage-chips.test.mjs`, `node tests/pr-agent-links.test.mjs` and `node tests/git-row-geometry.test.mjs`.
- [ ] 1.3 Replace README and docs/ARCHITECTURE.md common-width wording with the caption-sized contract and check the diff contains no unrelated behavior changes.

## 2. Spaces crew labels retain their column with or without child controls

- [ ] 2.1 Reserve the existing numeric/disclosure rail geometry for every crew-bearing row without inventing visible controls; extend `node tests/spaces-worktree-layout.test.mjs` for combined-off, childless, expanded/folded, local/remote, long-name and 100%/130% cases.
- [ ] 2.2 Keep unrelated metadata, rename, Agents and compact rail unchanged; update the relevant README/docs/TESTING.md alignment description and check the focused layout assertions.

## 3. Delivery kinds tooltips use aligned regular names and muted descriptions

- [ ] 3.1 Reuse the shared description-hint surface for two aligned columns with regular foreground names, muted wrapping descriptions and no separating dashes; extend `node tests/plugin-description-hint.test.mjs` to assert shared description starts and unchanged passive hover/focus, wording and legacy table support.
- [ ] 3.2 Update README's bold-name tooltip description and relevant docs/TESTING.md expectations; check `node tests/crew-projects-ui.test.mjs` for unchanged Projects controls, list and actions.
- [ ] 3.3 Inspect safe disposable renderer output for the three changed areas if available, keeping proof in the crew task folder and stopping all started instances; otherwise explicitly report the native visual gap without claiming proof.
