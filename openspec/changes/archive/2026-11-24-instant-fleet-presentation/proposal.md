# Proposal

## Why

A visual fleet link currently disappears across off/on until a fresh Crew read succeeds, even though the pair was already verified; the real read-only Core path measured 7.50 seconds with discovery on this machine. The installed #51 also leaves some reads abandoned until their 45-second lease expires, delaying first pairing and consolidated Git inventory.

## What Changes

- Preserve the last verified same-machine coordinator/fleet identity in bounded host-local state across preference/plugin disablement, app restart and mod replacement; disabling hides the pair immediately but does not forget it.
- Restore adjacency, chain icons, inherited badge colour and linked space-only drag reordering in the first render after enablement when both exact remembered space identities still exist, before any status read completes.
- Verify in the background; successful contradictory evidence atomically clears or replaces memory, while failed, slow, interrupted and expired reads retain presentation. Ignore missing-space memory immediately and clear it outside render once the machine layout is authoritative.
- Keep fresh verification mandatory for consolidated Git inventory reads, coordinator colour writes, worker navigation, terminal movement and messaging. Remembered-only Git uses standard Loading and does not resurrect inventory across toggles.
- Reproduce the real-path expired read in an isolated native instance, repair its measured cause, and make abandoned-reader recovery independent of the initiating mod copy without blocking for a 45-second lease or duplicating healthy in-flight commands.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-experience`: instant remembered-pair presentation across toggles and restart, including space-only block reordering without current Crew verification.
- `plugin-integrations`: separate remembered visual identity from fresh authority and bound cross-instance abandoned-reader recovery while retaining safe discovery and inventory behavior.

## Impact

- `src/shared/fleet-display.js`, `src/shared/space-preferences.js`, Crew's fleet provider and status reader, and linked-space reorder callers/guards.
- Existing mounted-toggle, fleet identity/freshness, block-reorder and disposable native transport tests; relevant README and fleet architecture/transport documentation.
- No Herdr/Core binary changes, deployment, user settings changes, Crew-home writes, process changes in the live installation, or new companion services.
- Excludes PRs #56/#59, title-hover/checks-icon work, and changes to generic Git paging, checks or header styling.
