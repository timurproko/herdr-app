# Proposal

## Why

The person requests that the attached fleet's chain-icon row also show the Crew pill already shown by its coordinator. Current code and workspace requirements deliberately hide that fleet pill, so this corrects the requested presentation without changing attachment behavior.

## What Changes

- Show the existing Crew pill on both expanded rows of a verified coordinator/fleet pair, including retained presentation during refresh and restart.
- Keep the pill in the existing trailing tags slot, left of the worktree marker; preserve the marker's alignment with the machine chevron.
- Preserve the chain badge, left-aligned muted fleet name, single coordinator drag chip, persisted pair, independent selection and attachment-off behavior.
- Leave compact rail rendering unchanged; update packaged-provider/rendering regressions and current documentation/specification statements that suppress the attached fleet's tag.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-experience`: Both attached expanded rows retain Crew pills, including through persisted-display restoration and refresh, without altering marker alignment or compact rendering.

## Impact

The implementation is limited to the Crew plugin's space-tag contribution in `src/plugins/crew/plugin.js`, packaged Crew tag/refresh fixtures, `tests/spaces-worktree-layout.test.mjs`, README and testing guidance. No public API, dependencies, Git panel, persistence format, native operations or deployment changes are needed. Historical OpenSpec archives remain historical; this delta supersedes their fleet-tag suppression rules.
