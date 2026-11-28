# Proposal

## Why

The right-hand Git list repeatedly flashes Herdr's interrupted-render fallback during routine updates, and its warm activity line appears abruptly before breathing. The existing once-only render retry addresses recovery, not the unidentified trigger; the activity spec also currently forbids the requested fade to nothing.

## What Changes

- Reproduce the interrupted-render trigger with the production panel and fix the responsible customization path, retaining diagnostics rather than hiding the host banner or increasing its watchdog.
- Preserve loaded rows, pins, section order, folds, pagination and scroll during same-context refreshes.
- Give the existing stationary activity line a native opacity entrance from zero and exit to zero, without an initial full-line flash or a JavaScript frame loop; retain its breathing cadence during sustained work.
- Keep reduced-motion feedback static and preserve cold Loading and other panels' existing behavior.
- Record whether interruption and line flicker have independent causes, with evidence and limitations.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Smooth the complete warm activity-line lifecycle and explicitly guard routine refreshes against interrupted-render fallback while retaining genuine failure diagnostics.

## Impact

Expected source scope is `src/plugins/git/mod/main.js` and only the directly implicated Git/controller helpers identified by reproduction. Targeted render-recovery, background-render, loading-line and mounted-budget fixtures plus disposable native proof will cover the change. No native binary/SDK patches, new UI controls, informational messages, account changes, terminal operations or deployment to the person's running app are proposed.
