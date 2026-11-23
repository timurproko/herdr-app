# Proposal

## Why

The herdr-app-custom update markers currently wait for Check now or a mounted hourly check after a merge. Reuse the configured Git webhook relay to discover published-main changes within seconds, without authorizing automatic installation.

## What Changes

- Hoist the existing authenticated desktop relay subscription from the visible Git panel to Git's existing non-footer chrome lifecycle, and publish bounded public invalidation signals through namespaced shared state. Both Git and Custom updates consume that one stream; hiding Git must not stop update hints.
- Debounce push hints for only `timurproko/herdr-app` into the same fixed-repository main check used by Check now, with a short automatic-hint rate limit and the existing worker lease. Publish through `custom.customization-update` so the existing dots/navigation marker need no new UI.
- Retain the existing mount and hourly checks, unchanged manual Check now behavior and explicit Update-only installation. Disabled/unconfigured Git and relay failures quietly leave only the fallbacks.
- Document the maintainer's explicit repository webhook enrollment using the actual current Add repo UI. No receiver change or Cloudflare redeployment is proposed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `customization-lifecycle`: Add debounced webhook-driven published-main checking while preserving manual actions and mount/hourly fallbacks.
- `plugin-integrations`: Share one Git-owned authenticated relay stream through public runtime signals, independent of panel visibility and disabled with the plugin.

## Impact

- Git plugin lifecycle/declaration, desktop socket controller and panel invalidation consumer; the registry/API boundaries remain intact.
- `src/features/workspace-chrome/main.js`, `src/shared/customization-updates.js`, `src/services/updates/update-worker.cjs` and their fixture tests; packaging mappings only if a new shared helper is introduced.
- README and update/webhook/architecture/testing guidance. Existing webhook configuration already requests push; the relay already accepts and forwards it.
- No native changes, dependencies, background companion changes, webhook creation, repository-settings edits, Cloudflare operations or live-home access during this task. Live enrollment/delivery verification remains a separate maintainer action.
- Based on default `main` at `58c540b`; PR #10 is still open and changes Settings/update-controller reload handling. Rebase onto main after it merges before implementing the overlapping controller work.
- The simpler startup/focus/ten-minute polling alternative and its tradeoffs are recorded in design.md for approval; it is not implemented by this plan.
