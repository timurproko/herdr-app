# Design

## Context

See `proposal.md` for motivation and the workspace-experience delta for the full behaviour contract. Spaces already distinguishes the pressed drag `id` from coordinator-first `meta.sources`. `spaceBadge` supplies the fleet's inherited coordinator colour, but renders a chain instead of a number. Expanded rows append worktree markers before plugin tags. The generic workspace-link projection supplies each row's block and linked-child flag; retained display links are distinct from fresh action-authorizing links.

The existing `spaceTitle` helper already uses `t.foreground` for active names, `t.muted` otherwise and normal weight. Spaces unconditionally overrides attached fleet names to muted, defeating the ordinary selected state. The compact rail already delegates hover/selection to ordinary controls and contains no label.

The space context menu currently renders and writes colour against the clicked space ID, through `setSpaceColor`. Its swatch selection and keyboard focus also use that ID. Routing only the final write would leave the palette misleading, while redirecting the whole menu would retarget rename/close/worktree actions.

## Goals / Non-Goals

**Goals:** Separate movement identity, numbered row identity and shared display colour; reuse ordinary row state styling and existing guarded colour writes. Keep chain placement and tag geometry coherent with worktree metadata.

**Non-Goals:** Change block capture/order/acknowledgements, pair verification/persistence, navigation, tooltips, shared reorder API, preference format, native files or live sessions. No chain or tag is added to the compact rail or preview.

## Decisions

### 1. Ordinary numbers, inherited fill, coordinator metadata

Keep the row's existing list number (`i + 1`), ordinary badge shell and the same numbering source as unlinked rows; do not renumber the model or copy coordinator numbers. Retain the same-machine parent lookup for the attached fleet's fill so list, rail and chip use the coordinator's resolved named/hex/automatic colour. Never copy that colour into fleet preferences.

Use the projected block to recognize its coordinator, rather than names, Crew role hints or Git metadata. Put the existing outline link SVG in the worktree-sized slot (`U.smallIcon`, currently 14px, inside the ordinary slot), in `t.muted`, without a filled background. Fixed order: counts, worktree, chain, tags; chain immediately precedes the coordinator's Crew pill. If unrelated plugin tags would break that adjacency, keep their contents/tooltips and relative order while placing the chain/Crew group after other tags at the trailing edge. The final pill retains the existing right inset; normal Crew-only coordinator/fleet pills remain aligned. The chain is absent for ordinary/unlinked rows and the fleet, and during rename alongside the already-hidden tags/markers. The worktree visibility switch continues to hide only worktree markers, not the independent relationship marker. Rail stays numbered and badge-only.

### 2. Ordinary selected and hover states

Remove the unconditional fleet-name muted override and let the shared `spaceTitle` helper supply normal-weight foreground for active names and muted text for inactive names. Retain ordinary `itemHover` and selected backgrounds, shared drag hover suppression and existing name/directory tooltips. Compare fleet and ordinary row state properties, not hard-coded new colours. Verify that compact controls use ordinary hover/selection and retain white numbered-badge text; do not invent rail labels or an extra hover-only name colour.

### 3. Pair colour action, not whole-menu retargeting

Choosing any palette option, including Automatic, from either attached row changes the coordinator's colour using the existing `setSpaceColor` boundary. The fleet's saved colour and automatic flag stay byte-for-byte unchanged. Inactive attachment or confirmed unlink restores the fleet's independent colour and ordinary colour-menu behaviour.

Capture the colour target and exact pair binding at popup initialization through the generic workspace-link registry. Keep the menu's ordinary target as the clicked space for rename, close, worktree and other actions. Swatch selection, mouse actions and keyboard focus/Enter all use the same captured coordinator colour target. Revalidate the exact same-machine pair through fresh action links before any pair colour write; retained presentation alone is not permission. If membership disappears/changes, the setting/plugin is disabled, a space vanishes or freshness is unavailable while the menu is open, refuse that stale colour action rather than fall back to editing the fleet or retarget a new coordinator. Reopening after detachment yields the normal fleet palette. No render-time writes or preference reconciliation changes.

### 4. Grabbed-row single chip

Resolve the original pressed `id` for the badge's number and label, using the same row badge renderer and current matching attached presentation for fill. Keep coordinator-first `meta.sources` unchanged. One `preview` call receives only icon and label, without chain metadata or extra rows. Active/return/fade states retain the grabbed member's identity; existing cancellation, missing-source and stale drop guards remain intact.

## Risks / Trade-offs

- [Fleet number accidentally replaced with the coordinator's] → Compare actual rendered row/rail/chip numbers against distinct list indices for both origins.
- [Fleet colour lost or pair fill diverges] → Seed distinct saved colours and Automatic flags; assert inherited fill and unchanged fleet preferences through recolouring, palette actions and detachment.
- [Colour palette differs between mouse and keyboard or retargets other actions] → Exercise selected swatches, focus navigation, Enter and clicks; check ordinary captured action IDs and stale bindings.
- [Chain shifts tags or leaks into hidden/rename/rail states] → Measure slots, size, gap, muted colour, tag right inset and child order with counts/worktree combinations and multiple tags on local/remote rows.
- [Selected fleet label remains muted in a stubbed fixture] → Load the real `spaceTitle` helper in state regressions; compare active/inactive fleet and ordinary rows, hover/selection wrappers and compact controls.
- [Visual changes weaken action safety] → Keep pairing, persistence, block-drop and acknowledgment logic unchanged; retain both-origin block move and stale-action regressions.

## Migration Plan

No preference or persisted-pair migration. Update README, `docs/REORDER.md`, `docs/TESTING.md` and the affected workspace specification scenarios, including refresh/reload language that currently promises fleet chain badges. Replace superseded #35 rendering assertions, rather than weakening checks. Rollback is a source revert; no installed files or live deployment is needed.

After plan approval, land each implementation outcome with its tests and documentation. Run focused fixtures before pushing, then the requested `CI=true npm run test:ci` once on the completed implementation. Obtain required-check results on the final head and report pending/failing checks truthfully. Never mark the PR ready or merge from the agent; PRs #34, #36 and #37 are untouched. This revision is planning only and does not authorize implementation before approval.
