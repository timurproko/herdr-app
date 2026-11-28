# Coordinator Git mounted-render budget

## Correctness before virtualization

Herdr's native scrollbar can drag or track-click without delivering a JavaScript
scroll notification. A spacer window can therefore expose blank space. Coordinator
Git no longer virtualizes: every revealed row in an unfolded section stays mounted.
Wheel, thumb drag, track click and keyboard scroll always traverse real content.

The list reveals ten presentation items initially, then ten more on a received
near-bottom wheel, pointer-over-list or size event. An unfolded boundary header
waits for its first row or visible notice on the next reveal; empty sections never
consume a presentation slot. Intentional folds keep their eligible headers. A guarded one-shot post-batch
layout check fills a viewport that still does not overflow; it is not polling.
Consumed native scrollbar input can delay reveal until the next received event.

## Measured safe cap

The rich fixture includes two repositories, a notice, 74px Closed rows, robots,
tasks, checks, two labels and review decisions. Uncapped native measurements show
27.8ms cold / 24.4ms warm at 100 mounted rows. **The below-20ms target at 100
mounted rows was not met.** Cold 200 rows interrupted in all five attempts;
warm 200 rows averaged 45.8ms. Complete current samples (milliseconds):

| Mounted PRs | Cold samples | Warm pure-cache samples |
| --- | --- | --- |
| 30 | 7, 9, 8, 8, 9 (mean 8.2) | 7, 8, 8, 7, 5 (mean 7.0) |
| 60 | 15, 16, 15, 14, 14 (mean 14.8) | 15, 14, 16, 15, 13 (mean 14.6) |
| 100 | 27, 31, 28, 27, 26 (mean 27.8) | 27, 24, 24, 24, 23 (mean 24.4) |
| 200 | interrupted ×5 (no complete sample) | 47, 46, 48, 43, 45 (mean 45.8) |

Pretending that a window solves the host notification gap is not acceptable.

The measured safe fallback is **60 mounted PR rows**, with an additional
**100-presentation-item** ceiling for header/notice-heavy inventories. Native
60-row builds are 13–16ms (14.8ms cold / 14.6ms warm means). The actual capped
200-inventory/60-mounted workload completes in 16, 15, 16, 16, 17ms (mean 16.0),
including its Show more row. At the cap, the only paging control is a
quiet **Show more** row at the list end. It replaces the mounted batch with the
next batch, initially revealing ten items there. The last batch's same control
cycles back to the first batch, so earlier rows remain reachable without a page
counter, Previous button or separate footer. This intentional batch change starts
at the top; refreshes and appends within a batch keep native scroll/row anchors.
Whole-inventory counts and enrollment are independent of the batch. Safety
selection has a separate identity generation: geometry-only projection rebuilds
retain held reads, while reveal, fold clicks (even away-and-back before render),
tab/home changes and changed revealed identities reject obsolete replies. At a full row
cap, excess new arrivals wait for a freed slot or an explicit batch cycle instead
of evicting already revealed PRs. Deleted tails retain the last surviving anchor.

`tools/measure-git-render.mjs current` deliberately bypasses the runtime cap to
measure complete 30/60/100/200-row renders. `GIT_NATIVE_WARM=1` first builds an
untimed snapshot to warm pure fact/style/layout caches; native width probes remain
pending unless the native host has acknowledged them. Both modes create fresh
native trees/callbacks. `GIT_NATIVE_CAPPED=1` separately measures 200 known PRs
with the real runtime cap and end control. A 200-row native interruption is recorded as such, never
reported as a successful full build. Raw series are under
`.artifacts/git-render-native/mounted-{cold,warm}-results.json` with individual logs.
Timings use native Date.now at 1ms resolution and include the complete JS/native
builder render, not later layout/paint or live input latency. No watchdog is changed.

## Cache ownership and deterministic regression

- `RowPresentations` weakly memoizes pure row facts, formatted text, accessibility
  strings, label names/keys and semantic IDs, with mutable-fixture invalidation.
  Palette-dependent label styles and measured metadata layout decisions have
  bounded caches. Native interactive elements and event handlers are never cached.
