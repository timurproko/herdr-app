# Design

## Context

See proposal.md for motivation. The specification added by #53 currently mandates equal 11px panel-relative trailing insets; this change replaces that contract, rather than silently claiming the existing implementation violates it. Inspection used the actual Spaces and Git render trees through their existing deterministic geometry harnesses, with no installed-file edits or native deployment.

## Goals / Non-Goals

**Goals:** Match the visible gap between the trailing painted control/pill and its own row highlight edge. Keep a single robot/chevron centre line and a stable title reservation across agent presence and every row variant.

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

### Coexist with independent scrolling work

Do not incorporate #56's paging/fade implementation. Reconcile only the shared row/header padding and geometry oracle if default-branch changes land first. Assertions should reason about rendered row boundaries rather than specific paging-container names wherever feasible, preserving that PR's separate paging tests and budget.

## Risks / Trade-offs

- **Synthetic geometry is not native paint evidence** → Report measured renderer values and screenshot scaling separately; do not claim native pixel validation or installation.
- **Two PRs edit the same module/test** → Keep source diff to the two trailing inset settings and comment; preserve whichever viewport implementation lands first.
- **Old panel-relative checks would reject the intended fix** → Replace their oracle and document the deliberately different 8px Git versus 11px Spaces panel-relative trailing insets.
- **Host load from concurrent full suites** → After approval, run quick targeted geometry checks first; run `CI=true npm run test:ci` only when no other suite is active, once, then read required-check results on the final head without a foreground watch.

## Migration Plan

No data or preference migration is needed. Implementation will use the normal source build path; no live deployment is part of this plan. Reverting the two Git trailing padding settings restores the previous geometry, together with the corresponding spec/test/documentation contract.
