# Tasks

## 1. Independent frequent availability checks and catch-up

- [x] 1.1 Replace the worker's hourly cache with validated persisted 120–180 second healthy jitter, bounded failure backoff and legacy/clock-skew handling; verify deterministic timing, retry reset and prior-availability retention in tests/update-check.test.mjs.
- [x] 1.2 Replace the mounted hourly timer with deadline-driven one-shot scheduling, startup and supported window-activation/timer-drift catch-up; verify two independent fixture homes, idle return, no render loops and no manual success feedback in tests/update-row.test.mjs.
- [x] 1.3 Retain manual force, cross-mod tickets, UI single-flight, process check leases, eager-check exclusion, check command bounds and deployment/unknown-outcome gates; verify the existing update fixture matrix plus new overlapping-check cases without invoking deployment.
- [x] 1.4 Document cadence, jitter, failure delays, per-machine evidence and supported catch-up limits in README.md and docs/COMMANDS.md; verify those descriptions match the fixture timing constants and remove obsolete hourly claims.

## 2. Merge-triggered availability through one authenticated relay owner

- [x] 2.1 Add only validated optional push-ref and PR action/merged/base fields to the relay notice; verify malformed, unrelated and legacy payloads plus HMAC/authentication and payload-minimization regressions in tests/git-webhooks.test.mjs.
- [x] 2.2 Move Git transport ownership to its chrome-mounted registry lifecycle, expose only needed supported APIs, and add owner lease/generation and bounded reconnect handling; verify one socket under duplicate mounts, replacement, disable/re-enable and missing/invalid local setup.
- [x] 2.3 Replace the panel-owned socket with bounded public revision subscriptions preserving shown-panel PR/page refresh semantics; verify hidden panels issue no reads, repository switches do not retarget transport, and reconnect/generation gaps trigger one authoritative catch-up.
- [x] 2.4 Connect an update-owned fixed-repository/main subscription through the registry to automatic cache invalidation, with delivery deduplication, short debounce, 15-second rate floor and at most one dirty follow-up; verify push/merged-PR filters, bursts, in-flight events, failure backoff and authoritative-only badge changes.
- [x] 2.5 Preserve polling-only operation for Git disabled, relay absent, old metadata or unenrolled repositories without provisioning or credential export; verify fallback, preference exclusion, source-independent package closure and plugin architecture fixtures.
- [x] 2.6 Update README.md, docs/COMMANDS.md, docs/GIT-WEBHOOKS.md and docs/ARCHITECTURE.md with socket ownership, Git-disable policy, near-immediate timing limits and explicit person-owned relay redeploy/enrollment/per-desktop setup; verify no installation or live-delivery claim is made by fixture results.
