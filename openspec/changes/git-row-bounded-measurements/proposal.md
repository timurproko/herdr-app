# Proposal

## Why

Lower-line PR hover currently repeats complete visible wording, including through parent strips. The earlier implementation also exceeded the native render watchdog at 100 cold mounted rows. The person reduced this PR to informative lower-line tooltips only; title/header presentation and the visual alignment delivered by main are not part of this change.

## What Changes

- Show lower-line tooltips only for clipped/compact/omitted values or additional known facts, without repeat-only parent summaries.
- Reuse a 512-entry font/style/zoom cache with at most four lower-line intrinsic probes per render and visible ordinary rows first; native callbacks advance later batches without delaying rows.
- Preserve lower-line allocated physical widths by native element ID across text and typography changes.
- Retain native PR titles and repository headers exactly as on main, including inherited interface font, native truncation and full-title hover. No title measurement or custom truncation is introduced.
- Protect cold fully mounted ordinary/coordinator 30/60/100/200-row cost with deterministic baseline-relative tree budgets and an opt-in native gate.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Informative lower-line hover, bounded measurement work and geometry lifetime without title or header presentation changes.

## Impact

Git lower-line rows and tooltip facts, targeted layout/hover tests, mounted-row budget fixtures, README and testing/render-budget guidance. Main's icon/separator geometry is retained. No font override, title-width probe, prefix fitting, custom suffix, header rendering change, new hover IO, dependency, deployment or native patch.

The previous finalized archive is historical only. This active follow-up and the canonical specs supersede its abandoned title/header work without rewriting finalization history. The current scope was explicitly approved in the person's correction; no further plan approval is pending.
