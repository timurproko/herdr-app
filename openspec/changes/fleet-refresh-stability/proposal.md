# Proposal

## Why

The completed fleet presentation fixes in PR #18 do not address a reproduced refresh-time sidebar flash: broad live-model signatures, destructive read-error publication and hard expiry can transiently remove a still-valid attachment. The person requests stable last-verified presentation during refresh, plus retention of finished workers' still-open PRs, which currently disappear because the reader omits closed tasks and the join explicitly skips them.

## What Changes

- Preserve the four implemented PR outcomes and their finalized `fleet-link-look` archive unchanged; add fifth and sixth outcomes on the same branch and PR, not a separate delivery.
- Keep the last verified fleet presentation through Git manual refresh, relay events, focus changes and periodic Crew status reads. Do not treat a pending read or unrelated pane changes as a completed negative result.
- Publish successful binding changes atomically, remove an attachment on a completed authoritative negative result, and immediately honor disabling Crew or attachment and definitive removal/replacement of its native spaces.
- Supersede the original 60-second display expiry with an identity-lifetime bound: at most one persisted verified pair per machine/home, valid only for its exact existing native spaces until a completed read disproves it or the feature is disabled. Failed/timed-out reads and unrelated topology changes never erase an unchanged pair.
- Persist only sanitized machine/space identities, coordinator home/owner identity and fleet adoption facts in a dedicated local runtime record, excluded from portable preferences. Restore attachment in the first frame after app restart, mod reload or layout switch, with background verification and no stale action authority.
- Narrow binding-dependent fingerprints to the two spaces, home/owner and adoption labels; unrelated space/tab/pane changes on any machine may schedule discovery but never invalidate presentation. Missing first-read evidence without persisted verified history never creates a pair.
- Keep Git's last known rows in an explicit stale/unverified state when action context expires, rather than switching away from coordinator mode or authorizing reads/navigation from the persisted display. Strict action freshness remains independent.
- Retained visuals do not authorize stale pair moves, Git reads or worker navigation. Existing live identity, machine, ownership and generation guards continue to fail closed.
- Read `crew status --all --json` through the existing bounded reader seam. Add only recorded PRs of closed tasks from the currently verified coordinator's crew home, without requiring their former terminals to remain live.
- Conservative history policy: retain finished-task PRs while GitHub says Open/Draft; show their merged/closed PRs only for 24 hours after GitHub's merge/close timestamp. Exclude undated historical closed PRs. Live-task PRs keep their existing eligibility regardless of age.
- Deduplicate full repository/PR identities across all tasks; a live task wins and keeps its robot. A historical-only PR has no robot or worker navigation. Tasks without a recorded PR add nothing.
- Add deterministic refresh-cycle projection/tag regressions and historical eligibility/deduplication tests through real Git/Crew paths, plus matching README/testing/architecture/spec updates. No deployment.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-experience`: Define persistent first-frame fleet presentation, identity-lifetime rather than time-only retention, and no detached frames across unrelated topology changes or refresh uncertainty.
- `plugin-integrations`: Clarify that cached presentation is not authorization; distinguish failed reads from absence and support same-home closed-task PRs with bounded Closed history and live-target precedence.

## Impact

- Primary owner: `src/plugins/crew/fleet.js`; audit the existing registry/workspace-link consumers so retained presentation cannot weaken action guards.
- Regression coverage: packaged Crew provider, `tests/fleet-git.test.mjs`, and actual Spaces projection/render fixtures using deferred status replies and a fake clock.
- Documentation: README, docs/TESTING.md and docs/ARCHITECTURE.md; OpenSpec deltas refine the active cache/identity contract. The first implementation of outcomes 5 and 6 is already committed and passed all 143 Windows CI-selected entries; the stronger persistence/retention extension is planned but not implemented.
- The existing status command gains `--all`; no new Crew capability, process, polling loop, portable preference, native patch or installed-app change. Run the full Node 24 CI-selected suite after implementation, including git-location, pr-agent-links and sidebar-refresh.

## Investigation evidence

Read-only synthetic reproduction at `.artifacts/fleet-refresh-repro.mjs` uses the actual packaged provider, registry and `projectLinkedRows`:

- Adding an unrelated pane leaves `bindFleet` valid but renders linked frames `[false, false, true]` across a delayed refresh. `fleetContexts` rejects the entire broad signature before rejoining the still-valid pair.
- A failed read immediately renders `linked:false`: the catch handler replaces the cache with a fresh `status:null` entry.
- A pending successful refresh straddling the 30-second hard expiry renders `[true, false, true]`.

Starting a read itself does not clear the cache, and Git relay invalidation does not directly reset fleet state; the flash is in shared Crew cache eligibility/publication consumed by both Spaces links and tags. The committed baseline fixes those immediate paths with separate display/action context and error backoff. The person's stronger follow-up now requires the visible pair to survive beyond the prior hard timeout and across restarts, so expiry-only retention is explicitly superseded by the persistent identity-scoped design.

Read-only inspection of installed `crew status --all --json` confirmed home/owner/tasks and closed records with recorded PRs, but no task-created/closed timestamps. Therefore history age will use GitHub's existing `mergedAt`/`closedAt` fields, not invented task ages or private task-file reads. Source bounds remain 1 MiB/4096 tasks, with the aggregate's existing three concurrent targeted reads; unchanged facts are not periodically re-fetched.
