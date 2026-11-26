# Proposal

## Why

Switching from the coordinator to a worker clears pull requests and counts even when the panel already knows that repository. Both directions should use the coordinator's existing immediate retained-list, header-activity and in-place refresh mechanism, without pinning, reordering or move-to-top animation on space entry.

## What Changes

- Share the coordinator-entry retained-presentation lifecycle and section/header rendering with ordinary repository entry; keep their task-scoped and repository-wide read authorities distinct.
- Reuse bounded machine/repository/routing-qualified runtime snapshots before starting background refresh, including coordinator sections as worker-entry seeds and ordinary repository return snapshots.
- Show the matching repository's existing section header, count and chevron immediately, retaining rows and known Open/Closed values with truthful completeness metadata until coherent replacement.
- Preserve existing PR #87 chip-click and fallback robot-click pin animation unchanged. Space entry only restores cached section data and starts header refresh; it never creates a pin, reorders rows or joins the click-animation path.
- Keep cold Loading only for an unresolved destination with no compatible presentation, and invalidate incompatible identity/generation results without showing another repository or machine.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: shared warm repository entry and scoped cached-count provenance, explicitly excluding entry-driven pinning or reordering.

## Impact

- Expected source: `src/plugins/git/mod/main.js`, `aggregate.js`, `pulls.js`, `agent-links.js`, and a small plugin-local pure presentation helper if needed; `pin-swap.js` and click-animation behavior remain outside implementation scope; focused tests and owner documentation.
- Base is PR #87's current `feature/review-flow-chip` head `d76e8b0aec524016022dd9675037c5c806d22d8b`, because it remains open. Before implementation use latest main if #87 has merged; otherwise continue on its latest approved branch head without rewriting published work.
- Necessary overlap with PR #88 is exactly the aggregate publication/return methods and Git section/header rendering. Reuse its `published`/`presentationRows`/`hasPresentation`/`updating` mechanism and `activity(t.working)` header treatment, not a competing loading design. Coordinate those seams before implementation; do not import or edit its Spaces, Crew settings or multi-child work.
- No native app/Core changes, deployment, live agent input, durable PR inventory, new polling, relay/account changes or automation authority. Excluded paths: `src/services/updates`, `tools/deploy-all.mjs`, `src/plugins/trello`.
- Planning only: implementation and disposable native before/after evidence wait for approval.
