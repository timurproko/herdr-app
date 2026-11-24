# Coordinator Git mounted-render budget

## Correctness before virtualization

Herdr's native scrollbar can drag or track-click without delivering a JavaScript
scroll notification. A spacer window can therefore expose blank space. Coordinator
Git no longer virtualizes: every revealed row in an unfolded section stays mounted.
Wheel, thumb drag, track click and keyboard scroll always traverse real content.

The list reveals ten presentation items initially, then ten more on a received
near-bottom wheel, pointer-over-list or size event. A guarded one-shot post-batch
layout check fills a viewport that still does not overflow; it is not polling.
Consumed native scrollbar input can delay reveal until the next received event.

## Measured safe cap

The rich fixture includes two repositories, a notice, 74px Closed rows, robots,
tasks, checks, two labels and review decisions. Uncapped native measurements show
roughly 24–28ms at 100 mounted rows and 43–50ms at 200, with a cold 200-row native
interruption in one series. **The below-20ms target at 100 mounted rows was not
met.** Pretending that a window solves the host notification gap is not acceptable.

The measured safe fallback is **60 mounted PR rows**, with an additional
**100-presentation-item** ceiling for header/notice-heavy inventories. Native
60-row builds are approximately 13–16ms. At the cap, the only paging control is a
quiet **Show more** row at the list end. It replaces the mounted batch with the
next batch, initially revealing ten items there. The last batch's same control
cycles back to the first batch, so earlier rows remain reachable without a page
counter, Previous button or separate footer. This intentional batch change starts
at the top; refreshes and appends within a batch keep native scroll/row anchors.
Whole-inventory counts and enrollment are independent of the batch.

`tools/measure-git-render.mjs current` deliberately bypasses the runtime cap to
measure complete 30/60/100/200-row renders. `GIT_NATIVE_WARM=1` first builds an
untimed snapshot to warm pure fact/style/layout caches; native width probes remain
pending unless the native host has acknowledged them. Both modes create fresh
native trees/callbacks. A 200-row native interruption is recorded as such, never
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
  does not describe a mounted 60-row tree.

## Native geometry and derived fades

`SidebarScrollState.setMetrics` atomically replaces a private frozen snapshot
computed by the pure `scrollMetrics` function. Geometry/extent/fade fields are
getter-only. Rendering reads the actual native handle's logical offset, viewport
and content sizes and projects them into the shared passive 40px fades. No
render-time notify/focus allocation or new observer is introduced.

A consumed scrollbar event can move native content without invalidating the JS
snapshot. Fades may therefore lag until the next render or received wheel/pointer/
size event. Real rows remain visible throughout. Native scrollbar-to-bottom reveal
happens on that next received event; it is not claimed to occur while the host is
silently consuming the drag.

An accepted anchor correction queues `scroll_to_item` and requests a repaint
unconditionally, not only when an edge changes. Equal-height refreshes in the
middle and at the bottom have size-change-only regressions; stale scopes reject
queued requests. A one-pixel marker preserves anchors and never replaces content.

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