- #45's bounded distinct-string native widths and immutable label presentation
  stay intact. At most three coordinator pills render; full names remain in
  tooltips. Empty probe containers are omitted. Fixed h/flex-none boxes retain
  geometry without redundant min/max refinements.
- The mounted regression traverses 100 inventory rows across capped batches,
  proves every revealed row remains present independent of scroll offset, and
  enforces the measured row/item cap, bounded per-row elements and a batch-sized
  operation/element ceiling. The obsolete 1,200-element viewport-window ceiling
  does not describe a mounted 60-row tree. The current 100-inventory-row traversal
  peaks at 13,767/20,000 builder operations and 1,696/8,000 elements; each PR stays
  below 125 elements.

## Informative-tooltip delta against merged main

After merging #56/#59/#70, #61 takes main's renderer for all non-tooltip behavior.
Its earlier measurement scheduler/cache work is removed. Tooltip eligibility reads
main's existing full/compact/clipped decisions and adds **zero intrinsic probes or
native elements**. Main's dot +1px, icon +1px, reveal/caps, fades and quiet/batched
read paths are unchanged. Titles retain native truncation and full-title hover.

`tools/measure-git-row-budget.mjs --run` compares main `f3fe341a3d1bf9fdeffea66c13adca91f7549e9a`
with the merged tooltip code on Windows App 0.1.18. Five fresh cold samples per
cell alternate main/current order. The coordinator uses real `taskSections`,
`revealMore` and `renderAggregate`, not a manually constructed row subtree: all
30/60 requested rows are revealed and actually mounted, within the unchanged
production cap. Ordinary uses real `renderPulls`. Every sample completed.

| Fully mounted mode/rows | Main samples, ms | Tooltip samples, ms | Median delta |
| --- | --- | --- | ---: |
| Ordinary 30 | 10, 11, 10, 11, 10 | 11, 12, 9, 11, 11 | +1 ms |
| Ordinary 60 | 21, 21, 21, 24, 21 | 21, 20, 22, 21, 21 | 0 ms |
| Coordinator 30 | 7, 8, 7, 7, 7 | 8, 8, 9, 8, 7 | +1 ms |
| Coordinator 60 | 17, 14, 17, 15, 15 | 16, 16, 18, 15, 16 | +1 ms |

Every paired current sample and every median is at most main +2ms. This times
cold JS/native-element tree construction at 1ms resolution, not subsequent
layout/paint or live input latency. Results and logs are under
`.artifacts/git-row-render-budget/main-mounted-results.json`. No watchdog,
production row cap or reveal behavior is changed to satisfy the comparison.

`tests/git-row-render-budget.test.mjs` covers both tabs and 100%/130% zoom using
actual ordinary/coordinator rendering. Frozen main counts in
`tests/fixtures/git-row-budget-baseline.json` require equal elements/probes and
at most two additional decoration operations per row. 100/200 coordinator
inventories must still mount only main's 60-row safe batch. The fixture does not
claim a capped batch is a fully mounted 100/200-row measurement. Mutation controls
reject a new subtree or measurement probe. The existing mounted/reveal regression
above remains the authority for scrolling and cap correctness.

## Native geometry and derived fades

`SidebarScrollState.setMetrics` atomically replaces a private frozen snapshot
computed by the pure `scrollMetrics` function. Geometry/extent/fade fields are
getter-only. Rendering reads the actual native handle's logical offset, viewport
and content sizes and projects them into the shared passive 40px fades. No
render-time notify/focus allocation or new observer is introduced.

A consumed scrollbar event can move native content without invalidating the JS
snapshot. Fades may therefore lag until the next render or received wheel/pointer/
size event. Real rows remain visible throughout. Hosts without the position-query
methods retain the existing event-bounds hint fallback; no observer is invented. Native scrollbar-to-bottom reveal
happens on that next received event; it is not claimed to occur while the host is
silently consuming the drag.

