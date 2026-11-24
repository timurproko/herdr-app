# Design

## Context

See proposal.md for motivation. The shared renderer is `Changes.pullRow` in `src/plugins/git/mod/main.js`; ordinary, pinned, scrolling, coordinator and swap ghosts all use it. It currently divides post-gutter metadata width with zero-basis 28/14/38/20 flex weights. Checks text itself has `truncate()`. At a narrow width even two-digit counts lose all their digits. The byline independently splits remaining width 45/55 between author and verbose time.

The geometry fixture compares outer boxes across optional states but only checks vertical text containment. It therefore accepts stable cells whose horizontal content is unreadable. Explicit `20px`/`18px` line heights already prevent Herdr's numeric-multiplier bug and must remain.

`pulls.js` computes latest-workflow/check-attempt counts. Both list and targeted reads already obtain rollups. The relay subscribes to check_run, check_suite, status and workflow_run, plus PR/push events. `GitWebhooks.sync` defers delivery by a microtask; ordinary `flushWebhook` serially rereads loaded pages, an older linked PR if necessary, then counts, publishing after the batch. Its dirty flag permits a follow-up. Aggregate reads use three concurrent targeted requests and per-entry dirty flags. These are observed mechanisms, not proof of measured live refresh latency.

The supplied screenshot visibly says **Add this repo in Settings**: that snapshot is not evidence of a healthy enrolled live-update path. Do not enroll it or mutate #40/#41 to manufacture refresh evidence.

## Goals / Non-Goals

**Goals:** Give checks their full natural width, natural left-aligned lower lines, whole compact secondary values only on overflow, and stronger horizontal readability oracles. The approved natural-lower-lines amendment supersedes horizontal empty-cell/no-shift reservations; title and vertical stability remain. Retain 74px blocks, title/robot/state geometry, metadata order, pagination and stale-context safety. Cover completion delivery and an approved bounded pending-only fallback.

**Non-Goals:** Native changes, deployment, webhook configuration, account changes, auto-fix changes, settled-row or enrolled-repository polling, or any changes to #40/#41. The screenshot's Rework is an assigned GitHub label pill, not the separate reviewDecision text; preserve that distinction and exact label names.

## Decisions

### Natural lower-line runs (approved amendment)

Both lower lines use natural content widths, 6px gaps on each side of 3px separator dots, left alignment and trailing free space. Only present groups occupy width, in tasks/checks/labels/review order. The byline is number/author/time in the same run style. No lower-line percentage, equal-width, fixed count/task budget or stretching remains. Checks are non-shrinking complete icon/count groups, including the existing three-digit geometry cases.

The shared pullLine helper measures available width and full/compact alternatives through native on_size_change callbacks. Clipped invisible absolute probes live outside the visible run and cannot add lines, gaps or hover controls. Measurements are normalized by zoom, retained by native element ID across data refreshes, guarded by context/visibility and notify only when changed after layout. Full content remains natural until the complete line needs shortening; tasks become fractions first, byline time becomes compact, then review/labels or author can clip as needed. Zero-width clipped groups and their redundant dots disappear. Full values remain in line/group tooltips.

Rejected: guessed character metrics, threshold-only forced compact forms, fixed count/task reservations, stretching spare space between values, and a fourth line. Natural horizontal movement as facts arrive is explicitly permitted by the amended request; the title/agent/state slots, three line boxes and 74px block remain fixed.

### Semantic compact forms, full tooltips

Generate compact task fractions from numeric done/total facts, not substring truncation, only when full task wording makes the whole metadata line overflow. Time retains the action and full wording while its byline fits and becomes a whole compact token only on overflow. Keep status icons/colours and full tooltips. Secondary narrow author/label/review text clips without painting a lone ellipsis. Do not rename assigned GitHub labels.

### Existing event refresh, explicit timing limits

Drive completion, partial success/failure and rerun fixtures through the real ordinary and aggregate invalidation paths. Include a completion after an earlier read has captured old data, and require the dirty follow-up to publish the new result. Repair dropped invalidations only where reproduced; keep hidden/disabled/stale-scope guards and latest-run semantics intact.

There is no configured CI debounce/poll delay in the consumer beyond deferred delivery and single-flight queuing. End-to-end time is GitHub webhook delivery/propagation + relay/native dispatch + any outstanding request + GitHub reads. Ordinary batches use 30-second per-command bounds and publish after all loaded pages/target/count reads, so they have no fixed short maximum. Coordinator targeted reads are also bounded at 30 seconds and queued three at a time. Read failure retains last-good data; the new fallback repairs pending unenrolled rows, but no polling repairs an already-settled missed rerun or an enrolled/offline setup. Document these facts and report measured timing only if actual observation is possible without changing live setup; fixture timing must be labelled synthetic.

### Approved pending-only fallback

