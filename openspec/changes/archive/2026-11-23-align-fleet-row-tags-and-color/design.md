# Design

## Context

See proposal.md for motivation. `Spaces.row()` currently appends plugin pills before the worktree slot and applies the tag-only negative right margin only when no marker exists. `gitTail()` already puts ahead/behind counts after the flexible title/repository area. `fleetBadge()` is a transparent muted SVG in both sidebar modes. `projectLinkedRows()` supplies each row's block IDs, so its parent identity can be read without new discovery or action permission.

The current workspace-experience requirements explicitly demand the old tag-before-marker order and muted chain. This change deliberately replaces those clauses; it does not alter the persisted display/action separation established by the earlier fleet fixes.

## Goals / Non-Goals

**Goals:** Keep the correction within existing presentation paths and assert real element order, trailing-edge arithmetic and live colour resolution in rendering fixtures.

**Non-Goals:** No pairing/reorder algorithm changes, new reads, preferences, timers, Git panel changes, update-row changes, native modifications or deployment. Retained presentation may supply badge identity but never authorizes an action.

## Decisions

### Tags own the trailing edge

Read the row's plugin tags once outside editing. Append the existing worktree slot before those pills, leaving ahead/behind counts in the preceding git tail. Apply the existing tag-only final-pill inset for every tagged row; apply the marker's chevron-alignment negative margin only when no tags follow it. This makes both Crew pills meet the screenshot's coordinator edge without moving untagged markers. Do not reserve an empty icon column or widen/change pills: either would move the coordinator's existing tag edge. Multiple tags keep their existing order and styling, with the last pill defining the shared trailing edge.

### Filled coordinator-coloured chain badge

Use the same 16px, 4px-rounded filled shell and white foreground as the numbered badge, containing an inset outline chain SVG (approximately 12px). A coloured glyph on transparency would carry the colour but would not match the numbered badge's filled visual weight. The filled shell is therefore the proposed choice in both expanded and compact modes; the chain remains an outline, not a solid silhouette.

Resolve the coordinator using the row's projected block parent ID and the current native spaces, and pass that parent's colour through the existing `spaceBadgeColor()` resolution with current `space.colors`. Do not derive colour from row index, hard-code teal, use the fleet's colour, or persist a copied colour. If the displayed parent is no longer present, do not invent a coordinator identity; normal projection removal retains the existing detach rules. Keep `dragPreview()` unchanged so it continues to show the coordinator's ordinary numbered chip.

### Focused regressions and documentation

Extend `tests/spaces-worktree-layout.test.mjs` to compare coordinator-with-tag-only against fleet-with-counts/marker/tag, for local and remote groups. Cover ordinary tagged worktrees, multiple tags, no tags, hidden markers, long names, active/inactive rows and rename. Assert untagged marker/chevron geometry separately from tagged trailing-pill geometry.

Use distinct coordinator/fleet colours and the real colour resolver to prove both sidebar modes inherit only the coordinator's current fill, including a recolour between renders, while preserving badge dimensions, left text anchor, tooltip, click target and one-chip drag assertions. Keep disabled-attachment numbering and existing stable-pair/reorder suites intact. Update README's Spaces visual descriptions and the relevant TESTING.md coverage paragraph; the main spec will receive the delta through normal finalization, not direct edits during planning.

## Risks / Trade-offs

- A 16px outline drawn edge-to-edge inside a filled badge could crowd its shell → inset the glyph and preserve the existing numbered-badge shell geometry.
- A trailing negative margin could distort the marker-to-pill gap → use the marker's old negative margin only without tags and check geometry alongside child order.
- A fixture returning one constant badge colour could hide accidental use of the fleet's colour → exercise the real resolver with differing IDs, named colours and literal hex overrides.
- VM layout assertions are not native pixel evidence → report their limit explicitly; the supplied screenshot is baseline evidence only, and deployment is prohibited.

## Migration Plan

No state migration or deployment is part of this task. After plan approval, implement the two outcomes in order with targeted fixture checks before each push. Run `CI=true npm run test:ci` once for the completed implementation, read the final-head required-check status and report it without marking ready or merging. Do not run those implementation checks for this planning-only handoff. Any future authorized deployment uses the normal guarded source packaging; rollback is a source revert, not a rewrite of preferences or pair records.