An accepted anchor correction queues `scroll_to_item` and requests a repaint
unconditionally, not only when an edge changes. Equal-height refreshes in the
middle and at the bottom have size-change-only regressions; stale scopes reject
queued requests. A one-pixel marker preserves anchors and never replaces content.

## Four-PR background interruption investigation

The reported coordinator interrupted-render banner was **not reproduced** with
four rich Open PRs across three synthetic repositories on release App 0.1.18.
`tests/features/git-loading-native.mjs --run --stress --zoom 1|1.3 --output <outside>`
verifies the supplied release archive and executable and mounts shipping renderers
in a disposable home/Core session. A sibling view repaints every 33ms while 240
controller updates at 40ms intervals replace PR titles, 13 check contexts and
membership; folding and Closed-tab transitions provide controls. There is no
forced loop, watchdog override, live account, terminal or GitHub operation.

The final 100% run recorded 246 stress builds at 1–10ms (median 3ms); the 130%
run recorded 247 at 0–9ms (median 3ms). Both native logs and final status were
error-free; inspected screenshots had no fallback banner. These are synchronous
JS/native-tree construction samples, not layout/paint, a live fleet workload or
proof that the original interruption cannot recur. No speculative production
render recovery change is made. Existing component diagnostics and once-only
retry remain intact. All owned app/Core processes stopped in finally.

`tests/git-background-render.test.mjs` adds 480 deterministic four-PR frames at
100%/130%, checking coherent warm feedback, complete render markers, fold/tab/
membership changes and bounded native trees (219 elements maximum in this fixture).
The mounted-row budget retains its frozen PR/probe baseline and caps; only the
six removed coordinator tab-badge chrome nodes are deducted from its element
expectation. Ordinary budget measurements render the list body without tabs.

## Reproduced provider fan-out during coordinator refresh

`tests/features/git-refresh-native.mjs --run --zoom 1|1.3 --workers 4
--unrelated 120 --cycles 120 --output <outside>` exercises the production Git
controller, Crew provider and AgentLinks rather than the earlier four-row
renderer-only stress. Four PRs load first; unrelated synthetic agents/spaces
appear after tick 10. No infinite loop or watchdog override is injected.

Before the fix, `AgentLinks.refresh` called its admission predicate for every
candidate. The coordinator predicate rebuilt verified Crew context, including
native topology and `bindFleet`, for every unrelated agent during render. The
real 50ms watchdog interrupted those frames: paired 100%/130% runs retained the
last-good update-9 list beneath the actual interrupted-render banner (42/44
incomplete markers). The screenshot stack also identifies `fleetContexts` /
`bindFleet`; the preceding completed component was coordinator-context.

Enumeration now uses one frame-local verified membership set and the existing
native presentation snapshot. The separate admission callback still resolves
fresh provider context after every asynchronous yield; stale membership cannot
start IO or publish an association. Action-time navigation remains uncached.
No render diagnostics, retries, row caps or watchdog settings were changed.

The paired corrected runs completed 120 update ticks, 169/176 render builds,
with zero native errors or incomplete markers. Final build ranges were 2–28ms / 2–29ms
at 100%/130%, including first load and provider/controller work, not later paint
or live-network latency. All owned App/Core instances stopped. Pictures, source
hashes and receipts are in the crew task's external `gr-*` evidence folders.
The failed exploratory cold run is not a successful loaded-list proof; the
paired warm replays above are. `pr-agent-links.test.mjs` independently bounds
provider/native collection reads during enumeration and revokes verification
before queued continuations to prove fresh read authority remains required.

## Complete-controller review correction

The four-worker result above was insufficient. Review reproduced interruptions
while one Crew child grew from four to fourteen alternating ship/review workers,
with three PR repositories. The row/section abort marker identifies where the
budget ran out, not where the preceding time was spent.

