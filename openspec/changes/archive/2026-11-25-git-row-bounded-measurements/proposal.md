# Proposal

## Why

Lower-line PR hover repeats complete visible wording, including through parent strips. The person approved informative-only lower-line tooltips, rejected title/header font or truncation changes, and then required this change to integrate main's mounted renderer, quiet/batched reads and measured dot alignment without retaining competing measurement work.

## What Changes

- Show lower-line tooltips only for clipped/compact/omitted values or additional known facts, without repeat-only parent summaries.
- Reuse main's existing `RowPresentations.layout` full/compact/clipped choices; add no intrinsic probe, measurement scheduler, width cache or native element.
- Cache only pure time/check tooltip facts in the existing presentation model, invalidating on timestamp/detail changes.
- Keep main's renderer for reveal/caps, scroll/fades, dot/icon offsets, headers and native title truncation/full-title hover.
- Compare cold fully mounted ordinary/coordinator 30/60-row builds against current main with a +2ms ceiling, and guard the existing mounted model in regression tests.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Informative item/combined-strip hover using existing layout facts without extra measurement work or changed visual/scroll behavior.

## Impact

Tooltip decoration in Git's shared row renderer, pure tooltip facts in its existing presentation model, timestamp/check/agent descriptive facts, focused hover/geometry tests, and a main-relative mounted-render benchmark. No title/header typography change, custom truncation, new hover IO, measurement mechanism, dependency, deployment or native patch.

This rework is explicitly approved. Main's merged #56, #59, #66 and #70 implementations remain authoritative. The existing archive is revised in place for bot refinalization; earlier commits remain in Git history.
