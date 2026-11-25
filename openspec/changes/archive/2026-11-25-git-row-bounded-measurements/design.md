# Design

## Context and scope

This PR owns informative tooltip policy, not the Git row renderer. The person required main's merged #56 mounted reveal/caps/fades, #59 quiet/batched reads, #66 icon offsets and #70 dot alignment. Titles keep the inherited interface font, native truncation and unconditional full-title hover.

The earlier private four-probe scheduler and width-cache changes are removed entirely. They are unnecessary once tooltip eligibility reads the full/compact/clipped choices that main already computes.

## Decisions

### Reuse main's renderer and layout facts

Restore main's row renderer, `RowPresentations` facts/ID/style/layout caches, intrinsic measurement code, scope/zoom guards, reveal model, caps, scrolling and fades. Only tooltip fields/decoration differ. A complete visible lower-line value has no repeat-only tooltip. Compact or clipped values expose full originals, extra known facts stay informative, and surviving parent targets recover wholly omitted values without repeating visible neighbors.

No title/pill probe, native element, separate layout calculation, measurement queue, width cache, timer or host read is added. Main's existing measurements remain unchanged; their number is not falsely described as zero. Probe/element counts must match main exactly for a shared workload.

### Pure cached tooltip facts

The existing weak presentation cache stores exact-time and check-detail strings. Its signature includes source timestamps/state and check-detail identity so mutable fixtures and replacement facts invalidate them. Native nodes/callbacks remain snapshot-local. Agent names describe existing targets but do not become action identity or trigger reads. Unknown facts are not invented.

### Main-relative cold mounted cost

The reference is main `f3fe341`, including the merged mounted renderer. Ordinary benchmarks call real `renderPulls`; coordinator benchmarks use `taskSections`, reveal every requested 30/60 row, then call real `renderAggregate` without disabling production caps. Five fresh cold samples alternate reference/current order. Every current sample and median must cost no more than its main comparison plus 2ms, and every requested row must actually mount.

The deterministic regression freezes main operations/elements/probes for actual ordinary/coordinator Open/Closed trees at 30/60/100/200 inventory sizes and 100%/130%. Coordinator 100/200 cases retain the 60-row/100-item cap and are not represented as fully mounted larger trees. Equal elements/probes and at most two decoration operations per mounted row bound tooltip overhead. Negative controls add a subtree/probe and fail.

## Limits

Native timings use Date.now at 1ms resolution and measure JS/native-element construction, not layout/paint or live input latency. Main's existing native-input notification limits and row caps stay documented. No claim is made that an uncapped 200-row coordinator is safe. Real pointer-hover acceptance remains separate from synthetic tooltip eligibility tests.

## Delivery

Merge main, resolve renderer conflicts in favor of main for everything but tooltip policy, update the existing finalized scope/specs coherently and let automation refinalize. No manual readiness, merge, deployment or unrelated PR edits.
