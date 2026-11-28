# Proposal

## Why

Pressing Update in Settings could fail on the first attempt with `install failed: Command failed: ...node.exe ...startup-frames.mjs ...` and pass on the second. The install step runs the native patch refresh worker once; that worker exits busy (75) while the running App's own mount-time repair holds `startup-frames.lock` (deploying new mods remounts them, which starts that repair), and also when it has just cleared a stale lock left by a repair killed at its timeout. The installer treated both transient states as fatal, and the message showed only the truncated command line.

## What Changes

- The install and rollback steps wait for a busy native patch refresh within a bounded time (45 seconds), retrying the worker instead of failing the whole update.
- A refresh that stays busy past the bound, or fails for any other reason, reports the step's own diagnostic instead of the child process command line.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `customization-lifecycle`: Installation waits out a transient native patch refresh lock and reports step diagnostics.

## Impact

`tools/deploy.mjs` (shared `runStartupFrames` helper and install-stage failure reason), `tools/rollback.mjs` and a new regression `tests/startup-frames-busy.test.mjs`. The worker's lock semantics, the App's startup repair and the updater supervisor are unchanged.
