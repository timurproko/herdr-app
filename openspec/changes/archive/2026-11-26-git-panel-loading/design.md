# Design

## Context

See proposal.md for motivation and specs/plugin-integrations/spec.md for the revised contract. `main.js` owns ordinary `renderPulls`, coordinator `renderAggregate`, the shared `segment` tab renderer and the native loading line. Ordinary messages are inside a list with 4px top padding; coordinator cold Loading currently sits in an unpadded sibling above its scroller. Both explicitly request `animated:false` from `panelMessage`. The shared message already defaults to the existing pulsing dot.

Ordinary section-header admission currently depends on repository identity and row/pin count rather than readiness of its selected page. Coordinator cold partial-success staging already exists, but actionable failures currently retain section headers beside Loading. Existing tests explicitly assert static dots, concurrent cold moving lines and always-visible tab badges; those assertions must change rather than preserve the superseded visuals.

The native interrupted-render banner is reported, not reproduced in this planning pass. Existing docs describe a 50ms watchdog, 60-row/100-item coordinator caps, pure row caches, frame-local collection snapshots, actual component diagnostics and a once-only deferred render retry. They must not be bypassed or replaced to hide the banner.

## Goals / Non-Goals

**Goals:** Make loading/header decisions coherent within each frame, reuse existing visual primitives, and isolate small presentation edits from the parallel repository-order task. Investigate the reported small multi-repository Open workload, not only the previously inconclusive Closed collapse case.

**Non-Goals:** No repository sorting, new visual pattern, new scheduler, larger render deadline, native binary patch, transport policy change, count-fetch optimization, broad renderer rewrite or live-agent exercise. No implementation before plan approval.

## Decisions

1. **Derive cold body feedback from the presentation being shown.** Ordinary readiness must consider the selected published page, compatible warm seed and authoritative empty/error state, not just a known repository name or a busy flag. Coordinator readiness continues using its existing published/waiting distinction. Reuse the same per-frame cold decision to exclude repository headers and suppress the moving line. Do not globally disable the line whenever a request is busy: warm lists and pagination still need it.
2. **Reuse shared pulsing Loading with ordinary spacing.** Remove Git's static-dot opt-out only at genuine Loading messages and supply the coordinator message with the same 4px list-top inset. Measure the dot/text positions relative to the tab-strip bottom at 100% and 130%; do not guess from whole-window screenshot coordinates. Shared UI primitives and other panels stay unchanged.
3. **Keep actionable failures visible during cold staging.** While Loading is present, render applicable scoped failure text using its existing notice styling without a repository section header/count, unaffected by saved folds. Once cold reads settle, restore normal eligible section headers and folding. Prefer presentation-only admission/filtering over changing aggregate read, membership or ordering logic. Warm failures retain their rows and ordinary notices.
4. **Remove badges at the shared Git tab renderer.** Keep label controls, existing IDs, selected treatment, accessibility names and click callbacks; remove badge subtrees, width reservations and count-only feedback. Do not remove internal scoped counts or repository-header numeric slots. Update the ordinary and coordinator call sites without changing repository projection order.
5. **Investigate interruptions with bounded synthetic evidence.** Extend/reuse the disposable native fixture to drive four rich Open PRs across several repositories through repeated membership/CI-style background replacements and renders, plus tab/fold transitions as controls. Record timings, native errors and surviving component markers. If reproducible, fix only the measured local cause and add a targeted guard; otherwise state the sample scope and inability to reproduce, without promising a fix or concealing the native banner.

## Risks / Trade-offs

- Cold actionable failures formerly had folding headers beside Loading → Keep their scoped notice text visible without headers during cold staging; resume normal folding after settlement.
- A cached empty result or partial worker seed could be misclassified as cold → Exercise authoritative empty, seed, warm return, rate refusal, delayed page and selected-pin entry independently.
- Removing tab counters invalidates several existing fixture expectations → Update only relevant assertions; retain internal count correctness and repository count tests.
- Background interruption may depend on live workload not represented by fixtures → Report honest non-reproduction and retain diagnostics; do not add speculative caching, retries or watchdog changes.
- Parallel work edits coordinator section order → Keep this change in loading/tab admission and styling; do not edit sorting, child-space projection or canonical repository iteration.

## Validation and rollout

After approval, run only targeted loading/tab, inventory-presentation, warm-entry and repository-count tests, plus a focused render-budget/diagnostic regression if that investigation changes code. Use a checksum-verified copy of release App 0.1.18 from the supplied native-bin directory, install nothing, and use synthetic data in isolated app/Core homes. Capture ordinary and coordinator cold, loaded, warm/background and visible-failure views at 100% and 130%, including two phases proving the pulse/line distinction. Save proof and scratch outside the checkout in the allowed crew task directory and stop every owned instance in finally before reporting.

Update README and relevant feature/testing guidance to remove obsolete static-dot and badge promises. Publish through the existing origin/PR path, dispatch the CI workflow on the final implementation branch because draft PRs skip its test jobs, and hand off immediately without waiting or polling. Never mark ready or merge. No data migration is needed; reverting the focused customization changes restores the prior presentation.
