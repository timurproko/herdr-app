# Design

## Context

The ordinary list already mounts every loaded row. The earlier implementation regressed cold 30/60/100-row construction from roughly 8/15/24 ms to 20/42/interrupted. Coordinator paging could not protect it. The person has explicitly reduced this PR to informative lower-line tooltips and rejected any title/header typography or truncation change.

## Goals / Non-Goals

**Goals:** Informative lower-line hover without parent repetition; baseline +2 ms at 30/60/100 cold mounted rows; successful 200-row builds; four lower-line probes per snapshot; retained allocated geometry.

**Non-Goals:** No title/header font or truncation change, title measurement, prefix fitting, custom suffix, icon/separator change, paging/windowing change, hidden/delayed row, JavaScript frame timer, hover IO, dependency, native patch or deployment.

## Decisions

### Keep native titles and headers unchanged

Use main's PR-title and ordinary-header expressions and coordinator repository-name helper unchanged. Titles inherit the interface font, keep native truncation and always expose the complete title. Title edits immediately replace native text/tooltip without any size callback. The existing coordinator header overflow measurement remains main's implementation; it is not part of the new lower-line probe queue.

Keep main's merged icon/separator implementation and its geometry regressions. No text or icon motion compensates for hover policy.

### Informative lower-line targets

Lower-line items expose complete originals only when compacted, clipped or omitted, or when known timestamps/check details add information. Parent strips recover completely hidden values without repeating visible items. Label pills inherit an informative group hover; no individual pill-width probes. Known agent/state descriptions remain informative and do not grant action authority or start hover reads.

### Four lower-line probes per snapshot

Capture zoom/interface font once per render entry. One shared reservation set refuses cache hits, duplicates and work after four probes. Ordinary/coordinator lower lines share the 512-entry width cache. Native size callbacks populate it and notify after layout, advancing missing keys in subsequent renders without a timer or withholding rows. Existing allocated-width callbacks are not intrinsic probes.

Existing content/frame motion bounds identify a known visible ordinary slice. Missing keys there and on the pinned row take priority; background keys follow in display order. Without reliable viewport facts use presentation order. This changes measurement priority only, not row order or navigation.

### Geometry outlives facts

Retain lower-line allocated physical widths by native element ID, not text/style key. Normalize retained width with current zoom when intrinsic facts are invalidated. Context/font/zoom/request guards refuse obsolete callbacks. Changed-size-only tests cover same-ID title edits (with unchanged native title behavior), lower-line text changes and typography changes without an allocated-size callback.

### Cost regression

Freeze fc0dfde operations/elements for a shared workload at 30/60/100/200 rows. Ordinary fixtures call real renderPulls and assert every loaded row is returned; coordinator timing deliberately bypasses paging. Counts must not exceed baseline, settings reads remain constant and lower-line probes stay at four. Mutation controls restore excess subtrees, probes or bridge reads and must fail.

The opt-in native tool compares fresh baseline/current checks, records failures, enforces baseline +2 ms and additional 10/17/26 ms ceilings at 30/60/100, and requires every current 200-row sample to complete. It also measures a scrolled-bottom ordinary case. These are JS/native-element construction timings, not GPU paint or real input latency.

## Risks / Trade-offs

- Cold lower-line shortening learns progressively: four probes, immediate rows and visible-first priority avoid a cold burst.
- Native wall-clock measurements vary: record samples/provenance and keep deterministic hosted tree guards.
- Titles retain occasionally redundant full-title hover intentionally, exactly as before; the lower-line policy does not apply to them.
- Existing repository-header measurement remains unchanged and separate from the lower-line budget.

## Migration Plan

No persisted-data migration. Keep the historical finalized archive, restore canonical specs to main before automation applies this reduced-scope delta, and let delivery finalize it. No manual readiness, merge or deployment.
