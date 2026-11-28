# Proposal

## Why

Updating plugin tools currently requires opening Plugins and repeating each Update action on each machine. Settings Updates should expose confirmed pending plugin updates and apply them together without introducing another installer.

## What Changes

- Add a minimal Plugins section below the existing Herdr section in Settings Updates, listing confirmed pending plugin-tool updates across connected machines.
- Include pending plugin updates in the existing Settings icon and Updates navigation notification dots.
- Offer one Update action for all pending plugin updates, processing this computer first and connected peers sequentially in the existing customization-update inventory order.
- Reuse plugin-declared update actions and their checks, transport, safety and confirmation rules; show progress and machine-specific failures inline and continue with remaining machines.
- Preserve existing native and herdr-app-custom rows and their explanation, without extra informational messages, controls or options.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `customization-lifecycle`: Add connected-machine plugin update aggregation, contribution to existing update indicators, and a single explicit batch update using existing plugin actions.

## Impact

- Settings Updates and shared mounted-chrome indicator consumers.
- Generic plugin registry declarations and Settings requirement check/action orchestration, with Crew's existing Outdated result and UPDATE_CREW action as the initial provider.
- Existing Settings execution admission and captured-machine context; packaging mappings only if a shared module is added.
- Focused mocked discovery, ordering, action-reuse, failure and indicator tests; no full test suite, live installation, native patch, terminal manipulation or new dependency.
