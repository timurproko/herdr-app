# Tasks

## 1. Icon alignment remains unchanged

- [x] 1.1 Preserve both +1 logical-pixel icon slots and every success/failure/pending/unknown/task variant; the existing 62,100-case geometry and mutation regression remains the oracle.

## 2. Bounded measurement and informative lower-line hover

- [x] 2.1 Capture settings once per render entry, share a four-probe total reservation budget and 512-entry cache across ordinary/coordinator lower lines and repository headers; budget/settings/probe assertions pass at 30/60/100/200 mounted rows.
- [x] 2.2 Prioritize the known visible ordinary slice and pinned row using existing motion bounds, then advance background keys through native callbacks without withholding rows; scrolled-bottom and complete-background-batch fixtures pass.
- [x] 2.3 Keep allocated physical geometry by native element ID across text/style invalidation and normalize with current zoom; changed-size-only and explicit no-size-callback regressions cover title edits, lower lines and repository headers.
- [x] 2.4 Add frozen fc0dfde operation/element baselines and actual ordinary renderPulls coverage, including Open/Closed, 100/200 rows, zoom/font invalidation and negative controls; the deterministic render-budget fixture passes.
- [x] 2.5 Add the opt-in native 30/60/100/200-row timing gate using the same workload and actual mounted ordinary/coordinator/scrolled paths; all current samples meet baseline +2ms and 10/17/26ms ceilings, and all 200-row samples complete with four probes.
- [x] 2.6 Update README/testing/render-budget guidance and per-item policy for the approved full-title fallback and group-only pill recovery; keep informative lower-line, combined-summary, state/agent and stale-response regressions green.

## 3. Readable native truncation without title or pill subtrees

- [x] 3.1 Remove title/per-pill/prefix measurement and choose native Segoe UI truncation at the original size/weight with always-full-title hover; the 540-case style/geometry and same-ID title-edit regressions pass without title size callbacks.
- [x] 3.2 Update the disposable native fixture to exercise the production fallback and assert zero title probes; captures at 100%/130% show distinct native U+2026 dots with no host errors.
- [x] 3.3 Document the face change, approved tooltip exception, original Geist diagnosis, native evidence and remaining platform/paint limits; targeted glyph/geometry/temporary-mod fixtures pass.

## Workflow follow-up

- The person explicitly requested and approved this repair, a four-probe approach and the always-full-title fallback; no further planning approval is pending.
- Preserve the earlier finalized archive, deliver this repair on top, and let automation finalize this follow-up change in the same PR. Never mark ready or merge it manually.
- Run the requested isolated hosted subset and inspect final-head required checks. Native timings are cold build-only samples, not a promise about GPU paint or scheduling on all machines.
