# Proposal

## Why

Native scrollbar drags and track clicks can scroll without invalidating the JavaScript snapshot. A spacer-based virtual window can therefore show blank space; the coordinator has explicitly approved replacing it with mounted revealed rows and a measured per-row render budget in PR #56.

## What Changes

- Remove viewport windowing and spacers; all revealed rows in unfolded sections remain mounted for every native scroll input.
- Reveal ten presentation items initially and ten more near the bottom on wheel, pointer or size events; use a yielded post-layout check to fill a viewport that does not overflow yet. Keep an unfolded header with its first row or visible notice; omit sections with no eligible content after every state transition.
- Read actual native scroll-handle geometry for fades at render and on received events. Document that fades/reveal can lag after a consumed scrollbar event until the next event or render.
- Retain measurement/label caches and add pure per-row presentation/style memoisation, never native interactive trees. Measure complete renders at 30/60/100/200 mounted rows; use a measured safe cap plus one quiet Show more row only if 200 exceeds about 35ms.
- Scope coordinator safety probes to revealed rows of unfolded sections, preserving selection-generation guards, cadence, routing, counts, folds, pins, enrollment and anchor corrections.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Mounted incremental reveal replaces virtualized scrolling; safety follows revealed unfolded rows and fade feedback honestly reflects host notification limits.

## Impact

Same PR/worktree as `git-scroll-paging`; the previous finalized change remains historical and is not rewritten. Changes affect Git rendering, pure presentation/reveal helpers, regression fixtures, native measurement tooling and Git documentation. No host patch, polling observer, new GitHub inventory reads, deployment or merge is introduced. The native build target is below 20ms at 100 mounted rows.
