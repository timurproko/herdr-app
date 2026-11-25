# Design

## Context

The previous archived implementation added title and per-pill measurement containers and a prefix search. Its cold native row builder rose from roughly 8/15/24 ms at 30/60/100 rows to 20/42/interrupted. The ordinary list already mounts every loaded row, so coordinator paging did not contain the regression. Its keyed title-size record also discarded available geometry on title edits despite an unchanged native ID/box.

This repair is explicitly requested and approved, including dropping title measurement and retaining full-title tooltips. It preserves the earlier archive and repairs the same open PR.

## Goals / Non-Goals

**Goals:** Baseline +2 ms at 30/60/100 cold fully mounted rows, successful 200-row checks, a fixed four-probe snapshot budget, informative lower lines, immediate titles, and geometry that outlives text-metric keys.

**Non-Goals:** No paging/windowing change, hidden/delayed rows, JavaScript frame timer, new hover reads, native host patch, dependency or deployment.

## Decisions

### Prefer the approved no-title-measurement fallback

Delete the title/pill/prefix width helpers. PR titles use native truncation and always expose their complete title, including when it fits. Give title/header text Segoe UI while retaining the original size, weight, line and outer geometry. Native diagnosis already proved that literal/native U+2026 in Geist forms a stroke at these sizes, independently of boldness or clipping; Segoe UI's native suffix paints distinct dots. This changes the title/header face, not just the suffix face, and is stated explicitly.

There is no prefix search and therefore no candidate probe, estimated character budget or title measurement queue. The approved always-title-tooltip exception is preferable to silently blocking title updates on an unavailable fit measurement. Same-ID edits now immediately replace native text/tooltip without needing any size callback.

Pill content returns to the original lightweight clipped text node. Its existing measured group allocation decides whether the group/metadata hover supplies complete names; there are no individual pill width probes or repeat-only pill tooltips. Omitted coordinator labels remain informative.

### Four probes across the complete snapshot

`beginPullRender` captures zoom/interface font once and resets one shared pending set; `claimPullProbe` refuses cache hits, duplicates and requests after four reservations. Both ordinary and coordinator metadata use the same 512-entry shared native width cache. Header intrinsic probes consume the same budget. Cached strings produce no recurring probe.

Actual native size callbacks populate the cache and notify after layout, allowing the next four missing keys in a subsequent render. This is amortization, not a JavaScript frame loop or a separate timer. Available-width callbacks remain on existing elements and are not additional intrinsic probes. Rows always render immediately with existing full/compact fallback behavior.

For ordinary lists, existing content/frame motion bounds identify the known visible slice. Missing keys for that slice and the pinned row take priority; after they are known, background keys advance in display order. Without trustworthy viewport facts, use current presentation order. Measurement priority cannot reorder rows, grant action authority or retarget a click.

### Native ID owns allocated geometry

Lower-line and repository-header records retain allocated physical widths by native element ID. Text/style keys invalidate intrinsic widths, not the element's available box. Normalize preserved physical width with current zoom when selecting compact forms. Context/font/zoom/request guards still reject obsolete callbacks. Tests dispatch callbacks only when actual dimensions change, including same-ID short-to-long title edits and font changes.

### Deterministic budget guard plus native timing gate

Freeze fc0dfde cold operations/elements for a shared, versioned synthetic workload at 30/60/100/200 rows. The ordinary fixture calls real `renderPulls` and asserts every row is returned; coordinator timing deliberately builds all rows instead of reporting a ten-item page as a large list. Current operations/elements must not exceed those baselines; settings reads remain constant and intrinsic probes at most four. Mutation controls restore per-row hidden subtrees, excess probes or bridge reads and must fail.

The opt-in native tool compares fresh baseline/current checks on the same machine, records all samples and native failures, enforces the requested baseline +2 ms and approximate 10/17/26 ms ceilings at 30/60/100, and requires every current 200-row sample to complete. It additionally tests the ordinary scrolled-bottom priority path. This measures JS/native-element construction, not GPU paint or real scrolling latency.

## Risks / Trade-offs

- Full-title hover is occasionally redundant → Explicitly approved fallback; lower-line/combined summaries remain informative-only.
- Title/header face changes from Geist to Segoe UI → Preserve size/weight/geometry; verify native ellipses at 100%/130%, disclose Windows-only font evidence.
- Cold lower-line compaction learns progressively → Four native probes per snapshot, immediate rows, visible-slice priority; no loading placeholders or measurement gates.
- Native wall-clock measurements vary with system load → Record samples/provenance and use deterministic baseline-relative operations/elements in hosted CI, with native opt-in checks as separate evidence.
- Ordinary large lists can exceed budgets even if coordinator pages are safe → Exercise actual fully mounted ordinary Open/Closed 100/200 rows, zoom/font cold starts and a scrolled viewport, not only coordinator page tests.

## Migration Plan

No persisted-data migration. Commit this repair on top of the existing finalized archive. Keep icon offsets and lower-line tooltip behavior, update this PR's approved outcome/acceptance wording for the explicit title fallback, and let delivery automation finalize this follow-up change. No readiness/merge command or deployment is part of the implementation.
