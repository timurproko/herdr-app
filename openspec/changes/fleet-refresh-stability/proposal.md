# Proposal

## Why

The completed fleet presentation fixes in PR #18 do not address a reproduced refresh-time sidebar flash: broad live-model signatures, destructive read-error publication and hard expiry can transiently remove a still-valid attachment. The person requests stable last-verified presentation during refresh, plus retention of finished workers' still-open PRs, which currently disappear because the reader omits closed tasks and the join explicitly skips them.

## What Changes

- Preserve the four implemented PR outcomes and their finalized `fleet-link-look` archive unchanged; add fifth and sixth outcomes on the same branch and PR, not a separate delivery.
- Keep the last verified fleet presentation through Git manual refresh, relay events, focus changes and periodic Crew status reads. Do not treat a pending read or unrelated pane changes as a completed negative result.
- Publish successful binding changes atomically, remove an attachment on a completed authoritative negative result, and immediately honor disabling Crew or attachment and definitive removal/replacement of its native spaces.
- Keep prior verified presentation after failed, malformed or timed-out reads for at most 60 seconds from the last successful verification; attempts and failures never renew that deadline. Unknown first reads never create an attachment.
- Retained visuals do not authorize stale pair moves, Git reads or worker navigation. Existing live identity, machine, ownership and generation guards continue to fail closed.
- Read `crew status --all --json` through the existing bounded reader seam. Add only recorded PRs of closed tasks from the currently verified coordinator's crew home, without requiring their former terminals to remain live.
- Conservative history policy: retain finished-task PRs while GitHub says Open/Draft; show their merged/closed PRs only for 24 hours after GitHub's merge/close timestamp. Exclude undated historical closed PRs. Live-task PRs keep their existing eligibility regardless of age.
- Deduplicate full repository/PR identities across all tasks; a live task wins and keeps its robot. A historical-only PR has no robot or worker navigation. Tasks without a recorded PR add nothing.
- Add deterministic refresh-cycle projection/tag regressions and historical eligibility/deduplication tests through real Git/Crew paths, plus matching README/testing/architecture/spec updates. No deployment.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-experience`: Define stable, bounded last-verified attachment presentation across refreshes and distinguish transport uncertainty from confirmed relationship changes.
- `plugin-integrations`: Clarify that cached presentation is not authorization; distinguish failed reads from absence and support same-home closed-task PRs with bounded Closed history and live-target precedence.

## Impact

- Primary owner: `src/plugins/crew/fleet.js`; audit the existing registry/workspace-link consumers so retained presentation cannot weaken action guards.
- Regression coverage: packaged Crew provider, `tests/fleet-git.test.mjs`, and actual Spaces projection/render fixtures using deferred status replies and a fake clock.
- Documentation: README, docs/TESTING.md and docs/ARCHITECTURE.md; OpenSpec deltas refine the active cache/identity contract.
- The existing status command gains `--all`; no new Crew capability, process, polling loop, portable preference, native patch or installed-app change. Run the full Node 24 CI-selected suite after implementation, including git-location, pr-agent-links and sidebar-refresh.

## Investigation evidence

Read-only synthetic reproduction at `.artifacts/fleet-refresh-repro.mjs` uses the actual packaged provider, registry and `projectLinkedRows`:

- Adding an unrelated pane leaves `bindFleet` valid but renders linked frames `[false, false, true]` across a delayed refresh. `fleetContexts` rejects the entire broad signature before rejoining the still-valid pair.
- A failed read immediately renders `linked:false`: the catch handler replaces the cache with a fresh `status:null` entry.
- A pending successful refresh straddling the 30-second hard expiry renders `[true, false, true]`.

Starting a read itself does not clear the cache, and Git relay invalidation does not directly reset fleet state; the flash is in shared Crew cache eligibility/publication consumed by both Spaces links and tags.

Read-only inspection of installed `crew status --all --json` confirmed home/owner/tasks and closed records with recorded PRs, but no task-created/closed timestamps. Therefore history age will use GitHub's existing `mergedAt`/`closedAt` fields, not invented task ages or private task-file reads. Source bounds remain 1 MiB/4096 tasks, with the aggregate's existing three concurrent targeted reads; unchanged facts are not periodically re-fetched.
