# Design

## Context

See proposal.md for the three reproduced failures. `fleetContexts()` currently requires equality with a signature of all machine spaces, panes and relevant terminals before it even attempts an exact pair join. The status error handler publishes `status:null` with a new timestamp, while a 30-second expiry rejects a prior snapshot independently of a pending replacement. Both Spaces row projection and Crew tag suppression consume that eligibility decision.

The original `fleet-link-look` change has already been finalized automatically on this branch as `openspec/changes/archive/2026-11-23-fleet-link-look/`; retain that commit and archive. This follow-up uses a new active change in the same PR, with the first four outcomes carried forward as complete and pending stability and finished-task PR outcomes.

## Goals / Non-Goals

**Goals:** Make refresh transactional from the sidebar's perspective, distinguish unsuccessful transport from a negative identity result, and bound retained state without weakening action identity checks.

**Non-Goals:** No new discovery protocol, polling loop, deployment, live-session manipulation, preference export, stale worker control or changes to the four completed visual/Git-section outcomes. The existing status reader adds only the supported `--all` argument.

## Decisions

### Separate successful verification from refresh bookkeeping

Retain sanitized last-successful status and verified pair facts separately from pending tokens, last-attempt/retry bookkeeping and errors. Starting a refresh updates only in-flight bookkeeping. A successful current completion atomically replaces status and its verified/negative result; failures leave successful data and its age unchanged. Keep the existing coalescing, per-machine leases, preference/plugin generation guards and late-result rejection.

Preserve the existing retry cadence using attempt/retry timestamps rather than refreshing successful verification age on errors. Otherwise keeping an old success timestamp after failure would make every subsequent render launch another status request. Explicit manual refresh may bypass the normal freshness delay, never an already-live request lease.

### Stop treating unrelated topology as pair invalidity

A broad machine signature can remain a discovery/supersession hint, but cannot by itself decide that a previously verified pair should be drawn detached. Rejoin the cached sanitized status against the relevant live owner/worker membership before rejecting an actionable pair. Selection and ordering alone never change identity. Prefer one captured model per resolution rather than comparing one snapshot and joining another.

Store the verified parent/child/machine/binding needed for presentation when a successful read and exact join agree. While the next read is pending or fails, retain that display for up to 60 seconds from successful verification. This is a hard maximum, not a sliding deadline: attempts, timeouts and failures never renew it. Expired lease completions cannot make old facts fresh. Completed valid absence/changed ownership and explicit preference/plugin disablement remove or replace the old display immediately; definitively removed/replaced native spaces cannot remain as ghost rows.

### Retained presentation is not action authority

Expose bounded display facts through the existing plugin contribution boundary, not feature imports of Crew code. Where display and action validity differ, use a presentation-purpose option on workspace-link resolution: Spaces projection and Crew tag suppression use the stable view, while normal link queries, pair commit checks and `fleetPullContext` keep strict live verification and existing action freshness.

Do not let a visible pair degrade into a standalone reorder when live verification is temporarily unavailable. Keep the displayed block's captured metadata for a gesture, but require the existing strict binding check before public move commands and throughout their acknowledgements. Reject unsafe actions rather than treating retained row geometry as proof. Existing Git reads and robot focus callbacks continue checking current exact terminal/task/binding identity; ambiguous or expired action contexts start no follow-up work.

This is preferable to caching a raw full UI tree, ignoring identity errors, extending every cache timestamp indefinitely or adding a delay before all detachments. Those alternatives either hide real relationship changes or authorize stale state.

### Retain same-home finished-task PRs without retaining worker authority

The installed status JSON supplies closed records and their recorded PRs via `--all`, scoped by its top-level `home` and current live owner. It supplies no task lifecycle timestamps. Switch the existing `readFleetStatus` seam to `crew status --all --json`, preserving its 15-second timeout, response/task bounds and sanitized publication. Do not read task directories or add another companion endpoint.

Keep live owner-to-coordinator/home verification mandatory. Closed-task records can contribute a recorded URL from that verified home without a live worker; they must never establish a fleet space, prove current worker identity or import another home's history. Keep history available to the verified coordinator even when the last worker finishes and no live fleet child remains. Failed/stopped or unknown task states without an eligible live task do not become historical contributors; records without a valid PR add nothing.

