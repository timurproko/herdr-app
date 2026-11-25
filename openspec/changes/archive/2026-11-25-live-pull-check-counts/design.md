# Design

## Context

See proposal.md for reproduction and live-schema findings. Main f3fe341 reuses contexts whenever head and summary are unchanged, on probes and event paths. Raw aggregates include superseded runs and cannot preserve the existing count semantics. The approved approach uses bounded contexts for pending rows rather than raw aggregates.

## Goals / Non-Goals

Goals: refresh pending numeric facts without an additional probe request; preserve current counting, row retention, publication guards and quiet rate refusals. Non-goals: relay changes, live deployment, global app changes, final-history rereads, or pagination beyond the existing first 100 contexts.

## Decisions

- Share the existing context selection and derivation between state probes and full-detail reads. State aliases for known pending/unknown rows include contexts; settled aliases include only summary. Parse and validate all selected numbers before publishing. Keep up to 40 total aliases and 20 detailed aliases per chunk. A newly changed settled row can still need the existing follow-up detail batch.
- Pending event/manual/target refreshes do not reuse old contexts on an unchanged summary. They retain existing metadata/detail batching and stale-generation checks.
- Record checksReadAt only when numeric facts have actually been read successfully, not when state-only reads or cached results succeed. Preserve the timestamp on cached reuse. Missing timestamps are overdue for pending rows.
- The existing scheduler uses 45 seconds for repositories containing pending/unknown shown open rows; otherwise retain 45-second uncovered and 120-second enrolled cadence. No second timer is introduced.
- At more than 90 seconds without numeric confirmation, the next eligible pending probe is a fresh transport demand rather than joining an already-started read. Busy panel queues keep the one-second retry; healthy active reads are not overlapped or cancelled. The pending obligation cannot be satisfied by state-only or cached reads. Network latency, active reads, failures and cooldowns remain explicit exceptions to a wall-clock freshness guarantee.
- Use the shared rate gate's absolute retryAt when a probe is refused or joins an existing cooldown. Do not restart a fifteen-minute cooldown merely because a probe encounters its final few seconds. Retry on the existing timer at expiry, without another webhook; keep loaded rows and no error UI.

## Risks / Trade-offs

- More nodes while pending -> cap detailed aliases at 20, retain existing first-100 refusal, retain Windows argv bounds. Ten pending rows estimate about 1,010 connection nodes; twenty about 2,020 with this selection. GitHub counts connection nodes rather than every selected scalar/object. Live one-row detail measured cost 1 / nodeCount 101; aggregate-only cost 1 / nodeCount 1. Point cost remains approximately one per bounded operation, not one per context.
- More enrolled pending cycles -> approximately 80 rather than 30 points/hour/repository in the one-chunk steady state. Settled enrolled frequency remains unchanged.
- More than 100 contexts -> preserve existing incomplete-context failure and last-good facts, not a falsely complete count.
- Historical recovery trigger unknown -> retain proven reproduction separately from hypotheses about event forwarding, cooldown and final summary change.

## Migration Plan

No state migration, new preferences or deployment in this task. Build/deploy through existing guarded tooling only after separate authorization; rollback by reverting source changes. Numeric timestamps are runtime facts only, not portable preferences or credentials.
