# Design

## Context

`startup-frames.mjs` serializes native patch refresh through `.customizations/startup-frames.lock` and exits 75 (busy) when the lock is held by a live process, or after it removes a lock left by a dead one. The running App starts the same worker when mods mount (`restoreFrames` and the palette startup repair). A full deploy rewrites those mods, so the App remounts them and starts its repair while deploy runs its own refresh. Deploy and rollback invoked the worker once with `execFileSync`, so a busy exit failed the update with Node's `Command failed: <command line>` message and no diagnostic.

## Decisions

- **Retry busy exits in the caller, not in the worker.** The worker keeps its rule never to steal a live lock and never to recurse after clearing a stale one. A shared `runStartupFrames` helper in `tools/deploy.mjs`, also used by `tools/rollback.mjs`, retries exit 75 every 500 ms.
- **Bound the wait at 45 seconds.** That covers the App's 15-second worker timeout with margin and stays far below the 480-second deploy stage limit. When the bound is exhausted, the update fails with a reason that names the busy lock.
- **Report the step's own diagnostic.** Non-busy refresh failures are not retried and carry the first meaningful stderr/stdout line, the exit code or `timed out`. The deploy CLI derives the install-stage reason for any failed child step the same way, never from the command line.
- **Wait synchronously.** Deploy runs inside synchronous locks, so the pause uses `Atomics.wait` rather than restructuring deploy as async code.

## Risks

- A hung live repair can delay an install by up to 45 seconds before the definite failure; this is preferable to failing at once.
- The App-side repair is unchanged and may briefly report busy while deploy holds the lock; it retries on its next mount.
