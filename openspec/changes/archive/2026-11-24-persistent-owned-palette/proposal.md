# Proposal

## Why

Herdr 0.1.18 changed its private palette source, correctly disabling our reviewed-byte native patch and removing Custom's palette presentation/routing. The person chooses a customization-owned replacement that remains installed across restarts and updates, rather than another permanent per-release patch dependency.

## What Changes

- Implement `custom-palette` using public host/GPUI capabilities, preserving the existing Custom palette's catalog, search, history, visuals, keyboard/mouse interaction and safe Custom routing on capable 0.1.17/0.1.18 and newer hosts.
- Preserve 0.1.18's new manifest palette contributions, argument validation, deduplication and shortcut matching; retain 0.1.17's dynamic theme behavior.
- Own the Custom-scoped Ctrl+Shift+P mapping in the selected desktop home's user `keys.json`, not Herdr defaults or a runtime override of `app.palette`. Route the Custom status-bar entry to the same mod.
- Persist ownership independently of shared UI state. Full installation and mounted Custom startup/reload self-checks repair stock/missing mappings automatically, check binding configuration and host reload errors, log repairs and surface failures visibly without silently treating vanilla as success.
- After successful migration, retire palette native-patch refresh and safely remove its owned installation; preserve unrelated feedback, other layouts and personal edits.
- A separate worker delivers the small 0.1.18 reviewed-patch stop-gap PR described in `stopgap.md`. This PR implements only the durable replacement, tolerating either landing order; installation remains the person's normal update.

## Capabilities

### New Capabilities

None; reuse the existing customization lifecycle boundary.

### Modified Capabilities

- `customization-lifecycle`: move the Custom palette from a reviewed native exception to a persistent, capability-based owned overlay while preserving native-patch safety for feedback and the temporary stop-gap.

## Impact

New `src/features/palette/` model/view/manifest and narrow installed manifest reader; `customization.json` packaging; host facade capability contract; `src/features/workspace-status/main.js`; `src/features/workspace-chrome/startup.js`; owned key installation/startup diagnostics and native-patch retirement. Tests use real pinned 0.1.18 stock source and existing 0.1.17 originals, disposable desktop homes and mocked machine transport. README/architecture/commands/testing guidance will describe the new ownership and persistence boundaries.

No native binaries, Core documents, credentials, live app files, processes or other workers' changes are touched. This computer and any pc2 Desktop installation receive the same policy through their normal full customization update; Core-only shell deployment is not a palette installation. Upstream-sync activation is a separate explicitly authorized repository operation, not a prerequisite for the owned palette.
