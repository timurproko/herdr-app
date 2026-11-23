# Tasks

## 1. Numbered attached rows, coordinator chain and ordinary name states

- [x] 1.1 Update `src/features/spaces/main.js` so fleet badges retain their own list number and coordinator-derived display fill in expanded and compact views; assert distinct saved fleet colours are never overwritten and reappear on detachment.
- [x] 1.2 Move the outline chain to the coordinator's trailing metadata slot, immediately before Crew, with fixed counts/worktree/chain/tag order, worktree-matching geometry and muted colour; assert no chain badge, fleet chain, rail chain or chain during rename and unchanged trailing tag alignment with multiple tags.
- [x] 1.3 Remove the unconditional fleet name tint and use the real shared title helper in rendering tests; compare ordinary/fleet active colour and weight, inactive muted text, selected background, hover treatment, tooltip and compact control states.
- [x] 1.4 Replace superseded #35 assertions in `tests/spaces-worktree-layout.test.mjs` and affected retained-presentation fixtures; cover local/remote, counts/worktree combinations, worktree-hidden and rename states, then pass the focused rendering and fleet-refresh fixtures.
- [x] 1.5 Update the attached-row and retained-presentation descriptions in `README.md` and `docs/TESTING.md`; confirm they describe own numbered badges, shared coordinator fill, coordinator metadata chain and ordinary selected fleet text rather than the superseded fleet chain badge.

## 2. Pair colour controls preserve independent fleet preferences

- [x] 2.1 Add a captured pair-colour target to the space menu using the generic workspace-link registry, leaving all non-colour actions bound to the clicked space; confirm rename, close and worktree action IDs never retarget to the coordinator.
- [x] 2.2 Make selected swatches, mouse colour choices and keyboard focus/Enter use the same coordinator target for attached fleet menus, including Automatic; retain existing colour-state write guards and assert the fleet's saved colour and Automatic flag remain unchanged.
- [x] 2.3 Revalidate the captured same-machine pair before writes, refusing stale, unavailable, changed, missing or disabled bindings without falling back to the fleet; add menu regressions covering detachment/reopening, unrelated spaces and ordinary attachment-off behaviour, and pass focused colour-menu fixtures.
- [x] 2.4 Extend real resolver rendering regressions to show coordinator recolouring synchronously in expanded and rail badges and restore the independent fleet colour after unlink/disable; document fleet-menu shared-colour semantics and guards in `README.md` and `docs/TESTING.md`.

## 3. Grabbed-row single chip with unchanged pair movement

- [x] 3.1 Update `dragPreview` to use the grabbed row's name and own numbered badge with its projected pair fill through the existing badge renderer; confirm no chain, extra chip, block-source rewrite or drop-logic change.
- [x] 3.2 Replace always-coordinator preview assertions with both-origin active/arm/return/fade rendering checks, distinct parent/fleet numbers and saved colours, coordinator recolouring synchronized with row/rail badges, missing identities and attachment-off cases; pass `node tests/spaces-worktree-layout.test.mjs`.
- [x] 3.3 Extend both-origin shared gesture regressions for one chip and the original pressed identity while retaining pair dimming, cancellation and ordering guards; pass `node tests/reorder.test.mjs` and `node tests/fleet-reorder.test.mjs`.
- [x] 3.4 Update `README.md`, `docs/REORDER.md` and `docs/TESTING.md` chip descriptions to match the workspace-experience delta, including the example `2 crew` versus `1 coordinator`; confirm no current documentation still promises an always-coordinator chip.
- [ ] 3.5 Run the requested `CI=true npm run test:ci` once after implementation, record the result and obtain required-check results on the final pushed head for handoff; report pending or failed checks as blockers rather than claiming success.
