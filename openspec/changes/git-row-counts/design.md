# Design

## Context

See proposal.md for motivation. The shared renderer is `Changes.pullRow` in `src/plugins/git/mod/main.js`; ordinary, pinned, scrolling, coordinator and swap ghosts all use it. It currently divides post-gutter metadata width with zero-basis 28/14/38/20 flex weights. Checks text itself has `truncate()`. At a narrow width even two-digit counts lose all their digits. The byline independently splits remaining width 45/55 between author and verbose time.

The geometry fixture compares outer boxes across optional states but only checks vertical text containment. It therefore accepts stable cells whose horizontal content is unreadable. Explicit `20px`/`18px` line heights already prevent Herdr's numeric-multiplier bug and must remain.

`pulls.js` computes latest-workflow/check-attempt counts. Both list and targeted reads already obtain rollups. The relay subscribes to check_run, check_suite, status and workflow_run, plus PR/push events. `GitWebhooks.sync` defers delivery by a microtask; ordinary `flushWebhook` serially rereads loaded pages, an older linked PR if necessary, then counts, publishing after the batch. Its dirty flag permits a follow-up. Aggregate reads use three concurrent targeted requests and per-entry dirty flags. These are observed mechanisms, not proof of measured live refresh latency.

The supplied screenshot visibly says **Add this repo in Settings**: that snapshot is not evidence of a healthy enrolled live-update path. Do not enroll it or mutate #40/#41 to manufacture refresh evidence.

## Goals / Non-Goals

**Goals:** Give check text a real minimum/intrinsic budget, deterministic empty reservations, whole compact secondary values, and stronger horizontal readability oracles. Retain 74px blocks, title/robot/state geometry, metadata order, pagination and stale-context safety. Cover completion delivery and an approved bounded pending-only fallback.

**Non-Goals:** Native changes, deployment, webhook configuration, account changes, auto-fix changes, settled-row or enrolled-repository polling, or any changes to #40/#41. The screenshot's Rework is an assigned GitHub label pill, not the separate reviewDecision text; preserve that distinction and exact label names.

## Decisions

### Width-only reservations rather than content-driven flex

Replace proportional check allocation with a stable non-shrinking check budget covering at least icon + gap + 99/99 (and retain the existing three-digit geometry case). Derive the remaining cell budgets from available logical width, prioritizing assigned review-label pill space before verbose task wording and the separate review-decision text. Keep all reservations and separator gutters mounted when facts are absent. Preserve visual tasks/checks/labels/review order: allocation priority is not display order.

Any width measurement needed for choosing a compact variant must be shared across row variants, scope-safe and changed-only, with no render-time notify or writes. Never choose a cell width from whether the optional content exists. Remove truncation from the checks value itself and ensure ancestors cannot shrink/clip it. Actual counts longer than the realistic reservation still require full text, not an ellipsis; exercise that boundary rather than silently capping the value.

Rejected: merely increasing the check flex weight (no minimum guarantee); intrinsic optional cells with reclaimed empty space (breaks no-jump); adding a fourth row line (breaks block height).

### Semantic compact forms, full tooltips

Generate compact task representations from numeric done/total facts rather than substring truncation. Select full text, compact fraction with tasks, or icon plus fraction based on reserved width. Keep status icons/colours unchanged. Use a compact time representation from timestamps (including merged/closed cases), with full byline in the tooltip; reserve stable number/author/time slots. For other narrow text/pills, show a meaningful fragment or suppress the unrepresentable text with full group hover information, never paint only an ellipsis. Do not rename assigned GitHub labels.

### Existing event refresh, explicit timing limits

Drive completion, partial success/failure and rerun fixtures through the real ordinary and aggregate invalidation paths. Include a completion after an earlier read has captured old data, and require the dirty follow-up to publish the new result. Repair dropped invalidations only where reproduced; keep hidden/disabled/stale-scope guards and latest-run semantics intact.

There is no configured CI debounce/poll delay in the consumer beyond deferred delivery and single-flight queuing. End-to-end time is GitHub webhook delivery/propagation + relay/native dispatch + any outstanding request + GitHub reads. Ordinary batches use 30-second per-command bounds and publish after all loaded pages/target/count reads, so they have no fixed short maximum. Coordinator targeted reads are also bounded at 30 seconds and queued three at a time. Read failure retains last-good data; the new fallback repairs pending unenrolled rows, but no polling repairs an already-settled missed rerun or an enrolled/offline setup. Document these facts and report measured timing only if actual observation is possible without changing live setup; fixture timing must be labelled synthetic.

