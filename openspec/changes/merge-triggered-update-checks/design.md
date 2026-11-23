# Design

## Context

See proposal.md for motivation. `customization-updates.js` mounts a check and a one-hour timer; `update-worker.cjs` independently persists an hourly attempted-time gate, including failures. The worker already compares `git ls-remote` public main with manifest-linked installed provenance, uses a 15-second command bound and a 20-second check lease, and has separate guarded deployment actions.

Git currently creates `GitWebhooks` inside its panel and stops that socket when hidden or changing context. `relay-worker.js` authenticates both incoming GitHub bodies and native subscribers, but strips branch/merge fields. Sandboxed mods cannot share JS objects: only public runtime state can cross mods. Features must integrate through the registry, not direct Git-plugin imports. Workspace chrome already emits a mounted plugin lifecycle moment; Usage demonstrates the supported `window().active` observation pattern.

## Goals / Non-Goals

**Goals:** one machine-local availability controller, one relay transport owner, truthful badges after a bounded authoritative check, and graceful polling-only operation. The existing updater remains the only authority for installed-vs-main status.

**Non-Goals:** no instant/offline delivery guarantee, replay service, native wake API, new cloud service, Actions workflow, provenance redesign, automatic installation, CI polling fallback, daemon, account operation or deployment during this task. Git's separate explicitly configured agent automation is not changed or invoked by the update subscriber.

## Decisions

### 1. Persist the retry deadline and schedule the chrome from it

Change both the mounted timer and worker cache, not just one. Record validated `nextAttempt` and consecutive failures alongside existing attempted/checked/target fields in `update-check.json`; these remain runtime-only. Healthy checks choose a single 120–180 second random delay. Failure retries use roughly 5, 10, 20 and then 30 minutes, jittered and capped at 30 minutes. Reset failures on success. Persist attempts before I/O and retain the last good availability on failure.

Use rescheduled one-shot chrome timers driven by the worker deadline; an early/competing wake must not push the deadline out. Keep the worker's existing exclusive file lease and bounded noninteractive main-only command, UI pending guard, cross-mod request tickets, and native eager-check suppression. Validate missing/legacy timing fields conservatively against the new policy, not the old hour; clamp invalid/future timestamps so clock changes cannot stall detection forever. Inject clock/random into fixture seams.

Startup requests a check immediately, coalescing a sufficiently recent persisted check and honoring active failure backoff. Observe supported `window().active` transitions after at least two minutes inactive, yielding before I/O/shared writes. Detect timer drift after sleep and perform the same catch-up. Successful relay ready/reconnect also catches up. There is no assumed browser `online` event: if the installed host exposes no public network/resume event, timer drift, activation and relay reconnect are the supported signals, and bounded retry is the offline fallback.

Reject automatic storm bypasses: distinguish manual force from automatic cache invalidation. Manual Check now keeps its existing force behavior. A relay/catch-up request can bypass healthy freshness but not automatic failure backoff. The controller stores at most one dirty generation during an in-flight check; a newer generation requires one follow-up rather than trusting a comparison begun before the event. Never launch deployment or arm the manual three-second success confirmation from automatic checks.

Alternative: shorten the UI interval only. Rejected because the persisted worker hour would still suppress actual reads.

### 2. A mounted, plugin-owned relay broker replaces the panel socket owner

Move the canonical transport implementation into Git's integration helpers, mounted from non-footer chrome through a registry lifecycle/subscription moment. Expose only the required supported socket/timing/host functions through the plugin API; do not bypass the architecture boundary. The updater supplies a fixed repository/branch subscription through the registry and receives public invalidation callbacks; it never reads Git credentials or imports plugin code.

The broker has one socket per desktop/home/relay scope. Add an expiring runtime owner token with a bounded renewal timer for duplicate chrome mounts/replacement, and recheck ownership/generation after every asynchronous boundary. Losing/disabled owners close sockets and cannot publish. Credentials are read privately by the transport, never carried in lease/shared state. Transport reconnection retains bounded exponential backoff with jitter and authentication timeout. Missing/invalid keys block repeated render retries until explicit setup/config revision or a new lifecycle, not a busy loop.

The visible Git panel consumes bounded public per-repository invalidation revisions and a ready/reconnect generation through a Git-owned shared-state adapter instead of opening a socket. Cap/evict metadata; eviction/generation gaps cause one normal shown-panel catch-up, not polling. Hidden panels stop PR/agent reads; showing a panel still catches up. Existing single-flight dirty-flag pagination refresh, selected repository/machine guards, CI sweep and manual Refresh remain. Repository selection must not reconnect or retarget the broker. Relay notices remain hints for both consumers.

Alternative: add a second independent update WebSocket. Rejected because it duplicates owners, credentials reads and reconnect storms. Keeping the socket inside Git's shown panel is also rejected because it misses the requested hidden/other-repo behavior.

### 3. Explicit Git-disable and setup policy

Git enabled plus valid local relay URL/keys permits the update subscription to stay active even when its panel is closed. Git disabled means no socket, no new Git credential/setup reads and no stale relay callback work. Custom's own polling remains active. Re-enabling performs normal authenticated connect/catch-up.

