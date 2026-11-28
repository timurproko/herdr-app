# Proposal

## Why

After a successful Usage reset, the dialog can show refilled quotas while the pinned sidebar summary retains old values until Refresh all. The existing reset path already requests a forced collection, so the missing cross-view update needs a scoped regression rather than another generic refresh call.

## What Changes

- Make successful Claude and Codex resets publish the resulting authoritative quota values to the existing sidebar summary for the captured machine and account, without manual Refresh all.
- Preserve pins, account selection, provider identity, existing reset confirmation and silent success styling.
- Cover independently mounted dialog and summary views, local and remote targets, and obsolete or failed requests with fixture-only targeted regressions.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Require successful Usage resets to reconcile the dialog and pinned summary for the captured target without extra UI or unrelated state changes.

## Impact

Expected implementation area: `src/plugins/usage/mod/main.js`, `src/plugins/usage/mod/store.js` and `tests/regression/usage-summary.test.mjs`. Existing host shared-state APIs and collector transport remain the boundary; no native changes, credential migration, new polling, or dependencies are proposed. The exact failed publication or target-selection boundary must be reproduced before choosing the minimal code correction.
