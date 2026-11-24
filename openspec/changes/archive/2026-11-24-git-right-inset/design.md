# Design

## Context

See proposal.md for motivation. The specification added by #53 currently mandates equal 11px panel-relative trailing insets; this change replaces that contract, rather than silently claiming the existing implementation violates it. Inspection used the actual Spaces and Git render trees through their existing deterministic geometry harnesses, with no installed-file edits or native deployment.

## Goals / Non-Goals

**Goals:** Match the visible gap between the trailing painted control/pill and its own row highlight edge. Keep a single robot/chevron centre line and a stable title reservation across agent presence and every row variant. Make tab-pill padding symmetric around labels and painted badges without digit-driven tab movement, and show only informative count tooltips.

**Non-Goals:** Moving Spaces, changing shared header defaults, normalizing unrelated panel gutters, altering vertical geometry, changing pagination or scroll fades, or touching PR #56's branch.

## Decisions

### Use the highlight boundary as the oracle

Spaces' real `sidebar-scroll.js` list has 8px horizontal padding; its real row has 8px padding and the last `rolePill` has a -5px trailing margin. Thus the painted Crew pill ends **8 - 5 = 3px inside the row highlight**, and **8 + 3 = 11px inside the sidebar**. Git currently has a 1px panel border, 4px list padding and 6px row trailing padding: its highlight is 5px inside the panel, and its robot hover box and label pills are 6px inside that highlight, also 11px inside the panel. The shared header caller uses the same 6px trailing inset.

Measured actual renderer boxes at 390 logical-pixel width (continuous scaled coordinates, not rounded native pixels):

| Renderer / measurement | 100% before | 130% before | 100% proposed after | 130% proposed after |
| --- | ---: | ---: | ---: | ---: |
| Spaces sidebar edge to row highlight edge | 8 | 10.4 | 8 | 10.4 |
| Spaces highlight edge to Crew pill edge | 3 | 3.9 | 3 | 3.9 |
| Spaces sidebar edge to Crew pill edge | 11 | 14.3 | 11 | 14.3 |
| Git panel edge to row highlight edge | 5 | 6.5 | 5 | 6.5 |
| Git highlight edge to robot box / label pill edge | 6 | 7.8 | 3 | 3.9 |
| Git panel edge to robot box / label pill edge | 11 | 14.3 | 8 | 10.4 |

Before values were measured from both real renderer trees using `rowGeometry`, not inferred from the screenshot. After values are proposed arithmetic until implemented and measured. At 130%, screenshot raster rounding can make the 3.9px target look like 4–5px and the current 7.8px gap look like 8px.

### Change only trailing padding, not row highlights

Set the shared Git row's right padding and the Git repository-header caller's trailing inset from 6px to 3px. Preserve left padding (8px), vertical padding (6px), all line heights, 74px blocks and the 24px robot reservation/hit target. Centre the existing 16px robot and 14px chevron glyphs exactly as today. Titles gain the same 3px of space whether or not an agent exists.

The highlight insets genuinely differ: Git is 5px versus Spaces' 8px. Keep them: their difference does not prevent matching the requested highlight-relative gap. Increasing Git's list padding to 7px to equalize the highlight-to-panel inset would cancel the explicitly requested rightward control motion, move state/title left anchors and unnecessarily touch pinned/scrolling/ghost wrapper geometry. Equal panel-relative edges were precisely the wrong oracle in #53.

### Compare each trailing edge to its own highlight

In `tests/git-right-edge.test.mjs`, obtain the Spaces row and Crew pill boxes from the actual renderer. Subtract their right edges to derive the expected inset, then compare Git row/header right edges minus robot slots, actual robot hover boxes and actual trailing pills. Keep a separate assertion for each renderer's highlight-to-panel inset so accidental wrapper padding or borders cannot mask a regression. Negative-margin behavior remains independently checked.

Preserve the 280/320/360/390/480px by 75/100/125/130/150/200% matrix, Open/Closed/merged, agent presence, ordinary/pinned/scrolling/ghost/coordinator paths, folded/expanded headers and paged continuation headers. Mutation guards must reject restored 6px padding, altered header slot geometry and unaccounted borders. Retain title reservation/truncation, fixed vertical anchors, 24px hit targets and ghost noninteraction checks.

