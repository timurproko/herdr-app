# Proposal

## Why

Native fixtures and preview/inspection tools remove temporary mods but leave their per-mod data directories behind. Cleanup should remove both resources owned by that invocation without risking installed mods or unrelated runtime state.

## What Changes

- Add exact-name temporary-mod lifecycle cleanup in `tools/temporary-mod.mjs`, retaining the existing facade installer.
- Apply it to temporary-mod creators in feature tests and diagnostic tools, including hand-written cleanup and failure/interruption paths where mod removal already occurs; keep script structure intact.
- Extend disposable-home fixtures to cover successful completion, thrown errors and preservation of unrelated mod/data directories.
- Trace the reported `custom-feedback-preview` creator in available repository files/history and fix it if present; do not remove historical leftovers from the real home.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is development-tool resource cleanup, not a product behavior change; `skip_specs: true` records that boundary.

## Impact

`tools/temporary-mod.mjs`, temporary-mod callers under `tools/` and `tests/features/`, and `tests/temporary-mod.test.mjs`. No dependencies, deployment behavior, stock mods or live-home cleanup. Native tools will not be executed against the real Herdr home. The reported feedback preview and temporary plugins opener names have no exact creator match in tracked files or the searched history; implementation must report any remaining provenance limitation rather than delete by pattern.
