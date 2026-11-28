# Design

## Context

See `proposal.md` for scope and `docs/UI-ARCHITECTURE-REVIEW.md` for findings, baseline source/line evidence, native measurements, cross-panel inventory and the five-PR roadmap. This change implements only stage one after approval and the named prerequisite merges. The review baseline is main `5219874`; implementation's visual oracle must be the later merged prerequisite head.

The existing `Publication`, bounded presentation memory, PR row builder, geometry caches, native handles, header kit and action checks are useful pieces. The issue is their ownership and orchestration: ordinary render repeatedly resolves selection and schedules reads, selection admission can mask an intact list, folder changes can reset it, and direct discovery commands have no total read budget.

## Goals / Non-Goals

**Goals:**

- Make repository state independent of selected-agent state and geometry; publish atomic immutable presentation.
- Preserve the previous coherent same-qualified-repository list during association/root/page uncertainty and read refusal, committing only the final destination layout.
- Make full ordinary/coordinator render cost bounded independently of unrelated agent population, with fresh dispatch/publication/action checks outside presentation.
- Admit all Git read paths through one bounded deduplicated service across mounted copies; retain existing cadence, exact routing, cooldowns and diagnostics.

**Non-Goals:**

- No new UI framework, redesigned kit, layout/style/text/interaction change, preference migration, host patch or watchdog change.
- No virtualization, guessed widths, extra per-row probes, cached native trees, new background polling or transcript-wide discovery.
- No Files/Usage/Settings/Spaces rewrite in this PR. No secret payloads, private action replay or generic cross-plugin authority service.

## Decisions

### 1. Split repository, selection and publication ownership

Extract a Git repository controller for qualified facts/pages/cursors and a selection controller for footer/role/branch admission. Both publish to the existing bounded presentation boundary. A prepared topology/role index is a revision-scoped input, not a callback-bearing native tree. Normalize and freeze owned values at publication; do not deep-clone the entire inventory each frame.

Repository identity includes machine, canonical owner/repository, effective credential/read route, inventory provenance and enable generation. Agent selection is a separate revision. Native geometry is separate again. A change in selection alone cannot reset repository facts or pagination. A new folder needs canonical proof; an unverified label/branch is not that proof.

Keep the last committed same-scope source layout while an association resolves, including when geometry refuses motion or keyboard navigation has no press bounds. Once verified, publish the final pin/list layout once. This avoids both cold Loading and an intermediate unpinned target. Existing cold-only renderer tests can still exercise Loading when no committed presentation exists; controller tests must exercise a committed source, not weaken the existing geometry assertions.

Alternative rejected: extend click-motion retention as the cache. Its bounded animation lifetime, pointer geometry and cancellation semantics are intentionally different from repository lifetime.

### 2. One transport admission service

All Git root/branch, config/canonical, page/detail/target, footer and notice/enrollment reads acquire one service's admission. At most four active total, one ordered mutable GitHub request per qualified repository, at most 256 distinct queued requests. Deduplicate identical in-flight requests and canonical discovery by qualified folder/fingerprint/generation. Prioritize explicit/selection work without starving background work. Obsolete consumers retire before dispatch; result fan-out validates each consumer afresh.

The owner must cover duplicate mounted Git copies, using an ephemeral session channel and ownership/lease tokens rather than a module-local semaphore in each sandbox. Do not put promises, callbacks or PR inventories in persisted shared state. An owner-loss protocol cannot free an uncertain still-running transport; native Task/process completion or a bounded host execution result is the completion witness. Same-key replacement coalesces demand; saturation retains source presentation and exposes no new queue UI.

Reuse the existing exact outer pre-start capacity-refusal classifier, not substring matching on child stderr. Read-only retries use capped backoff and rejoin the queue; timeouts/transport exceptions/unknown action outcomes are not replay permission. Preserve separate GitHub rate cooldown, one-shot manual credit, request order and final-cache policies. Stage one reserves no slots against unmigrated readers or external clients; later stages adopt this same service, not another four slots each.

Alternatives rejected: per-feature queues (total remains unbounded), increasing native capacity, serializing every operation (unnecessary latency), and turning execution saturation into GitHub cooldown.

