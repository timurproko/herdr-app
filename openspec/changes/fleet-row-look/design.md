# Design

## Context

See proposal.md for motivation and specs/workspace-experience/spec.md for the observable contract. Both supplied screenshots were inspected, including the later screenshot showing the unwanted stacked floating preview. This design records the badge geometry, text styling and single-chip correction before implementation.

`Spaces.fleetConnector()` currently allocates a 24px expanded slot or 16px compact slot and places a 24px elbow SVG in a 28px-high wrapper. Ordinary `badge()` uses `U.icon` (16px) for both width and height. The expanded content's existing 8px gap means that the wider connector alone introduces the fleet-name inset. `Spaces.dragPreview()` supplies two rows to the shared reorder preview for captured pairs. Only that Spaces caller consumes the stacked-preview option.

The removed outlined link asset is available verbatim at `ffb0dba^:src/shared/link.svg`: a no-fill, currentColor, rounded 1.5-unit stroke vector in a 24-unit viewBox. Active specs explicitly forbid chain glyphs and require elbows, so a delta must supersede those clauses, including the old elbow references in refresh/restart scenarios. Archived changes remain historical records.

## Goals / Non-Goals

**Goals:**
- Use the same 16px icon box, leading slot and row centering as ordinary numbered badges, not the old oversized connector wrapper.
- Make the floating preview visually ordinary while retaining block metadata and all domain-level reorder protections.
- Keep the scope isolated from concurrent Git-panel and Crew-reader tasks.

**Non-Goals:**
- No changes to pair identity, verification, persistence, discovery, ordering acknowledgements, native-space selection or tooltip policy.
- No unrelated shared reorder refactor or new preview/motion behavior.
- No deployment or live session manipulation.

## Decisions

### Restore one real link vector in the numbered-badge slot

Restore the exact historical link SVG, package it for custom-spaces and render it at `U.icon` with `t.muted`, flex-none and the existing content centering. A single helper serves expanded and compact fleet rows. Remove the obsolete elbow asset and mapping if no consumer remains. Reject a text chain character and the 24px absolute-positioned wrapper: neither matches the requested vector badge geometry.

### Retain muted text without indentation

Keep the existing muted fleet-name treatment. Alignment is corrected by equal badge-slot width, not label padding or offsets. The muted name still provides quiet hierarchy next to the coordinator's normal name and numbered badge, while its left edge now matches every other space name. Keep existing right-tail composition and margins untouched so the worktree marker remains on the machine-chevron axis. Normal text was considered but would discard the existing subordinate treatment without a readability need demonstrated by the reference.

### Render exactly one coordinator drag chip

For either member of a captured two-space block, resolve its coordinator from captured block sources and pass the coordinator's ordinary numbered badge, color and displayed name through the existing single-preview path. Do not pass a rows array or introduce a fleet/chain preview. Keep the original pressed ID and captured sources unchanged; selection, both-source dimming, block targeting, acknowledgement sequencing and stale-pair refusal remain domain responsibilities. Ordinary standalone-space previews are unchanged.

Remove the now-unused stacked-row option in `src/ui/reorder.js` and its stacked-preview assertion in `tests/reorder.test.mjs`, without touching shared drag geometry or motion. Replace the Spaces paired-preview assertions with single-chip checks for gestures starting from either coordinator or fleet. Update `docs/REORDER.md` to describe block sources with a single coordinator chip rather than a stacked chip.

### Keep behavioral regressions and current documentation coherent

Extend `tests/spaces-worktree-layout.test.mjs` to compare actual ordinary badge dimensions with the link badge box, name anchors and vertical centering in expanded and compact modes. Cover muted vector color, no connector asset, manifest packaging, single coordinator preview from either grabbed member, unchanged ordinary previews, trailing marker alignment, selection, tooltips, tag treatment and retained-pair action guards. Keep the persistence/ordering fixtures intact. Replace active elbow/paired-preview wording in README and testing documentation; the delta carries spec updates without rewriting prior archives.

## Risks / Trade-offs

- [A 24-unit SVG could accidentally be rendered at its intrinsic size] → Assert its rendered box equals the real 16px numbered badge, not merely the asset viewBox.
- [Single-chip normalization could accidentally change the drag source or dim only one row] → Only normalize preview content; retain captured sources and tests for both-source feedback and block ordering.
- [Shared reorder cleanup could affect other surfaces] → Remove only the unused stacked branch and assertion; retain ordinary tab/icon preview regressions.
- [Render-tree tests cannot establish final native visual quality] → Report that limitation honestly; no deployment is authorized. Source fixtures cover geometry deterministically.

## Migration Plan

No state migration or deployment is part of this task. After plan approval, implement the presentation-only changes, run focused Spaces/reorder fixtures, then run `CI=true npm run test:ci` before the implementation report. Keep the PR draft and do not merge. Reverting the source change restores the previous presentation without altering persisted pair identity.
