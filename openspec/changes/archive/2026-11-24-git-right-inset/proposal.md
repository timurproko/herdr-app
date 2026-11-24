# Proposal

## Why

The installed follow-up to #53 matches trailing controls to the panel boundary, not the row highlight boundary the user compares. The current specification explicitly requires that obsolete 11px panel-relative alignment, so correcting it requires a specification change and approval before implementation.

## What Changes

- Match Git robot hover boxes, label pills and repository-header chevron slots to the actual Spaces Crew pill's inset inside its own row highlight: 3 logical pixels rather than Git's current 6.
- Move those Git trailing edges right by 3 logical pixels, retaining the existing row highlight bounds, 24px control slots, glyph centre lines, title reservation and vertical geometry.
- Replace the complete-panel regression's panel-relative oracle with a row-highlight-relative comparison against the actual Spaces renderer across its existing width/zoom and presentation matrix.
- Correct the README and testing guidance to distinguish row-relative from panel-relative geometry and record measured before/after values.
- Remove count-only tab/badge tooltips while retaining loading information and exact totals for abbreviated counts above 999.
- Make Open/Closed tab padding explicitly symmetric around the label and fixed-width, centred count badge; protect both selected states and ordinary/coordinator views with 1/2/3-digit geometry coverage.
- Match the customization-owned sidebar title dropdown's hover fill, radius and height to its inset header icon buttons, without changing native chrome or the separate Verifying presentation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Git trailing alignment is defined relative to each row's highlight, not equal distance from the panels' different outer boundaries; tab counts retain stable reservations with symmetric tab padding and informative-only tooltips.

## Impact

Minimal source changes in `src/plugins/git/mod/main.js` for shared PR trailing padding, repository-header trailing inset and tab segment count presentation; focused changes in geometry/count regressions and related documentation. The shared sidebar-title caller will opt into inset-tool styling in `src/ui/ui.js`, with a rendering parity regression; terminal pane titles retain their existing defaults. No change to Spaces, shared header defaults, pagination, fade logic, pin motion, GitHub reads or installed files. The independent scroll-paging PR #56 remains untouched; its renderer/test changes must retain this row-relative oracle whichever PR merges first.
