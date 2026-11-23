# Proposal

## Why

Updating herdr-app-custom replaces the Settings view, losing its in-memory section and returning the still-open dialog to Look. Keep Updates visible so the person sees the ongoing job and its result without navigating again.

## What Changes

- Restore Updates only for an update started from that Settings opening, while pending/running or within two minutes after completion. A fresh per-opening identity in supported overlay props prevents persisted native overlay IDs from overriding new-dialog destinations or Look defaults; navigation away and explicit dismissal disarm restoration.
- Preserve truthful update-in-progress feedback across replacement, then reconcile the existing detached runner's status and verified revision through the existing controller.
- Extend the row/controller VM fixtures with fresh-mod replacement, pending launch, running and completed/failed/unknown results; no native changes or deployment.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `customization-lifecycle`: keep the open Updates section and truthful row state when the update replaces Settings.

## Impact

Settings initialization/navigation/dismissal in `src/features/settings/main.js`, a shared Settings opener used by existing UI entrypoints, the existing shared update projection/controller and row fixtures (`tests/update-row.test.mjs`, `tests/update-markers.test.mjs`). Shared navigation state is runtime-only and excluded from portable preferences. No new dependencies, worker/deployment policy, native frame patches, live-home access or other behavior changes.
