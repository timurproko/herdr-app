# Design

## Context

See proposal.md for motivation. This is diagnostic/recovery hardening, not a claimed fix for the original unobserved failure.

Current source facts:

- `src/plugins/crew/plugin.js` reads `crew status --all --json --discover-prs` with a **25-second command timeout**. Only an exact unsupported-flag refusal permits one **15-second** plain-status fallback. `fleet.js` coalesces copies using a **45-second** shared in-flight lease. Keep these bounds.
- `readFleetStatus` collapses nonzero/timeout results into `Crew status unavailable`. `refreshFleets` swallows exceptions and records attempt time/signature but no reason; obsolete completions silently return.
- Spaces initializes `spaces.refresh` and invokes it every **250 ms** from `checkNew`. Healthy provider attempts have a **10-second TTL**, and strict actions have **30-second freshness**. Therefore the current mounted sidebar already retries failed reads through its periodic lifecycle; it is not accurate to claim every timeout waits indefinitely for an unrelated user event. Cold/no-history failures leave rows detached until a later successful eligible read. Established display identity survives failures.
- Startup/mod replacement starts verification from Spaces initialization. Persisted in-flight leases can defer a replacement reader until expiry, and no persisted token alone authorizes a cold runtime. There is currently no self-owned post-failure callback, and a retired view cannot be relied on to finish its work.
- The plugin spec explicitly prohibits an extra retry loop and pins the healthy cadence. The requested bounded recovery is a behavior/spec change requiring plan approval.
- `herdr.writeTextFile` already exists in the facade and is supported compare-before-write IO, but the plugin API does not export it. There is no general customization-log API. The existing `.customizations/update.log` belongs to the updater, not fleet diagnostics.

## Goals / Non-Goals

**Goals:** Keep the next failure's bounded sanitized explanation; make an eligible unverified scope retry predictably without user interaction; cover restart and graph replacement; preserve ordinary healthy refresh, display retention and action guards.

**Non-goals:** Infer the original incident's cause, guess attachment from names, persist task/PR inventory, retry GitHub facts, change discovery budgets or credentials, introduce a daemon, alter native Core documents, restart/deploy the person's app, or touch other tasks' PRs.

## Decisions

### 1. Structured, bounded provider diagnostics

Use a separate namespaced versioned runtime diagnostic container so recording a discarded old reply never mutates the successful binding/token or extends action freshness. Bound entries to applicable known machines (maximum 256); keep only the last relevant failure and last discard, with reason code, timestamp, attempted generation, current-generation comparison and numeric exit/timeout facts when available. Store a bounded retry attempt/deadline alongside this diagnostic state, not in portable preferences or durable display identity.

Use allowlisted categories such as transport-error, status-timeout, status-exit, invalid-status, layout-unready, membership-incomplete, no-owner, identity-mismatch, no-fleet, obsolete-generation, obsolete-identity and expired/replaced-read. Do not persist arbitrary exception text, command lines, stderr/stdout, home paths, task lists, account data or transcripts. Current authoritative absence is diagnostic information and stops recovery; incomplete membership with live candidates is uncertainty and remains retryable. Partial PR discovery with otherwise valid fleet verification is not a verification failure.

A late obsolete completion updates only its discard record if it is newer than the previous discard, and never overwrites newer current-generation failure/success/retry facts. Success marks the failure resolved without erasing the bounded last-failure evidence. Existing display retention and fresh-action rules remain unchanged.

### 2. Customization-owned bounded log, no subprocess per failure

Export the existing supported `writeTextFile` through the plugin API and use it with `appHome`/`readTextFile` to maintain `.customizations/fleet-verification.log`. This avoids repurposing the updater's log or depending on an undocumented console sink. Maximum **64 KiB and 128 lines**; each line has a fixed field set (time, machine, reason, attempted/current generation, optional numeric code/timeout), never raw error text. A shared deduplication marker suppresses the same machine/generation/reason within an unchanged failure episode across mod copies. Recovery or reason/generation changes begin a new episode. Use serialized compare-before-write and a bounded conflict retry; failure to log records a sanitized diagnostic flag but cannot block the verification/retry path. All IO yields out of render and is disabled under native checking.

### 3. Failure-only one-shot scheduling

Arm one outstanding recovery deadline per machine/generation using the existing mounted provider lifecycle and supported one-shot timers, not a new periodic daemon. After failed completion wait **2 s, then 5 s, then 15 s, then 60 s repeatedly**. These are inter-attempt delays, not deadlines that overlap a 25-second command. Existing shared in-flight ownership prevents duplicate status IO across copies; lifecycle-triggered reads must respect `nextRetryAt` rather than bypass backoff via the old failed-attempt TTL. Explicit manual Refresh may request an immediate eligible retry but cannot bypass an active reader or identity checks.

Stop this recovery chain on witnessed successful verification (including a verified retained fleet), disablement, missing relevant candidates or coherent authoritative absence. A workerless verified coordinator/home can still use normal history refresh; stopping recovery does not delete valid history. Preserve normal ten-second healthy refresh and resume failure recovery when a later relevant verification fails. A valid `unavailable` PR discovery result alone does not start a special retry chain.

Timer callbacks recheck preference/plugin state, generation, candidates, deadline and read ownership. They can neither perform render-time writes nor restart obsolete work. Duplicate copies can join a shared read without separately escalating backoff. Keep scheduler deadlines runtime-only; a mounted replacement re-arms the current eligible deadline and can reclaim an abandoned read only after its finite lease expires. Startup with no ready layout must defer safely rather than publish absence. Spaces' existing periodic lifecycle remains a lightweight ownership/dependency reconciliation path, not another accelerated retry source.

### 4. Existing verification feedback only

Carry a sanitized optional diagnostic through generic presentation context; Git does not import Crew implementation files. Extend the existing verification tooltip with the reason and time, retaining the existing Verifying / Waiting for fleet verification / Stale labels and rows. Where cold startup has a uniquely routed live coordinator candidate but no verified history, use that existing waiting presentation with empty links and no read/navigation authority; never manufacture a pair, home provenance or task inventory. Non-coordinator spaces retain ordinary folder Git. Runtime diagnostic facts and the log are always readable by an agent, including discarded attempts after disablement, without a new UI page or toast.

## Risks / Trade-offs

- More transient reads under load → serial bounded attempts, completion-based backoff and the existing command/lease caps; no overlap or GitHub polling.
- Several mod copies or closing Settings → shared scheduling/read ownership, cancellation/generation guards and startup/replacement regressions; no reliance on a retired view's callback.
- Late replies corrupt newer evidence → separate last-discard record and freshness checks, with tests for disable-enable and replacement races.
- Log IO conflicts or unavailable filesystem → supported CAS, bounded retry and best-effort failure isolation; runtime facts remain the primary explanation.
- Diagnostics expose private process text → allowlisted categories/numeric fields only; include secret-bearing fake stderr in regression inputs and assert it never reaches facts, tooltip or log.
- Unknown original trigger → explicitly retain uncertainty; synthetic timeout recovery does not prove the historical incident was a timeout.

## Migration Plan

No deployed migration or live action during this task. Older installations ignore the additive runtime key and local log; neither is exported. Implement only after plan approval, update feature/architecture/testing documentation, and validate in packaged and disposable fixtures. Run the full CI subset once with no other suite running, then inspect required checks on the final PR head. Normal future installation is maintainer-controlled; no deploy, native restart or setting change is authorized here. Reverting the implementation restores the prior retry behavior without granting stale diagnostic facts action authority.