### Symmetric tab pills and informative-only count tooltips

The approved extension uses the existing shared `segment` renderer for ordinary and coordinator views. Keep 8px tab padding on both sides, a 6px label-to-badge gap and a 32px badge reservation, with centred digits. Give the label a measurable node and constrain the painted badge itself to 32px rather than relying on a percentage-width nested child. This explicitly keeps the painted badge's right edge at the padded content edge without moving either tab as counts change between one, two and three digits.

Known exact totals through 999 have no tab or badge tooltip. Unknown totals retain `Count loading; showing 0`; totals above 999 show `999+` with their full exact count in the badge tooltip. Accessible labels retain the exact count and loading state. Use symmetric 4px padding inside the badge so the four-character overflow indicator remains bounded; no per-render text-measurement work or guessed fit threshold is introduced.

Extend `tests/git-count-badges.test.mjs` to lay out the actual ordinary and coordinator panel tab strips at 280–480px and 75–200% zoom including 130%. Both tabs and selected/unselected states must have equal label-left and painted-badge-right insets, centred badge text, complete one/two/three-digit totals and unchanged tab/badge bounds across digit changes. Keep unknown/loading, same-context retention and true context reset coverage. Tooltip assertions distinguish visible exact, loading and abbreviated cases. Update the standalone segment geometry expectation for the explicit overflow indicator and document what tooltip information remains.

### Sidebar title hover matches customization-owned inset tools

The header is not native panel chrome: both Git render paths call `sidebarTitle()` from `src/ui/sidebar-title.js`, which calls the customization's `panelTitle()` in `src/ui/ui.js`. The same Git header renders customization refresh/close icon buttons and `panelPin()`. No native patch is needed or permitted.

Opt only sidebar-title callers into an inset `panelTitle` variant: 24px height (`U.insetControl`), 4px radius (`U.insetRadius`) and `subtleActionFill(t)` hover (foreground at alpha 0x0a, with the existing fallback). Keep panelTitle's terminal-pane defaults unchanged. Static one-plugin titles remain noninteractive. Preserve menu capture/stale guards and full icon/label/chevron hit area. Match the existing iconButton's hover foreground state; there is no custom keyboard-focus or transient pressed treatment on these div-based icon buttons to duplicate. The pin toggle's persistent selected/pressed state remains pin-specific, not a state for the dropdown to inherit. Do not touch Verifying text or status.

Extend the actual sidebar title rendering fixture to compare its hover callback style, height and radius against an actual inset iconButton and active unpinned panelPin, including dark/light/custom foregrounds and fallback colour. Retain plugin availability, static titles and stale-dropdown tests; assert a default terminal panelTitle still uses its original styling.

### Coexist with independent scrolling work

Do not incorporate #56's paging/fade implementation. Reconcile only the shared row/header padding and geometry oracle if default-branch changes land first. Assertions should reason about rendered row boundaries rather than specific paging-container names wherever feasible, preserving that PR's separate paging tests and budget.

## Risks / Trade-offs

- **Synthetic geometry is not native paint evidence** → Report measured renderer values and screenshot scaling separately; do not claim native pixel validation or installation.
- **Two PRs edit the same module/test** → Keep source diff to the two trailing inset settings, comment, shared segment presentation and sidebar-title styling; preserve whichever viewport implementation lands first.
- **Old panel-relative checks would reject the intended fix** → Replace their oracle and document the deliberately different 8px Git versus 11px Spaces panel-relative trailing insets.
- **Host load from concurrent full suites** → After approval, run quick targeted geometry checks first; run `CI=true npm run test:ci` only when no other suite is active, once, then read required-check results on the final head without a foreground watch.

## Migration Plan

No data or preference migration is needed. Implementation will use the normal source build path; no live deployment is part of this plan. Reverting the two Git trailing padding settings restores the previous geometry, together with the corresponding spec/test/documentation contract.
