# Proposal

## Why

After seeing merged PR #18 in the installed app, the person rejected the elbow connector and inset fleet name. The attached fleet should read as a left-aligned space row with a chain badge, without changing the pair's behavior.

## What Changes

- Remove every fleet elbow/connector line in expanded Spaces and the compact rail.
- Replace the stacked paired drag preview with one ordinary coordinator chip (numbered badge and name), whichever linked row is grabbed. Both source rows remain dimmed and move together with a block drop indicator; no fleet or chain icon appears in the floating preview.
- Restore the previous outlined link SVG from history and render it in the ordinary 16px numbered-badge slot, with matching vertical centering and muted icon color.
- Align the fleet name with coordinator and ordinary space names. Retain the existing muted fleet-name style to preserve visual subordination without indentation.
- Preserve the right-edge worktree marker's alignment with the machine chevron, coordinator Crew tag, fleet-only Crew-tag suppression, persisted pairing, paired dragging, independent selection and tooltips.
- Replace elbow wording in current documentation and the workspace specification through this change; retain historical archives unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-experience`: Replace the attached fleet's elbow and text inset with a badge-sized chain icon and left-aligned muted name across sidebar presentations, plus a single coordinator drag chip, retaining existing pairing and navigation guarantees.

## Impact

Presentation changes are confined to `src/features/spaces/main.js`, the Spaces SVG asset mapping in `customization.json`, `src/shared/`, sidebar rendering regressions, removal of the unused stacked-preview option and assertion in `src/ui/reorder.js` and `tests/reorder.test.mjs`, `README.md`, `docs/TESTING.md` and `docs/REORDER.md`. No Git panel, Crew status reader, persistence model, ordering controller or host API changes. No deployment, runtime mutation, native rebuild or new dependency is needed. Implementation validation includes `CI=true npm run test:ci`.
