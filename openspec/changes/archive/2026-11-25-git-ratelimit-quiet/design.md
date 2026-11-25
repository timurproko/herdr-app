# Design

## Approved reduction

The coordinator removed the new event/window/enrollment scheduling after four review rounds. This PR keeps quiet refusals and read-shape/cache optimizations only. It does not promise retained invalidation ownership, debounce deadlines, inactive-window suspension or automatic enrollment recovery.

## Quiet boundary

`GitReads` wraps panel GitHub calls, sharing compatible in-flight API reads and a conservative machine/account cooldown. Preserve exit/signal/timeout facts, HTTP headers, Retry-After and GraphQL errors until strict rate classification. Primary/secondary/429 evidence is quiet; bare 403, authentication, network, process, timeout and malformed failures remain actionable.

A rate refusal preserves loaded rows, counts, pin and pagination, or standard cold Loading. Automatic panel PR reads honor at least fifteen minutes or longer Retry-After. One manual Refresh can bypass once; another refusal stops fan-out and stays in the same logged episode. A successful admitted read ends the episode. Cooldown retry callbacks re-evaluate the selected tab, preserving a loaded destination's expanded depth.

Enrollment retains main's per-repository checks on configuration/explicit Refresh, with no retry timer or deferred queue. Its worker still returns sanitized typed rate facts; shared admission keeps refusal quiet without changing global setup or claiming unenrollment.

## Read shape and cache

- Coordinator reads use aliased metadata/summary batches of at most twenty PRs per repository, with bounded concurrency. Unknown historical links are read once for truthful task totals; no repository-wide inventory is substituted.
- gh exits 1 for useful partial GraphQL responses. Valid alias-scoped partial replies preserve healthy siblings and classify missing/access aliases separately. Rate, transport, HTTP, process, timeout, malformed and unscoped failures remain whole-request failures.
- Route-qualified module-session facts isolate repository, machine and credential scope. Compatible pending target/list facts are reused, with subscriber-local publication/authority checks. Cached facts contain no worker authority and are not persisted as PR inventory.
- Known Closed/Merged facts, including labels/checks, are reused across refresh/context recreation. Historical eligibility and relative wording age locally. Ordinary Open inventory can contradict a cached final state; coordinator external reopen/metadata/late-CI changes otherwise wait for a new session or independent contradictory evidence.
- Metadata includes head SHA and rollup summary. Only new/changed heads/summaries fetch check contexts in twenty-row chunks. Preserve the forty-row thin safety shape and latest-workflow/rerun semantics. Publish complete selections rather than partly replacing rows after a failed detail chunk.
- Ordinary refresh reads only the selected tab's pages, retaining hidden-tab rows/cursors and embedded totals. Cold Closed pages read membership then hydrate missing facts; known final details are not reread.
- Canonical agent identity reuses verified machine/folder facts while effective Git routing is unchanged, including remote.*.gh-resolved. Fresh action-time confirmation remains required.

## Main lifecycle, not a replacement scheduler

Restore main's one-shot asynchronous relay consumer and existing same-turn/in-flight coalescing. Keep the affected repository name in callbacks; do not add a two-second window, pending-repository Map, ownership transfer, dirty acknowledgements, failure-retry scheduler or waiting/blocked callback protocol. Main's scope changes, manual Refresh, hidden/show behavior and transport guards remain authoritative.

Restore main's window behavior: shown panels can read while window().active is false. There is no activity pause, remembered readPaused state, inactive return catch-up or independent minimize signal. Existing hidden/disabled/context gates remain, and safety still uses its existing online check.

Restore one membership worker per repository, including each worker's existing named-account verification. Remove membership batching and the notice-repositories worker mode. Preserve safe rate serialization and ordinary once-per-configuration/Refresh enrollment behavior; no deferred enrollment retry is scheduled.

## Budget

Reference fixture: repository A has 3 Open / 15 Closed task PRs; B has 2 Open / 15 Closed. Cold inventory is 35 to 4 GraphQL operations; unchanged Refresh 35 to 2; one A event 35 to 1; three separately dispatched A events inside two seconds 105 to 3. Main's initial relay synchronization is retained and measured separately (35 to 2); it can add to cold inventory depending on overlap. Named-account membership is unchanged at four REST calls across two repositories.

Estimated GraphQL points are approximately one per bounded operation, not measured billing or a secondary-limit guarantee. Cold singleton/page queries can increase because metadata must precede conditional details. Full trigger inventory, measurements and caveats live in docs/GIT-REQUEST-BUDGET.md.

## Preserved bounds and follow-up

Keep 45-second unenrolled / 120-second enrolled shown-open safety probes and their existing bounded failure backoff. Known final rows are not safety-probed. Preserve missing-history/live-miss caching, task membership authority, pagination, pinning, history eligibility, notices and current main changes. Do not edit peer PRs or branches. No relay operation is needed; precise hints are a separate optional/default-off follow-up.

The standalone deployment test already passed after the local process-initialization failure. Do not loop the full local suite. Run the retained targeted suites and use hosted Windows/Ubuntu plus required exact-head checks as the integration gate. Delivery owns refinalization of this revised archive; no finalization commit is reverted and no merge is authorized.
