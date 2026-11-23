# Proposal

## Why

The installed Spaces screenshot shows the fleet's Crew pill displaced left of the coordinator's pill by its worktree marker, and a muted chain that does not visually identify its coordinator. The requested correction supersedes the previous marker-at-far-right rule only for rows with plugin tags.

## What Changes

- Put every expanded space row's plugin tags at the existing tag-only right edge; rows with both show name, ahead/behind counts, worktree marker, then tags.
- Preserve the current machine-chevron alignment of worktree markers on rows without tags, including with fleet attachment off.
- Render the attached fleet chain inside a filled 16px rounded badge using the coordinator's actual numbered-badge colour and a white outline glyph, in expanded and compact views. This matches the numbered badge more closely than a coloured glyph on transparency and follows coordinator recolouring.
- Retain left-aligned names, muted fleet-name text, tag styling/tooltips, independent selection, persisted pairing and the single coordinator drag chip.
- Update rendering regressions and human documentation alongside the workspace-experience spec delta.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-experience`: trailing plugin-tag alignment and coordinator-coloured fleet badges in expanded and compact Spaces.

## Impact

- `src/features/spaces/main.js`: row child order, tag-only edge treatment and chain badge colour resolution from the displayed coordinator identity.
- `tests/spaces-worktree-layout.test.mjs`: tagged/untagged layout and colour regressions; existing reorder coverage remains intact.
- `README.md`, relevant testing documentation and this OpenSpec change: replace the superseded visual contract without changing pairing or action authority.
- No new dependency, host API, preference, native patch, deployment or runtime-state migration. Update-row PR #34 and the Git empty-sections task are outside scope.
