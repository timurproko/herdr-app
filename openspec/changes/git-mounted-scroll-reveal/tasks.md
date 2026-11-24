# Tasks

## 1. Revealed coordinator rows remain mounted with safe per-row caches and a measured render budget

- [ ] 1.1 Replace viewport ranges/spacers with a retained revealed prefix; update mounted-row and native-scroll-without-JS-callback regressions so every revealed row remains reachable and no spacer can be exposed.
- [ ] 1.2 Memoize pure row facts/IDs/styles/layout decisions while preserving measurement/label caches and fresh callbacks; extend cache invalidation and row geometry regressions.
- [ ] 1.3 Measure complete cold/warm renders at 30/60/100/200 mounted rows, target below 20ms at 100, and enforce a measured safe cap with one end Show more row only if 200 exceeds about 35ms; update native tooling, deterministic mounted-budget regression and budget documentation.

## 2. Native handle geometry drives fades, incremental reveal and repainting anchor corrections

- [ ] 2.1 Sample actual handle geometry at render and received wheel/pointer/size events; retain passive shared fades and test native thumb/track/keyboard position changes without fabricated content events.
- [ ] 2.2 Add guarded one-shot post-batch layout checks to fill non-overflowing viewports in ten-item batches without IO; test bottom-drag next-event reveal, stale callbacks, retained anchors and unconditional repaint after middle/end corrections.
- [ ] 2.3 Document exact reveal triggers and the possible fade/reveal lag until the next event/render after native input consumed by the host; preserve ordinary pagination, pins, totals, folds and external enrollment.

## 3. Coordinator safety reads cover revealed unfolded rows with stale-selection protection

- [ ] 3.1 Replace viewport selection with revealed unfolded rows; update safety tests for offscreen revealed rows, hidden/folded exclusions, stale reveal/fold/tab/context replies, 45/120-second cadence and per-call routing.
- [ ] 3.2 Update README/architecture/webhook scope guidance, run targeted suites and one full isolated CI run, and verify required checks on the final head with mounted-row timings in the handoff.
