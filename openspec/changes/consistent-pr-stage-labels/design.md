# Design

## Context

See `proposal.md` for motivation. `pullRow()` derives `pr.stage` only from managed GitHub labels. `stageDescriptor()` in `src/plugins/git/mod/main.js` immediately returns when that field is absent; `renderPullRow()` then renders `agentButton()` beside the title. This is the first-build split: missing managed-label assignment, not missing `crew.round`. An existing Build stage without valid round metadata already displays Build; completed round 1 displays Build 2.

`AgentLinks.roleMatches()` already resolves ship/fix targets using a full `crew.pr` or verified repository/head-branch evidence. Neither that API nor `crewMetadata()` exposes a planning/implementation phase. Coordinator `stageTarget()` additionally constrains targets to freshly verified same-home task membership. These are the authority boundaries to reuse, not replace.

Stage chips currently use `.px(2)` and assemble alias/history/unavailable/Open agent tooltip text. Row presentations and lower-line parent tooltips can also expose managed aliases. Removing only the chip's tooltip is insufficient.

## Goals / Non-Goals

**Goals:** one comfortable, tooltip-free stage control; initial-build projection from existing exact live build targets; unchanged focus and native pin-motion safety.

**Non-Goals:** changing GitHub labels or Crew state, introducing Plan as a fourth stage, guessing phase from PR title/draft/agent activity, changing loading/counts/section ordering, or redesigning unrelated robot navigation.

## Decisions

### Keep assigned facts separate from presentation fallback

Assigned managed labels retain their existing precedence. For an unlabelled Open/Draft PR only, resolve the existing build-role target. If it is live and, in coordinator mode, freshly verified as same-home membership, present Build in the bottom-right label group and suppress its title robot. Do not mutate cached GitHub facts or persist an inferred label. Reuse the same descriptor in visible, measurement and ghost rendering, with appropriate inertness.

This is preferable to writing a Build label to GitHub, inventing review history, or requiring `crew.round` as a gate. Keep target/round changes in the row-presentation cache key so fallback arrival, removal and round changes cannot leave stale geometry or captions. Action-time checks must compare the captured authoritative label facts and current effective stage, not mistakenly reject a projected Build because the cached assigned stage remains null. Reuse existing agent-focus and `PinSwap` behavior; no second navigation controller.

### State mapping

| Evidence | Visible control / action |
| --- | --- |
| Assigned Build, Rework or Changes needed, optionally robot-prefixed | Build; ship/fix target focus if live, otherwise dim/inert |
| Assigned Review or Under review, optionally robot-prefixed | Review; exact PR-linked reviewer focus if live, otherwise dim/inert |
| Assigned Approved, optionally robot-prefixed | Approved; open the PR, independent of CI |
| No managed label, Open/Draft PR, verified live ship/fix target, no valid completed round | Build; same build-owner focus, no robot |
| Same with completed round 1 / 2 | Build 2 / Build 3; same build-owner focus |
| Planning-only ship/fix task with its linked Open/Draft PR | Build by the same rule; no implementation approval or progress is implied |
| Planning task without a PR | No PR row or control |
| No managed label and no verified live build target | No inferred stage; unrelated existing non-build agent-navigation fallback stays unchanged |
| Unlabelled Closed/Merged or historical-only PR | No inferred Build from old task metadata |

Missing/invalid round or finding data invents nothing. Assigned Review/Approved always beats a concurrent live build agent. Reviewer/scout roles are never relabelled Build just because a generic related-agent link exists.

### Preserve the existing chip pattern

Use the same 18px plain control, radius, raised surface, amber/purple/green text and trailing anchor, changing side padding to 6 logical pixels. Keep three lines and 74px blocks, full title width for stages, bounded label allocation and probe parity. This adds breathing room without a new visual pattern.

Remove chip hover popups, including unavailable reasons and findings, and omit stage-only tooltip values from existing group/metadata presentation. Keep accessible action labels and expose known disabled reasons there, including disconnected machine identity. Preserve unrelated clipped-label/task/check/time hover and full-title tooltips. Raw aliases and optional metadata may remain in source facts; they are not shown as stage hover.

## Risks / Trade-offs

- [No explicit planning phase exists] → Build names the build-owner action, including planning-only ship/fix tasks; document this rather than claim phase inference.
- [Fallback can accidentally authorize stale coordinator focus] → Reuse exact live target/membership resolution at click time; presentation-only retained data cannot grant authority.
- [Synthesized stage differs from assigned facts] → Keep them distinct and cover captured actions before/after label/role/context changes, including an unchanged null assigned stage.
- [Parent hover can restore unwanted stage text] → Exercise actual lower-line fit paths for stage-only and mixed strips, not just the chip node.
- [Extra padding consumes metadata width] → Retain existing compaction/clipping priorities and test narrow rows, title width, fixed height and trailing anchor at 100%/130%.
- [Other workers edit the Git panel] → Touch only row-stage/label code and the minimum existing guarded target boundary, never panel loading, counters or repository projection/order.

## Migration Plan

No data migration, installation or protocol change. After approval, use targeted synthetic stage, role-link and row-geometry tests. Capture ordinary/pinned/coordinator stage views and unavailable controls at 100% and 130% using only disposable native fixtures and the supplied 0.1.18 executable after archive/executable checksum verification. Store proof outside the checkout in the crew task folder and stop every started process. Publish through the existing origin branch path; dispatch CI for the final implementation head because draft PR suites skip. Do not wait for CI, mark ready or merge. Rollback is reverting the focused row changes through the normal project path.