Extend aggregate link metadata to distinguish historical sources from live worker targets. Deduplicate by canonical owner/repository plus PR number before reads and counts. If any live source matches, retain the existing live/selected-worker precedence and robot. With only historical sources, render no robot and return no navigation target; previously captured robot actions must fail after the live source disappears, even though the PR row stays.

Apply the conservative Closed policy after authoritative GitHub facts arrive: historical-only Open/Draft PRs remain visible; historical-only Merged/Closed PRs appear only while `mergedAt`/`closedAt` is within the last 24 hours. Invalid/missing closure dates do not admit historical closed rows. Live task PRs retain existing Open/Closed treatment and are not age-filtered. Compute repository/global counts from the same eligible deduplicated rows. Repositories containing only ineligible old history must not leave a flood of empty headers; preserve scoped loading/errors where a requested fact is unavailable.

Use the existing `PR_FIELDS` timestamps and the aggregate's three-read concurrency; keep lightweight completion-age metadata in the aggregate rather than widening every ordinary PR view model. Retain bounded candidate facts for webhook-driven changes/reopened PRs, but never show the whole closed history or periodically poll unchanged GitHub facts. Age exclusion uses the existing lifecycle/clock, not a new timer. No task-age or current-coordinator-session heuristic is supported by the source JSON, so GitHub's last-day closure cutoff is the explicit chosen bound.

### Regression coverage follows the actual refresh/projection boundary

Turn the read-only repro into deterministic packaged-provider regressions with a fake clock and deferred source promises. Sample `pluginWorkspaceLinks` in presentation mode, actual `projectLinkedRows`, and Crew tags before starting, while pending, across the old 30-second boundary, and after same-binding completion. Every sampled frame must remain attached, with no fleet badge/tag fallback.

Exercise forced Git manual refresh and the existing aggregate/relay lifecycle, periodic status refresh, focus/selection and unrelated pane changes, coalesced reads, malformed/error/timeout outcomes, retries without timestamp extension, successful negative/change results, no verified history, the 60-second cutoff, disablement, cross-machine collisions, moved/replaced terminals and obsolete generations. Add action tests showing a retained visual pair cannot start a standalone reorder or stale Git read/worker focus action.

Also cover a finished worker whose PR stays Open, recent versus old/undated historical Closed/Merged PRs, live/historical duplicate precedence, several closed tasks sharing one PR, no-PR reviewer/scout records, another home/machine, last-worker exit, re-open/merge webhook transitions, scoped counts/empty repository headers and stale robot callbacks.

Update README/docs/TESTING.md/docs/ARCHITECTURE.md with the bounded display policy, `--all` source, conservative 24-hour Closed history and authority boundaries. After approval and implementation, run targeted regressions and the full Node 24 `CI=true npm run test:ci` suite, including the earlier git-location/pr-agent-links/sidebar-refresh fixtures. Native pixels and real remote refresh behavior remain unclaimed without deployment/explicit validation.

## Risks / Trade-offs

- [A short outage can display last-known structure] → Limit it to 60 seconds from verified success; honor confirmed changes and explicit disablement immediately, and refuse unverified actions.
- [Keeping successful timestamps could create immediate retry loops] → Track attempts/retry cadence independently from successful verification age.
- [A stale display pair could accidentally become a single-space move] → Preserve block metadata for rendering/gestures but use strict live binding at commit and acknowledgement boundaries; assert no commands in the regression.
- [Historical status JSON has no task lifecycle timestamps] → Use GitHub close/merge time for the explicit 24-hour Closed cutoff; exclude undated closed history and do not read private task files.
- [A deduplicated historical source could hide a live robot or retain a dead target] → Filter targets to current live contributions first, revalidate on click, and count each full PR identity only once.
- [Partial host snapshots are not proof of removal] → Distinguish a coherent completed negative result from pending/transport uncertainty, while never inventing a pair without verified history.

## Migration Plan

Continue the same branch and PR. Do not edit or revert the bot's finalized archive; link this active follow-up change for later finalization. Existing runtime snapshots may lack new optional display/attempt fields and must be handled conservatively without a portable schema migration. No deployment is authorized. Rollback is a normal source revert, never a live-document rewrite.
