# Design

## Context

See proposal.md for motivation. The icon correction is implemented in `7d714fb`; the tooltip and ellipsis additions are not. PR #61 was subsequently refreshed automatically with main's header-hover change; that refresh does not implement either addition.

`main.js` unconditionally assigns repeat-only tooltips to title, byline, task/check groups, label strip/pills and review text. `pullLine` already knows available/full/compact widths and final clipping allocations. Title rendering uses native `.truncate()` at 13px semibold with a 20px line; repository and panel-name headers also use native truncation. There is no custom underscore or ASCII-dot suffix in these callers. The native SDK documents `.truncate()` as using an ellipsis. Disposable App 0.1.18 captures at 100%/130% now reproduce the flat stroke in explicit Geist with both native truncation and literal U+2026, normal/semibold weights and a taller line. Segoe UI paints distinct dots: the cause is the Geist glyph at these sizes, not a custom suffix or vertical clipping.

Existing tests explicitly require unconditional pill/byline values and no robot tooltip; those expectations must change intentionally, not be bypassed. Existing PR facts retain timestamps; `checks()` currently drops individual check names after computing newest-run counts. Ordinary related-agent targets and coordinator targets currently expose different identity shapes.

## Goals / Non-Goals

**Goals:** Use one information-dependent tooltip policy across shared row paths, retain informative facts already read, preserve all geometry and icon offsets, and resolve readable Unicode truncation at the customization boundary.

**Non-Goals:** No extra GitHub/agent requests on hover, new periodic job, new hidden per-row measurement probes, native patch/rebuild, unrelated header hover redesign, paging/rate-limit work, or live deployment.

## Decisions

### Tooltip eligibility is per item, not per entire line

Feed each lower-line item's existing full/compact selection and allocated width into tooltip eligibility. A parent byline/metadata hover must not revive redundant full-line text when its child is fully visible. A parent may expose genuinely hidden items, such as a completely clipped review value or omitted labels. Invisible measurement probes have no hover tooltips.

| Item | Tooltip condition | Content |
| --- | --- | --- |
| Title | Actual title overflow only | Full original title |
| PR number | Only a genuinely hidden/abbreviated number | Full number; normally no tooltip because the complete number is visible |
| Author | Allocated width clips the full login | Full login, not the complete visible byline |
| Time | Compact/clipped wording, or a valid exact event timestamp adds information | Full action and relative wording plus exact UTC timestamp when known; no repeat-only relative wording when fully visible and no timestamp exists |
| Task progress | Compact fraction or clipped full wording | Full task-progress phrase; none for complete visible wording |
| Checks | Known failing/pending check names add detail, or a hidden count needs recovery | Complete count with named failing/pending checks; none for a complete count with no extra details |
| Label pill | That name is actually clipped | Full exact name, including emoji |
| Label group/metadata fallback | A label is clipped/omitted, including coordinator's three-pill cap | Full assigned label list; none when every name is visible |
| Review decision | Clipped or entirely hidden decision | Full decision phrase, attached to a surviving metadata target if needed |
| State icon | A semantic state/conflict is not stated in visible text | Specific state or Merge conflicts; no repeat-only duplicate if that same fact is visible |
| Robot button | A current related agent's display identity is known | Open agent followed by that name; no generic repeated robot tooltip, and absent/stale/ghost targets gain no action authority |

Do not remove accessibility labels when suppressing tooltips. Unknown details remain absent, never inferred. Preserve newest-workflow/rerun selection when retaining failing/pending names; thin unchanged-summary reads retain known details rather than erasing them. Display identity does not become part of action authority or loosen stale-target guards.

### Reuse native fit facts; do not guess or silently add probes

Metadata decisions reuse `pullLine`'s current measurements, including clipping of the right strip and coordinator's omitted label count. Existing repository-header measurements can drive that header's tooltip. Existing visible-element layout callbacks may be used without adding hidden elements; invalidated scope/zoom callbacks must remain harmless.

**Approved resolution:** the person approved implementation of outcomes 2 and 3 and explicitly permits the shared measurement cache introduced by #45: distinct string + style + interface font + zoom, 512-entry bound and one pending probe per snapshot. Title and pill intrinsic widths use that cache alongside existing available-width callbacks. Warm strings add no probe; hidden probes per row on every render and guessed character budgets remain forbidden. If title truncation still cannot be established reliably, the separately approved fallback is full-title tooltips for all titles, with that exception reported; other items remain informative-only. The implementation can measure title fit, so that fallback is not currently needed.

### Diagnose and fix truncation at the owning customization layer

Compare actual U+2026 and ordinary letter bounds in the title's selected face/weight at 100% and 130%, against byline/metadata and repository/header rendering. Inspect the native suffix semantics read-only. Keep 20px title and 74px row boxes unchanged.

The diagnosed remedy is native-width prefix fitting plus one literal U+2026 in normal-weight Segoe UI; only the suffix changes face/weight. Binary search chooses the fitting prefix from real cached native widths, retaining Unicode code points and common combining/ZWJ clusters. Each distinct candidate uses the approved bounded shared cache, not a recurring per-row probe or character-budget estimate. Native layout callbacks drive convergence without a JavaScript frame loop. Preserve the complete original for informative tooltips. Fitting strings are unchanged. There is no ASCII-period substitution or host patch.

### Preserve the existing delivered geometry

Keep the task/check +1px relative offsets, 18px metadata/byline lines, 20px title, 74px blocks, horizontal anchors, 24px robot targets, label right anchor and separator offsets. Test ordinary/pinned/scrolling/coordinator/ghost and Open/Closed paths at the existing width/zoom matrix, specifically 100%/130%. Do not claim a synthetic layout fixture certifies native glyph rasterization.

## Risks / Trade-offs

- Cold title/pill fit facts → Use the approved bounded shared cache; suppress repeat-only tips until measurements resolve, and reject stale callbacks.
- Font availability outside Windows is unverified → Native evidence is explicitly Windows-only; retain this limitation rather than claiming cross-platform pixel validation.
- Parent tooltips can duplicate suppressed child values → Assert the complete ancestor hover chain as well as each item's tooltip.
- Additional check details can regress rerun ordering → Keep names inside the existing newest-workflow selection and test event/fallback updates without new reads.
- Agent names can be stale → Bind display identity to the existing exact target and preserve captured click guards; do not use names as identifiers.
- Previous full CI was on the original icon head and was superseded remotely → Report exact tested SHAs; run the requested isolated broad suite after implementation and final-head checks when approval permits it.

## Migration Plan

This is a source-only UI change with no persisted-data migration. After approval and feasibility resolution, deliver outcomes 2 and 3 separately, updating their tasks and PR checkboxes as each code/test outcome lands. Revert only the tooltip/ellipsis commits to roll back added behavior, preserving the already delivered icon nudge. No installation is part of this plan.
