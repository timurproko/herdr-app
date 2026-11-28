# Tasks

## 1. Install and rollback wait for a busy native patch refresh within a bounded time instead of failing the update

- [x] 1.1 Reproduce with the real deploy CLI into a disposable home: a live and a stale `startup-frames.lock` each fail the first install with the truncated command line.
- [x] 1.2 Add a shared `runStartupFrames` helper that retries busy exits (75) for up to 45 seconds and use it in deploy and rollback.
- [x] 1.3 Add a regression covering the stale lock, a live lock released during the wait and the exhausted bound.

## 2. Install failures show the failing step's own diagnostic instead of a truncated command line

- [x] 2.1 Report exhausted waits and other refresh failures with the step's stderr or exit status, and derive the install-stage reason for any failed child step the same way.
- [x] 2.2 Cover the diagnostic with targeted assertions in the same regression.
