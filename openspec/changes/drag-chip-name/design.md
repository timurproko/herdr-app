# Design

## Context

See `proposal.md` for motivation. Spaces already captures the pressed row as the shared drag's `id`, independently of the ordered block in `meta.sources`. `dragPreview` currently replaces the pressed identity with `sources[0]`. Sidebar rows already use `spaceBadge` to render the attached fleet's chain and coordinator-coloured fill. Existing rendering fixtures explicitly require the old always-coordinator preview, while the shared drag and block tests already cover pair dimming and ordering.

This design records the distinction between presentation identity and movement identity so changing the chip cannot accidentally split the pair.

## Goals / Non-Goals

**Goals:** Derive preview identity from the grabbed member and reuse the row's badge presentation in active and returning states.

**Non-Goals:** Change block capture, destination calculation, acknowledgment sequencing, pairing verification, persistence, selection, shared reorder API or the compact rail.

## Decisions

- Resolve the grabbed row from the drag view's original `id`; do not rewrite `meta.sources` to make the fleet first. The captured block remains coordinator-first for both dimming and ordering. Reordering the sources would couple visual identity to commit semantics.
- Reuse `spaceBadge` with the row's linked/block presentation instead of duplicating chain geometry, colour resolution or assets in `dragPreview`. Resolve the same projected row identity that supplies its display name; attachment-off/unlinked rows keep ordinary badges. Retained display facts remain visual only and never authorize a drop.
- Preserve one call to the existing shared `preview` API with only `icon` and `label`. Its active/return/fade lifecycle already preserves the pressed ID; no second chip, timer or drag implementation is needed.
- Replace the always-coordinator assertions in `tests/spaces-worktree-layout.test.mjs` with both-origin badge/name assertions, including distinct parent/fleet saved colours and cancellation phases. Exercise both origins through the shared gesture fixture in `tests/reorder.test.mjs`, preserving existing pair movement and cancellation guards.

## Risks / Trade-offs

- [Borrowing the fleet's independent saved colour] → Compare the fleet chip to the actual sidebar chain badge with deliberately different parent/fleet colour overrides.
- [Changing movement while changing presentation] → Keep `meta.sources`, block/drop logic and persistence untouched; retain both-origin block-order tests and assert captured drag metadata is unchanged by rendering.
- [Stale or removed source during cancellation] → Keep existing missing-identity guards and stale drop refusals; do not invent pairing or broaden action authority to render a chip.

## Migration Plan

No data or preference migration. After approval, ship canonical source and docs through the normal build; rollback is a source revert. Run focused rendering/drag/block regressions before pushing. Run the requested `CI=true npm run test:ci` once on the implementation and report required-check results on the final head. Keep the PR draft from the agent side and never merge; do not modify PRs #34, #36 or #37. No live deployment, session manipulation or native change is needed.
