# Tasks

## 1. Informative lower-line hover with main's renderer

- [x] 1.1 Merge main through #56/#59/#70 and take its renderer, geometry, reveal/caps, scroll/fades and quiet/batched reads for all non-tooltip behavior.
- [x] 1.2 Suppress repeat-only item/combined-strip hover while retaining clipped/compact/omitted originals, exact timestamps, check details and known identities.
- [x] 1.3 Retain native titles/headers, inherited font and full-title hover, including same-ID edits without a resize callback.
- [x] 1.4 Cache only pure tooltip facts with timestamp/check-detail invalidation; preserve action identity and stale click guards.

## 2. Existing measurement reuse and main-relative mounted cost

- [x] 2.1 Remove the private bounded-measurement scheduler/cache and derive eligibility solely from main's existing full/compact/clipped choices; add no probe, native element or measurement mechanism.
- [x] 2.2 Exercise actual ordinary/coordinator renderers at 30/60/100/200 inventory sizes, both tabs and 100%/130%, preserving main's 60-row coordinator cap and exact element/probe counts with regression mutations.
- [x] 2.3 Measure five paired cold native samples for every fully mounted ordinary/coordinator 30/60-row cell against current main, within +2ms for each pair and median.
- [x] 2.4 Record current samples, scope limits, per-item tooltip policy and merge-conflict files; update the reduced-scope PR/spec/docs for automatic refinalization.

The person explicitly approved this integration rework. Final hosted required checks and independent review follow; no readiness, merge or deployment command is authorized.