### Approved pending-only fallback

Use 45 seconds between successful reads of shown pending/unknown rows when a repository is not enrolled (or has no configured source). Enrolled repositories remain event-only, including during a temporary disconnect. Group pending rows into one repository job, target only those PRs, and coalesce behind the existing ordinary/aggregate request queues. Keep previous rows during reads. A failed job backs off at 90/180/360 seconds up to a 12-minute cap; rate-limit refusals wait at least 15 minutes. Stop new reads immediately on hide, disable, offline machine, changed scope or settlement. A known empty rollup is settled, not an eternally unknown count. Re-evaluate eligibility at dispatch and before publication. Use one-shot native timers, never a render-time read or frame loop.

Update the existing no-periodic-CI spec narrowly for this fallback; all settled and event-covered rows retain the existing no-polling guarantee. Regressions use fake clocks and reads for settlement/stop, hidden/offline cancellation, queue coalescing, errors/backoff and preserved on-screen values.

### Readability regressions alongside geometry regressions

Extend `tests/support/git-row.mjs` only as needed to expose natural text width, allocated content width and effective clipping/truncation. Add horizontal checks independently from stable-box comparisons so removing check minimum width or restoring truncation fails. Preserve all existing no-shift assertions, line-height mutation tests, label palette/tooltips and agent/pin interactions.

Matrix: 280/320/360/480 logical px; 75/100/125/150/200% zoom; one/two-digit totals and 1/1, 3/10, 10/10, 11/11, 99/99; pass/fail/pending icons; optional tasks/labels/reviews/agents; ordinary/pinned/scrolling/coordinator/ghost; Open/Closed/merged. Assert count text plus icon is inside its ancestors, full and untruncated, and no rendered cell contains only an ellipsis. Check whole compact task/time forms and full tooltips.

## Risks / Trade-offs

- Less space for author, verbose tasks or the separate review decision → prefer readable semantic shortening; retain full hover values and exact label facts.
- Synthetic text metrics differ from GPUI → retain conservative padding and identify fixture versus native evidence honestly; do not claim native pixels from a model.
- GitHub data can lag completion events → exercise in-flight follow-ups and the pending unenrolled fallback, disclose stale conditions, and never promise an unconditional latency SLA.
- The existing paginated rollup query requests the first 100 contexts → the requested one/two-digit coverage is within that bound; report larger-provider limitations separately rather than equating layout capacity with API completeness.

## Implementation evidence

- The shared row now reserves 68px for checks and 60px for whole task fractions; remaining width goes 9:1 to labels/review decisions. Relative time always uses the compact form, preserving full wording on hover. Label/review text clips without ellipsis-only paint.
- The new fallback scheduler and batched checks reader live in `pulls.js`; ordinary and coordinator readers share their existing queue. Known enrollment disables fallback even on transport outage. Unknown enrollment uses fallback until live coverage is confirmed.
- A stale older-PR targeted request could overwrite an event snapshot. The event refresh now invalidates that older lease; the pagination regression resolves an obsolete targeted read after the new count and requires the new value to survive.
- Geometry passes 38,700 resolved-box comparisons plus horizontal clipping/line-height mutations. Fallback, pagination, fleet, webhook, pin, context-menu and sidebar focused fixtures pass. A read-only GraphQL request against this PR confirmed the actual batched query shape (no changes to PRs 40/41).
- No other suite process was present in the Windows process inventory before `CI=true npm run test:ci` ran with a 1,800-second tool timeout. It completed with exit 1: a menu fixture lacked the newly imported helper exports and the sidebar fixture still expected verbose task text. Both fixtures were updated for the new contract, preserving their original interaction/icon checks and adding compact/full-tooltip assertions; focused reruns pass. The broad suite was not looped. Final-head hosted checks are the integration gate.
- No deployment, native pixel inspection or live end-to-end event latency measurement was performed. Pending-only fallback cannot discover a new rerun on an already-settled unenrolled row until another ordinary refresh; enrolled transport outages still rely on reconnect/manual catch-up. The existing first-100-context list read remains a larger-rollup provider limit, distinct from text geometry.

## Migration Plan

No persistent state/schema migration. After plan approval, ship source/tests/docs only through this draft PR. Run quick focused regressions for each outcome. Once no other suite is running, run `CI=true npm run test:ci` once with a long timeout, retain its log and report its real exit status or startup/load failure. Inspect final-head required-check status; a plan-only draft has no app test suites and must not be represented as green implementation CI. Never mark ready or merge. No installation/deployment is part of this task.
