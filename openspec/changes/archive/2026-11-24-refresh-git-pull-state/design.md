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

**Non-Goals:** New watcher or daemon, full repository discovery in coordinator mode, changing Crew task status, transport/notice redesign owned by PR #45, touching PRs #44/#46, cloud setup, deployment or real PR mutation.

## Decisions

### Reproduce the enrolled path before attributing the incident

Extend packaged-controller fixtures using fake GitHub, real Crew/provider context and actual deferred relay-revision consumer. Hold an old response, merge a settled PR, deliver a pull_request closed invalidation, and sample Open/Closed rows and totals through completion and a coalesced follow-up. Include both stable and refreshed same-home Crew verification. Inspect any lost invalidation, stale publication or tab-membership fault exposed by that scenario and fix only that boundary. If the current event path already passes, report that result explicitly; do not label the proven fallback defect as the explanation for an enrolled incident without evidence.

### Reuse the 45-second repository scheduler with a minimal state-and-check query

Eligibility becomes shown Open/Draft OR pending/unknown checks for unenrolled repositories, and shown Open/Draft for enrolled repositories. Use 45 seconds without confirmed enrollment and the approved 120-second safety cadence with enrollment; events still accelerate reads. Preserve selected-tab, aggregate-fold, visibility, offline and verified-context gates. Continue the existing queue, one-second contention retry, complete-selection publication, epoch/generation guard and failure backoff. Thin probes use bounded 40-PR chunks (one request for 5 or 30 shown rows); changed-row detail reads retain the existing 20-PR bound.

Probe only number, state, isDraft, mergedAt, closedAt, headRefOid and the last commit's rollup STATE, rather than requesting first-100 contexts or launching a subprocess per row. Reuse existing creation/branch facts for presentation. A changed head or summary triggers one bounded detail batch for those rows only, under the same lease; unchanged summaries preserve their known detailed counts. GraphQL cannot condition nested field selection on a returned value in the same response, so changed rows require follow-up requests; unchanged 5/30-row cycles require exactly one request. Include repository-wide Open/Closed totals in the ordinary repository snapshot so totals do not depend on arithmetic over a paginated subset. Aggregate totals remain derived from eligible linked entries only. Ensure row state, completion eligibility and totals commit together only after the complete batch succeeds. Retain labels/tasks/reviews not returned by this deliberately narrow read; do not replace them with empty defaults.

An unenrolled shown settled open PR must remain eligible after checks settle; a settled closed PR need not poll just to rediscover a future reopen. Reopen is covered when its row refresh runs through event/manual/show catch-up, and pending closed rows can still use fallback. Hidden tabs/folded coordinator sections retain existing fallback scope; no global inventory polling is added.

### Reconcile membership without replacing unrelated presentation

Aggregate updates must refresh `completedAt` together with `entry.pr`; its existing eligibility, rows and counts then determine the destination tab. Keep link-map insertion order and deduplication.

Ordinary updates must remove transitioned rows from incompatible cached arrays, insert them once into the appropriate already-loaded destination in the established ordering, and reconcile the older related pin without duplicate slots. An unloaded destination remains lazy and loads authoritative pages when selected. Preserve loaded-page depth/cursors and unaffected relative order; if a state change requires cursor renewal, use the existing coalesced snapshot path rather than silently corrupting pagination. Never clear rows or counts at request start.

### State latency honestly

Enrolled healthy path has no polling interval or fixed end-to-end maximum: refresh starts after relay dispatch and a microtask, then includes GitHub delivery/propagation, queue contention and bounded reads. Aggregate uses at most three concurrent 30-second targeted commands; ordinary snapshots include loaded pages and counts. Missed events/outages are also covered for shown Open/Draft rows by the independent 120-second safety read, plus queue/read time; this does not depend on the relay being connected.

Unenrolled healthy shown-open state freshness is at most 45 seconds of scheduling delay plus queue time and successful GitHub reads: one thin command per at most 40 eligible rows, with a 30-second command timeout; changed rows add full-context commands of at most 20 PRs. A changed individual job count with unchanged head and overall summary needs an event/full refresh or a later summary change; the safety probe deliberately does not enumerate contexts to detect it. Busy retries wait one second; failures use 90/180/360/720-second backoff and rate limits at least 15 minutes. There is no unconditional wall-clock maximum across failures, offline/hidden/stale contexts or GitHub eventual consistency. Documentation must distinguish these source-derived bounds from live latency measurements.

### Cost and secondary limits

For 5 or 30 unchanged shown rows, estimate one primary GraphQL point (minimum per request) and one secondary read-query point per repository cycle: aliases contain one commits(last:1) connection each, with no per-context connections. At most 40 thin rows remain well below Windows argv limits; larger selections use bounded chunks. If all 5 rows change, one detail batch adds roughly one point; if all 30 change, two detail batches add roughly two points. These are estimates, not a guarantee of GitHub's internal CPU/resource charging. Events/manual reads and other agents add separate account load.

A secondary refusal is a rate limit even when hourly remaining points are positive. Keep last-good facts, use the existing at-least-15-minute rate-limit floor, honor any longer Retry-After duration/date from CLI response headers, and never immediately retry. No cycle overlaps its probe/detail lease. Include response headers on safety API reads so Retry-After is available without an extra request.

## Risks / Trade-offs

- [Extra reads for shown open PRs, including enrolled repositories] → Reuse a narrow repository batch, avoid per-row processes, and stop under existing visibility/coverage gates.
- [Partial batches or mixed-age counts] → Hold complete results and publish rows/totals under the same queue and freshness guard; retain all prior facts on failure.
- [Ordinary pagination or pin regressions] → Exercise expanded lists, older pins, merge/reopen, duplicates and retained render samples through real controller fixtures.
- [Enrolled reproduction does not fail on current source] → State the evidence limit and retain a regression instead of inventing an event-routing diagnosis.
- [Overlap with PR #45] → Keep transport/notices unchanged where possible; integrate latest main after it lands and rerun focused checks on the combined head.

## Validation and rollout

Add deterministic fake-clock/transport regressions to the existing packaged fallback, fleet/history, pagination and publication-order suites. Cover merge, close, reopen and draft conversion in both views, settled checks, events during reads, history timestamps, counts, stable unrelated ordering, in-flight retention, hide/disable/offline/stale scope, chunk failure and backoff.

After implementation approval, run focused checks per outcome, then the requested `CI=true npm run test:ci` once no other suite is running. Inspect final-head required-check status without a foreground CI watch; a draft may have app suites skipped by repository policy, which must be reported rather than called green. Keep the PR draft; never mark ready or merge. This change installs or deploys nothing; rollout and rollback use the existing person-authorized customization deployment flow.
