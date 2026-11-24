# Design

## Approved geometry

Spaces' actual trailing Crew pill edge is 8px list inset + 8px row padding - 5px pill margin = 11px. Git has a 1px outer border and a 4px list inset, so its PR row uses 6px right padding, retaining 8px left and 6px vertical padding.

The shared sidebar header accepts optional trailing slot size and inset. Git requests a 24px slot and 6px inset; existing Spaces defaults remain 16px and 4px. The 14px chevron remains centred, sharing the robot's centre line even though the 16px robot SVG has a different literal right edge. Header height remains 28px and row height remains 74px.

## Preservation

The existing 24px robot button, inert reservation without an agent, captured callbacks, tooltips, row menus, pin/motion layout and all vertical metrics remain unchanged. Ordinary, pinned, scrolling, coordinator and ghost rows share the same row renderer. Folded headers retain the same trailing slot.

## Regressions

Resolve actual complete Git render trees, including their border and list/overlay insets, against actual Spaces chrome, sidebar scroll and Crew-tagged row renderers. Extend the deterministic geometry model for real negative trailing margins and overlay inset bounds, with independent oracles and mutations restoring old padding/header geometry. Compare slot and painted pill right edges at five widths and six zoom levels including 130%; retain existing broad row, action and fold tests. These fixtures prove resolved-box constraints, not native GPUI pixels; no installed app is changed.

## Scope

No navigation, data/CI reads, service or preference changes. No edits to PRs #45, #49 or #51. The branch first fast-forwarded to the unmerged PR #48 head as explicitly requested. Because that head already synced its specs ahead of main, this change carries its exact three requirement deltas too, while canonical specs return to main for bot-owned finalization. This preserves the inherited behavior in the final combined spec without editing PR #48 or bypassing delivery checks.
