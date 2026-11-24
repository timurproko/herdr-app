# Proposal

## Why

A coordinator Git panel can keep a merged PR in Open while checks keep changing. The current unenrolled fallback reads checks only and stops on settlement, so it cannot discover a later merge in either coordinator or ordinary Git.

## What Changes

- Make authoritative PR state, draft status and completion timestamps travel with every row refresh, including the fallback.
- Extend the existing 45-second unenrolled fallback to shown Open/Draft rows even after checks settle, retaining bounded repository batches and failure backoff.
- Reconcile merge, close, reopen and convert-to-draft transitions into the correct tabs and totals without clearing loaded rows or disturbing unaffected ordering, pins, folds or pagination.
- Reproduce the enrolled coordinator incident using the real packaged controller, Crew provider and relay consumer with fake GitHub data; fix the observed aggregate fault rather than assuming the fallback alone explains it.
- Document event and fallback delay limits and add transition regressions for both views.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Replace pending-only fallback policy with shown-open state-and-check freshness, and require coherent state transitions and counts across ordinary and coordinator views.

## Impact

Focused changes to `src/plugins/git/mod/pulls.js`, `main.js` and, only where reproduction requires it, `aggregate.js`; packaged regression fixtures and Git refresh documentation. No new dependencies, webhook enrollment, credentials, live GitHub mutations, deployment or automation authority. Existing 24-hour historical eligibility and three-request aggregate concurrency remain. PR #45 owns request transport/notices; preserve that work and integrate default-branch changes before final validation. PRs #44 and #46 are out of scope.