With no relay or invalid keys, updates run polling-only and do not create/repair credentials. With valid setup but no timurproko/herdr-app hook enrollment, the socket can still serve other Git subscribers, but there are no matching update hints; polling remains authoritative. Do not run periodic enrollment inventory or modify hooks to enable notification. Explain this distinction in Settings-related documentation; no new opt-in is needed for networking while Git is disabled because it will not occur.

### 4. Add minimal optional metadata, then filter strictly

Keep protocol 1 and existing fields compatible. For `push`, forward a bounded validated `ref`. For `pull_request`, forward a bounded validated action, boolean merged value and base branch string. Validate both at the HMAC-verified relay producer and consumer; omit/refuse malformed optional fields without breaking ordinary CI invalidations. Do not forward a SHA, body, author or secrets: the authoritative main check does not need them.

The update filter matches repository case-insensitively to `timurproko/herdr-app` and branch case-sensitively: `push` with `ref === 'refs/heads/main'`, or `pull_request` with action closed, merged strictly true, base main. Reject other events, incomplete legacy fields and unrelated repositories/branches. Never copy notice facts into target SHA or availability.

Deduplicate deliveries with a bounded set, debounce a merge's push/PR pair about 300 ms, and enforce a 15-second minimum spacing between automatic invalidation checks with at most one pending dirty generation. Automatic failure backoff wins over that floor. On a healthy connected setup this targets seconds after delivery plus the existing maximum check duration, not a zero-latency promise. Sustained events cannot spawn unbounded checks or queued jobs.

### 5. Validation travels with each delivered outcome

Outcome 1 extends `tests/update-check.test.mjs` and `tests/update-row.test.mjs` with deterministic healthy cadence, persisted failure backoff/jitter, startup, idle activation, delayed timers, manual bypass, leases, stale replies, eager checking, independent homes, badge propagation and unchanged deployment-safety behavior. Update README and docs/COMMANDS.md with fallback timing and limits.

Outcome 2 extends `tests/git-webhooks.test.mjs` and controller fixtures for metadata validation, HMAC/auth failure, legacy relay payloads, fixed repo/main filters, push+PR bursts, event-during-check, disconnect/reconnect, hidden/other-repo Git, Git disable/re-enable, missing keys, no enrollment, owner replacement and exactly one socket. Cover package closure/plugin architecture and preference exclusion for all new runtime keys. Update docs/GIT-WEBHOOKS.md, docs/ARCHITECTURE.md, README and commands with shared ownership and explicit rollout steps. No real socket/account/cloud/deploy tests.

Run quick targeted fixtures as each outcome lands; final integration is CI, not repeated broad local suites. Native timing/delivery smoke checks remain a clearly named maintainer follow-up after approved installation, not a claim from fixtures.

## Risks / Trade-offs

- [Relay delivery is best effort; older relays lack metadata] → periodic startup/idle checks remain mandatory; missing metadata never claims a merge.
- [More network/process reads on many machines] → 2–3 minute healthy jitter, persisted failure deadlines, single-flight leases and a bounded invalidation rate.
- [Long outage can delay recovery up to the backoff cap] → preserve manual Check now; successful reconnect requests catch-up but cannot create an offline storm.
- [Cross-mod socket-owner handoff can lose events] → lease/generation guards, reconnect catch-up and polling; no durable job replay.
- [Existing Git docs promise hidden panels close sockets] → explicitly replace that promise with hidden-panel read suppression and Git-disabled transport shutdown.
- [No universal public resume/network event] → use the observed window activation API plus timer drift and relay reconnect; disclose that a sleeping/closed app cannot be notified.

## Migration Plan

No deployment in this task. After approval, implement the two outcomes in order in this same draft PR, with tests/docs and task ticks per outcome. No native binaries or installed files are edited.

After eventual merge, these are **person-owned actions**:

1. Install the new observer once on each Desktop/Custom machine from its ordinary clean-main clone using the existing guarded full-deploy flow. One desktop's deploy:all does not install another full desktop. Existing host/A1 compatibility requirements still apply.
2. On each participating relay setup, explicitly use Git's **Configure** action to redeploy the owned relay with validated metadata. No secrets need changing or copying. Old relay versions continue polling-only for exact merge detection.
3. In Git's Repositories list, explicitly enroll **timurproko/herdr-app** using that UI's save action, under a GitHub login with required permissions. No new webhook event types are needed: push and pull_request are already requested.
4. Every participating desktop needs locally valid relay credentials and configuration. Do not sync the private key file as preferences. A pc2 without relay setup still detects independently every 2–3 minutes while healthy; a Core-only pc2 has no desktop badge.
5. Optionally perform an authorized real-delivery smoke check: merge a normal approved PR, leave Settings/Git closed, inspect existing dots, and confirm Update never launches. Check a second desktop separately and exercise missed-event catch-up. This plan authorizes none of those live operations.

Recovery uses the existing explicit ownership-checked rollback process if needed; never overwrite modified outputs or reset a checkout. Disabling Git immediately removes the relay path while leaving polling. A relay rollback only removes the accelerator; older protocol-1 clients continue using the existing metadata, and fallback checks still work.