The complete-controller profile found repeated work ahead of and inside the rows:
five provider binds per frame, enumeration resolving unrelated agent directories
before filtering, repeated terminal reads while retaining branch explanations,
per-row scans of the entire role population, and about 120 settings reads for a
fourteen-row frame. A further blind spot was the fixture's stubbed `location()`:
stage and agent controls actually repeated complete native collection/directory
walks per row. The fixture now runs the production helper. On the exact old
source, a buffered, fully mounted fourteen-row / 120-unrelated profile reproduced
40 interruption markers and 24 aborted profiles; complete samples measured 45ms
median / 52ms p95 / 55ms maximum. Batched read continuations also rebound provider
identity several times per alias.

The correction uses one strict provider context for the synchronous frame and its
presentation, one native settings snapshot, early candidate selection and a pure
frame-local role index. `location(snapshot)` shares pure selection/directory facts
from those same frame collections; callers outside render omit the snapshot and
remain fresh. A live bound Crew child no longer triggers an unused
second remembered-display/native-model lookup. The provider refresh hint's
witness/proof work yields out of rendering. Repository ordering and safety-job
scheduling reuse frame collections, but no timer, read or action retains that
frame as authority. A completed read obtains fresh membership once for its
synchronous alias commit and renews it after any awaited error path; native
identity, generation, pending-token and entry checks remain. No native element,
callback tree, watchdog setting, row cap or diagnostic is cached or suppressed.

With the final source, buffered profile runs of 4-to-14 growth at 130% measured
9ms median / 23ms p95 with 20 unrelated agents and 11ms / 31ms with 120. Each
explicit frame provider bind, settings read and selected-location/focus resolution
is exactly one. The old completed fourteen-row frame made 39/33/47 space/pane/
terminal collection reads, versus 3/2/2 now (including provider work). The native
fixture buffers samples and flushes one per existing controller tick, outside
render: synchronous tracing IO in the old per-component probe could itself
consume the measured deadline. Production failure diagnostics remain unchanged.

Three growth replays at each zoom and each 20/120-unrelated population all mounted
fourteen rows, with zero interruptions or continuation errors. However this is not
an all-green performance result: with 20 unrelated agents, maxima were 36/12/21ms
at 100% and 26/40/23ms at 130%; the 36ms and 40ms runs correctly failed the new
35ms margin guard. The 120-unrelated maxima were 16/23/35ms and 21/18/15ms, all
passing. The guard was not raised; the two remaining strict timing failures are
retained in the task report for review. These are bounded synthetic native
samples, not a universal latency guarantee.

`git-refresh-frame.test.mjs` proves one same-frame bind, deferred proof hints,
fresh post-yield dispatch, a bounded fourteen-alias commit, and revocation after
both a held read and an awaited error diagnosis. `pr-agent-links.test.mjs` rejects
unrelated directory resolution and repeated native settings/terminal reads while
retaining its existing fresh action-time identity matrix. `git-location.test.mjs`
proves repeated frame projections do not reread collections/focus, while an
unframed call immediately observes changed live cwd. The frozen mounted-row
budget still passes without new PR elements or intrinsic probes.

## Measurement lifetime audit

- Notice measurement IDs include text/width/zoom and owner identity; equal-height
  text replacements remeasure, while returning measured keys retain correct heights.
- Ordinary physical viewport measurements outlive tab/context state. Content
  measurement IDs renew on activation/zoom. Old-activation/zoom replies are rejected.
- Coordinator owners renew measurement IDs on home-away-home; unchanged physical
  frame sizes stay valid through zoom. Render-time actual-handle reads correct
  cached position without relying on another native size event.
- Repository-name available/natural probes renew when a pruned cache reappears;
  stale-owner/zoom callbacks cannot overwrite replacement facts.
- Pin body raw dimensions normalize at the current zoom; unchanged data retains
  geometry identity. A returning pin gets a fresh reveal ID.
- PR line/probe caches retain per-native-ID geometry and keyed zoom/style/text
  widths; requests renew after reset/eviction and reject stale callbacks.
- CI sweep and pin-swap arming already use monotonic IDs/current-object guards.
  Enrollment/choice menus/count badges and label/ring/fade paths do not discard
  native dimension caches requiring an unobservable callback.