### 3. Pure cheap render from a committed snapshot

Move controller synchronization, retiming, provider projection, association/feedback derivation, read demand and diagnostics out of render. A renderer receives immutable row/header/work/error/pin facts plus read-only geometry. One top-level theme/zoom/native scroll-handle sampling adapter is acceptable; no native identity lookup per row, provider query, transport, persistence or notification is allowed in the builder.

First preserve the existing row/header element shapes, IDs and callback hit targets. Extract compositions only where necessary to consume the snapshot. Keep `RowPresentations`, current width probes and post-layout changed-only cache updates. Geometry retains the native element lifetime, activation/zoom/style/text keys and stale-callback rejection; repository data refresh cannot discard unchanged native size evidence.

Alternative rejected: pure renderer wrappers that still invoke provider/location helpers internally. The complete-controller counter tests, not function names, enforce the boundary.

### 4. Separate action authority from retained presentation

Render creates inert intent bindings. Activation resolves current terminal/machine/repository/role/verdict and same-home membership, then rechecks after any asynchronous yield. A retained source, session cache or frame topology is never read/focus/write authority. Header holds, coordinator identity, source generations, exact remote routing, quiet obsolete reads and row-local diagnostics remain authoritative.

Keep the watchdog, component markers, real native fallback and one deferred retry. Unexpected failures remain visible and diagnosable; performance work must not make render exceptions quiet.

### 5. Budget and parity are delivery gates

For 9–15 rich rows: warm median target ≤10ms, p95 ≤20ms; every sampled cold/warm/growth complete frame ≤35ms. Existing larger capped coordinator batches target p95 ≤25ms, max ≤35ms. Keep the 50ms watchdog, 60-PR/100-item coordinator cap, ordinary paging and frozen row/probe/operation budgets unchanged. Report every failing sample and nominal margin; completed construction is not native paint latency.

Use unchanged geometry/interaction tests plus new full-controller read/admission/publication tests. Run the review's native ordinary/coordinator/navigation/refusal/growth matrix three serial repetitions per cell at 100/130%, with real production location/provider helpers. Separate instrumented profiling from uninstrumented acceptance. Before/after captures use identical synthetic data and merged-baseline style/motion, including hover/focus and native input where applicable. No full local suite.

## Risks / Trade-offs

- **Stale presentation becomes stale authority** → independently validate each dispatch, result consumer and action after yields; tests revoke identity during held reads.
- **Broker ownership leaks or duplicate admission across sandboxes** → duplicate-mount, owner-retirement and native Task-completion tests; do not free uncertain running work on an arbitrary timer.
- **Holding layout shows a prior pin briefly** → retain the coherent source, not a falsely resolved destination; publish the final layout atomically and preserve existing acknowledgement/motion guards.
- **More abstraction increases code** → each extracted owner replaces old mutable branches/helpers; no permanent old/new controller switch.
- **Geometry extraction changes tooltips or scroll anchors** → retain native IDs/lifetimes and frozen probes; run unchanged size-change-only/zoom/anchor suites and paired native captures.
- **Desktop noise or profiler changes timing** → keep raw failures, separate profile/acceptance, repeat both zooms and report margins rather than selected medians.
- **Unmerged UI work changes the oracle** → implement only after the named merges; reconcile overlapping #119 and take fresh baseline hashes/captures without restoring planning-head visuals.

## Migration Plan

1. After approval and prerequisite merges, record the new exact baseline and reproduce both symptoms with the retained external drivers and targeted current fixtures.
2. Extract repository/selection/publication ownership behind existing controller interfaces, with retained-source and stale-result tests/docs in the same outcome.
3. Introduce the shared admission owner and migrate every Git read caller; delete bypass/duplicate discovery paths after measured single-flight/capacity tests pass.
4. Switch ordinary/coordinator rendering to prepared snapshots; remove old render orchestration/repeated projections and preserve row/geometry/action interfaces. Complete unchanged parity tests and the native matrix.
5. Ship only this stage. Later component-kit/other-panel work gets independent PRs/plans using the review roadmap. Roll back a stage via its source/package commit; no saved-value/schema migration or runtime inventory needs undoing.