Use 45 seconds between successful reads of shown pending/unknown rows when a repository is not enrolled (or has no configured source). Enrolled repositories remain event-only, including during a temporary disconnect. Group pending rows into one repository job, target only those PRs, and coalesce behind the existing ordinary/aggregate request queues. Keep previous rows during reads. A failed job backs off at 90/180/360 seconds up to a 12-minute cap; rate-limit refusals wait at least 15 minutes. Stop new reads immediately on hide, disable, offline machine, changed scope or settlement. A known empty rollup is settled, not an eternally unknown count. Re-evaluate eligibility at dispatch and before publication. Use one-shot native timers, never a render-time read or frame loop.

Update the existing no-periodic-CI spec narrowly for this fallback; all settled and event-covered rows retain the existing no-polling guarantee. Regressions use fake clocks and reads for settlement/stop, hidden/offline cancellation, queue coalescing, errors/backoff and preserved on-screen values.

### Readability regressions alongside geometry regressions

Extend `tests/support/git-row.mjs` only as needed to expose natural text width, allocated content width and effective clipping/truncation. Add horizontal checks independently from stable-box comparisons so removing check minimum width or restoring truncation fails. Preserve title and vertical no-shift assertions, line-height mutation tests, label palette/tooltips and agent/pin interactions; replace obsolete lower-line horizontal reservations with natural-width/constant-gap/trailing-space assertions.

Matrix: 280/320/360/390/480 logical px; 75/100/125/150/200% zoom; one/two-digit totals and 1/1, 3/10, 10/10, 11/11, 99/99; pass/fail/pending icons; optional tasks/labels/reviews/agents; ordinary/pinned/scrolling/coordinator/ghost; Open/Closed/merged. Assert count text plus icon is inside its ancestors, full and untruncated, and no rendered cell contains only an ellipsis. Check whole compact task/time forms and full tooltips.

## Risks / Trade-offs

- Less space for author, verbose tasks or the separate review decision → prefer readable semantic shortening; retain full hover values and exact label facts.
- Synthetic text metrics differ from GPUI → retain conservative padding and identify fixture versus native evidence honestly; do not claim native pixels from a model.
- GitHub data can lag completion events → exercise in-flight follow-ups and the pending unenrolled fallback, disclose stale conditions, and never promise an unconditional latency SLA.
- The existing paginated rollup query requests the first 100 contexts → the requested one/two-digit coverage is within that bound; report larger-provider limitations separately rather than equating layout capacity with API completeness.

## Implementation evidence

- The amended shared row uses native-measured natural runs for number/author/time and tasks/checks/labels/review. Full wording remains at fit; real overflow selects whole fractions/compact time before secondary clipping. Geometry now covers 47,250 natural-flow comparisons including 390px and exact shortening thresholds, while retaining title/vertical stability and full checks containment.
- The new fallback scheduler and batched checks reader live in `pulls.js`; ordinary and coordinator readers share their existing queue. Known enrollment disables fallback even on transport outage. Unknown enrollment uses fallback until live coverage is confirmed.
- A stale older-PR targeted request could overwrite an event snapshot. The delivered repair shares the snapshot queue across related/list/event/fallback reads and uses a per-PR epoch/generation publication guard. Failed replacement snapshots release the related cache key; pagination and held-publication regressions cover both findings. Fallback jobs hold their lease across bounded 20-PR chunks and publish only a complete selection.
- Geometry passes 38,700 resolved-box comparisons plus horizontal clipping/line-height mutations. Fallback, pagination, fleet, webhook, pin, context-menu and sidebar focused fixtures pass. A read-only GraphQL request against this PR confirmed the actual batched query shape (no changes to PRs 40/41).
- No other suite process was present in the Windows process inventory before `CI=true npm run test:ci` ran with a 1,800-second tool timeout. It completed with exit 1: a menu fixture lacked the newly imported helper exports and the sidebar fixture still expected verbose task text. Both fixtures were updated for the new contract, preserving their original interaction/icon checks and adding compact/full-tooltip assertions; focused reruns pass. The broad suite was not looped. Final-head hosted checks are the integration gate.
- No deployment, native pixel inspection or live end-to-end event latency measurement was performed. Pending-only fallback cannot discover a new rerun on an already-settled unenrolled row until another ordinary refresh; enrolled transport outages still rely on reconnect/manual catch-up. The existing first-100-context list read remains a larger-rollup provider limit, distinct from text geometry.

## Migration Plan

No persistent state/schema migration. After plan approval, ship source/tests/docs only through this draft PR. Run quick focused regressions for each outcome. Once no other suite is running, run `CI=true npm run test:ci` once with a long timeout, retain its log and report its real exit status or startup/load failure. Inspect final-head required-check status; a plan-only draft has no app test suites and must not be represented as green implementation CI. Never mark ready or merge. No installation/deployment is part of this task.
