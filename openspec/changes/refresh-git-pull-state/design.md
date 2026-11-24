# Design

## Context

See proposal.md for motivation. Inspection at f6e0339 found:

- `aggregate.js` uses `PR_FIELDS` including state, isDraft, mergedAt and closedAt; `pump()` builds a new `pullRow`, `rows()` partitions by its current state, and `counts()` derives from those same eligible rows. History does not intentionally pin merged PRs in Open, and aggregate counts do not use a separate count cache.
- `main.js::syncTaskWebhooks()` subscribes across all linked repositories and invalidates aggregate entries. `webhooks.js` consumes per-repository revisions and schedules the callback after yielding. Ordinary webhook snapshots already re-read loaded pages, an older pin and repository-wide counts. Source inspection alone does not establish why the enrolled screenshot missed a merge.
- The definite shared gap is `ChecksFallback.eligible()` filtering by pending/unknown checks, `pendingChecksArgs()` querying checks alone, and `readPendingChecks()` replacing only checks/checksKnown. A settled open row stops being read; even a pending row's merge is invisible to this read. Ordinary arrays also need reconciliation rather than a checks-only map.
- Existing fixtures cover checks, webhook history transitions and race ordering separately; they do not cover the exact settled-open-to-merged scenario through both real packaged event and fallback paths together.

The existing spec explicitly prohibits polling settled rows. This is therefore a behavior/spec change requiring plan approval, not merely a small implementation fix.

## Goals / Non-Goals

**Goals:** One coherent state/check publication rule across reader paths; maintain task-scoped aggregate counts and repository-wide ordinary counts; preserve existing bounded transport, history and UI retention.

**Non-Goals:** New watcher or daemon, polling enrolled repositories, full repository discovery in coordinator mode, changing Crew task status, transport/notice redesign owned by PR #45, touching PRs #44/#46, cloud setup, deployment or real PR mutation.

## Decisions

### Reproduce the enrolled path before attributing the incident

Extend packaged-controller fixtures using fake GitHub, real Crew/provider context and actual deferred relay-revision consumer. Hold an old response, merge a settled PR, deliver a pull_request closed invalidation, and sample Open/Closed rows and totals through completion and a coalesced follow-up. Include both stable and refreshed same-home Crew verification. Inspect any lost invalidation, stale publication or tab-membership fault exposed by that scenario and fix only that boundary. If the current event path already passes, report that result explicitly; do not label the proven fallback defect as the explanation for an enrolled incident without evidence.

### Reuse the 45-second repository scheduler with a minimal state-and-check query

Eligibility becomes shown Open/Draft OR pending/unknown checks for repositories without confirmed enrollment. Keep confirmed enrollment event-only and preserve selected-tab, aggregate-fold, visibility, offline and verified-context gates. Continue the existing queue, one-second contention retry, 20-PR chunks, complete-selection publication, epoch/generation guard and failure backoff.

Add state, isDraft, mergedAt, closedAt and enough date/head facts for truthful existing row presentation to the existing batched check query, rather than launching one subprocess per row or fetching full repository lists each cycle. Include repository-wide Open/Closed totals in the ordinary repository snapshot so totals do not depend on arithmetic over a paginated subset. Aggregate totals remain derived from eligible linked entries only. Ensure row state, completion eligibility and totals commit together only after the complete batch succeeds. Retain labels/tasks/reviews not returned by this deliberately narrow read; do not replace them with empty defaults.

An unenrolled shown settled open PR must remain eligible after checks settle; a settled closed PR need not poll just to rediscover a future reopen. Reopen is covered when its row refresh runs through event/manual/show catch-up, and pending closed rows can still use fallback. Hidden tabs/folded coordinator sections retain existing fallback scope; no global inventory polling is added.

### Reconcile membership without replacing unrelated presentation

Aggregate updates must refresh `completedAt` together with `entry.pr`; its existing eligibility, rows and counts then determine the destination tab. Keep link-map insertion order and deduplication.

Ordinary updates must remove transitioned rows from incompatible cached arrays, insert them once into the appropriate already-loaded destination in the established ordering, and reconcile the older related pin without duplicate slots. An unloaded destination remains lazy and loads authoritative pages when selected. Preserve loaded-page depth/cursors and unaffected relative order; if a state change requires cursor renewal, use the existing coalesced snapshot path rather than silently corrupting pagination. Never clear rows or counts at request start.

### State latency honestly

Enrolled healthy path has no polling interval or fixed end-to-end maximum: refresh starts after relay dispatch and a microtask, then includes GitHub delivery/propagation, queue contention and bounded reads. Aggregate uses at most three concurrent 30-second targeted commands; ordinary snapshots include loaded pages and counts. Missed events/outages may remain stale until reconnect/show/manual catch-up.

Unenrolled healthy shown-open state freshness is at most 45 seconds of scheduling delay plus queue time and successful GitHub reads: one command per at most 20 eligible rows, with a 30-second command timeout. Busy retries wait one second; failures use 90/180/360/720-second backoff and rate limits at least 15 minutes. There is no unconditional wall-clock maximum across failures, offline/hidden/stale contexts or GitHub eventual consistency. Documentation must distinguish these source-derived bounds from live latency measurements.

## Risks / Trade-offs

- [Extra reads for settled unenrolled open PRs] → Reuse a narrow repository batch, avoid per-row processes, and stop under existing visibility/coverage gates.
- [Partial batches or mixed-age counts] → Hold complete results and publish rows/totals under the same queue and freshness guard; retain all prior facts on failure.
- [Ordinary pagination or pin regressions] → Exercise expanded lists, older pins, merge/reopen, duplicates and retained render samples through real controller fixtures.
- [Enrolled reproduction does not fail on current source] → State the evidence limit and retain a regression instead of inventing an event-routing diagnosis.
- [Overlap with PR #45] → Keep transport/notices unchanged where possible; integrate latest main after it lands and rerun focused checks on the combined head.

## Validation and rollout

Add deterministic fake-clock/transport regressions to the existing packaged fallback, fleet/history, pagination and publication-order suites. Cover merge, close, reopen and draft conversion in both views, settled checks, events during reads, history timestamps, counts, stable unrelated ordering, in-flight retention, hide/disable/offline/stale scope, chunk failure and backoff.

After implementation approval, run focused checks per outcome, then the requested `CI=true npm run test:ci` once no other suite is running. Inspect final-head required-check status without a foreground CI watch; a draft may have app suites skipped by repository policy, which must be reported rather than called green. Keep the PR draft; never mark ready or merge. This change installs or deploys nothing; rollout and rollback use the existing person-authorized customization deployment flow.
