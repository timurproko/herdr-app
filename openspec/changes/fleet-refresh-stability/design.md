# Design

## Context

See proposal.md for the three reproduced failures. `fleetContexts()` currently requires equality with a signature of all machine spaces, panes and relevant terminals before it even attempts an exact pair join. The status error handler publishes `status:null` with a new timestamp, while a 30-second expiry rejects a prior snapshot independently of a pending replacement. Both Spaces row projection and Crew tag suppression consume that eligibility decision.

The original `fleet-link-look` change has already been finalized automatically on this branch as `openspec/changes/archive/2026-11-23-fleet-link-look/`; retain that commit and archive. This follow-up uses a new active change in the same PR, with the first four outcomes carried forward as complete. The identity-lifetime extension and finished-task PR retention are implemented. After merging origin/main's #17 relay/render guards and #19 shared PR row/labels, all 146 Windows CI-selected entries passed. The seventh, pinned enrollment-picker outcome is new planning work requiring approval.

## Goals / Non-Goals

**Goals:** Make refresh transactional from the sidebar's perspective, distinguish unsuccessful transport from a negative identity result, and bound retained state without weakening action identity checks.

**Non-Goals:** No new discovery protocol, polling loop, deployment, live-session manipulation, preference export, stale worker control or changes to the four completed visual/Git-section outcomes. The existing status reader adds only the supported `--all` argument.

## Decisions

### Separate successful verification from refresh bookkeeping

Retain sanitized last-successful status and verified pair facts separately from pending tokens, last-attempt/retry bookkeeping and errors. Starting a refresh updates only in-flight bookkeeping. A successful current completion atomically replaces status and its verified/negative result; failures leave successful data and its age unchanged. Keep the existing coalescing, per-machine leases, preference/plugin generation guards and late-result rejection.

Preserve the existing retry cadence using attempt/retry timestamps rather than refreshing successful verification age on errors. Otherwise keeping an old success timestamp after failure would make every subsequent render launch another status request. Explicit manual refresh may bypass the normal freshness delay, never an already-live request lease.

### Bind presentation to pair identity, not unrelated topology or wall-clock age

The committed baseline removed the broad signature from render eligibility, but the strengthened contract also narrows the binding-dependent fingerprint itself. Include only native machine/parent/child identities, the verified coordinator home/owner terminal and its membership, and the fleet adoption labels that prove this pair. Unrelated spaces, their names/order/selection, and unrelated tabs/panes on any machine are not binding dependencies. Capture one coherent model per resolution. Broad inventory changes may schedule existing discovery, never erase the display or supersede a valid same-pair read merely because another space changed.

The 60-second display cutoff is superseded. The justified bound is structural: one last-verified pair per known machine, scoped to its exact home/owner/adoption identity and the lifetime of both native space IDs. Keep that already-verified presentation across transport failure, timeout and partial snapshots, regardless of elapsed time. Clear only on explicit disablement, absence of either native space, or a completed coherent status read proving owner/home release, ended coordinator, incompatible adoption labels or a different pair. Relevant identity changes invalidate action eligibility immediately and trigger verification; until that read completes, presentation remains last known rather than publishing unknown. No unverified first read creates a pair.

This does not allow unbounded record accumulation or control: prune records whose native spaces no longer exist, keep at most one per known machine, and require strict fresh live verification for all actions. Retry attempts do not become successful verification or extend action freshness. Expired/obsolete read leases still cannot publish.

### Restore the verified pair from durable local identity facts

Use a dedicated versioned `custom.fleet.display` record through public namespaced shared-state persistence, separate from expiring status/PR data and pending tokens. The installed read-only SDK explicitly documents `shared` values as persisted; this is the same boundary used for durable Custom workspace facts. Do not directly edit native files. Persist only bounded machine-qualified space IDs, crew home, owner identity and minimal adoption-label facts needed to recognize the verified pair; never reports, PR inventories, task records, credentials or session content/transcripts.

Read the sanitized record on cold module/view startup so projection and tags draw the attached pair in the first available native-space frame, before any asynchronous status result. Reverify in the existing background lifecycle. Mod hot reload/layout changes must not clear the record. Explicit attachment/Crew disablement clears it via the preference/plugin transition boundary; successful negative reads and absent native IDs prune it. Keep it out of portable preference snapshots and reject malformed/unknown-version records conservatively. Test fresh VM/module graphs with only persisted identity facts and live native spaces, not warmed provider state.

### Retained presentation is not action authority

Expose bounded display facts through the existing plugin contribution boundary, not feature imports of Crew code. Where display and action validity differ, use a presentation-purpose option on workspace-link resolution: Spaces projection and Crew tag suppression use the stable view, while normal link queries, pair commit checks and `fleetPullContext` keep strict live verification and existing action freshness.

Do not let a visible pair degrade into a standalone reorder when live verification is temporarily unavailable. Keep the displayed block's captured metadata for a gesture, but require the existing strict binding check before public move commands and throughout their acknowledgements. Reject unsafe actions rather than treating retained row geometry as proof. Existing Git reads and robot focus callbacks continue checking current exact terminal/task/binding identity; ambiguous or expired action contexts start no follow-up work.

Git additionally needs a read-only stale presentation context to retain its already-loaded coordinator rows when strict action context expires. Mark it visibly stale/unverified (without restoring the removed task heading or generic incomplete-list notice), preserve same-home row/count/fold presentation, and start no fresh GitHub work or worker navigation from that retained context. On restart no PR inventory is persisted: show the coordinator's waiting/stale state until actual verified task facts arrive. Current exact owner/home/terminal checks still gate new reads and callbacks.

This is preferable to caching a raw UI tree, treating retained facts as fresh authorization, or adding arbitrary detach delays. Durable presentation can outlive action freshness without granting control.

### Retain same-home finished-task PRs without retaining worker authority

The installed status JSON supplies closed records and their recorded PRs via `--all`, scoped by its top-level `home` and current live owner. It supplies no task lifecycle timestamps. Switch the existing `readFleetStatus` seam to `crew status --all --json`, preserving its 15-second timeout, response/task bounds and sanitized publication. Do not read task directories or add another companion endpoint.

Keep live owner-to-coordinator/home verification mandatory. Closed-task records can contribute a recorded URL from that verified home without a live worker; they must never establish a fleet space, prove current worker identity or import another home's history. Keep history available to the verified coordinator even when the last worker finishes and no live fleet child remains. Failed/stopped or unknown task states without an eligible live task do not become historical contributors; records without a valid PR add nothing.

Extend aggregate link metadata to distinguish historical sources from live worker targets. Deduplicate by canonical owner/repository plus PR number before reads and counts. If any live source matches, retain the existing live/selected-worker precedence and robot. With only historical sources, render no robot and return no navigation target; previously captured robot actions must fail after the live source disappears, even though the PR row stays.

Apply the conservative Closed policy after authoritative GitHub facts arrive: historical-only Open/Draft PRs remain visible; historical-only Merged/Closed PRs appear only while `mergedAt`/`closedAt` is within the last 24 hours. Invalid/missing closure dates do not admit historical closed rows. Live task PRs retain existing Open/Closed treatment and are not age-filtered. Compute repository/global counts from the same eligible deduplicated rows. Repositories containing only ineligible old history must not leave a flood of empty headers; preserve scoped loading/errors where a requested fact is unavailable.

Use the existing `PR_FIELDS` timestamps and the aggregate's three-read concurrency; keep lightweight completion-age metadata in the aggregate rather than widening every ordinary PR view model. Retain bounded candidate facts for webhook-driven changes/reopened PRs, but never show the whole closed history or periodically poll unchanged GitHub facts. Age exclusion uses the existing lifecycle/clock, not a new timer. No task-age or current-coordinator-session heuristic is supported by the source JSON, so GitHub's last-day closure cutoff is the explicit chosen bound.

### Proposed single enrollment picker reuses the status-bar account presentation

The supplied screenshots show one enrollment card inside each coordinator repository section and an upward account-email menu in the bottom status bar. Current `repositorySection` adds `liveCIInfo(...,'repository',repo)` inside each body; ordinary Git already places its one `liveCIInfo` after the scroll area. Do not change the ordinary path.

For coordinator mode, derive confirmed unenrolled names from the existing `GitNotices` controller in the exact order of rendered repository sections. Move only that enrollment prompt outside the repository bodies into one non-shrinking bottom footer after `task-pulls-scroll`. Keep global missing-setup precedence and leave scoped PR errors and genuinely repository-specific stale/error notices in their sections. Folding/scrolling cannot hide the footer. Unknown membership stays quiet; opening the picker performs no membership or GitHub read and never enrolls anything.

Use the same `pillTrigger` with `chevronSize:12`, `pillMenu` and `dropdown(...,{above:true})` as `workspace-status/claude-account.js`, not another chevron or custom popup. Hoist the account's pure choice-menu presentation into a shared UI helper used by both account and enrollment callers, preserving its existing menu surface, width/height bounds, row height, padding, hover/highlight and selected-slot treatment. Account authentication, data loading and switching logic remain in the account controller. Preserve the existing enrollment card's info icon, message and surface; its text-side account-style trigger adds the chevron in the same relative position and muted colour as the status-bar account control. Let left mouse-down bubble to native Popover, matching the account opener's existing contract.

Always use the dropdown, even for one unenrolled repository; zero confirmed choices removes the footer. Labels are canonical owner/name, deduplicated in section order. Capture choices plus coordinator/home/view scope at opening, keep keyboard index/focus local, and use the shared menu-row hover/highlight states. Escape/backdrop closes; Up/Down moves and Enter chooses. A choice closes the popup and uses the existing Settings payload (`section:'plugins', plugin:'git', pluginSection:'repository', pluginSearch:<captured repo>`). Revalidate the captured presentation scope/eligible choice so a refresh, tab change or another coordinator cannot retarget it. Membership/configuration changes can close/reopen an obsolete menu rather than shifting its entries under the pointer.

The future tests must compare the actual shared component output used by both callers, including chevron glyph/12px size/muted inheritance/gap, upward Popover anchor and row geometry/hover/highlight, not merely assert that another styled menu exists. Cover zero/one/multiple unenrolled repositories, enrollment completion, section order/deduplication, all sections folded, long scroll content, keyboard/dismissal, captured Settings payload and no enrollment/extra reads. Preserve the merged relay render guards, shared PR row/labels/separators and the ordinary Git banner's existing regressions.

### Regression coverage follows the actual refresh/projection boundary

Extend the existing deterministic packaged-provider regressions with fake clocks, deferred source promises and fresh VM restarts. Sample `pluginWorkspaceLinks` in presentation mode, actual `projectLinkedRows`, and Crew tags before starting, while pending, across the old 30-second boundary, and after same-binding completion. Every sampled frame must remain attached, with no fleet badge/tag fallback.

Exercise forced Git manual refresh and the existing aggregate/relay lifecycle, periodic status refresh, focus/selection, adding/removing/reordering/renaming unrelated spaces, adding/removing panes/tabs and other-machine changes. Cover coalesced reads, malformed/error/timeout results, unchanged-identity retention far beyond 60 seconds, successful negative/change results, cold restart/mod reload/layout switch with persisted facts, no verified history, explicit disablement, corrupt persistence, cross-machine collisions, moved/replaced terminals and obsolete generations. Add action tests showing a retained visual pair cannot start a standalone reorder or stale Git read/worker focus action.

Also cover a finished worker whose PR stays Open, recent versus old/undated historical Closed/Merged PRs, live/historical duplicate precedence, several closed tasks sharing one PR, no-PR reviewer/scout records, another home/machine, last-worker exit, re-open/merge webhook transitions, scoped counts/empty repository headers and stale robot callbacks.

Update README/docs/TESTING.md/docs/ARCHITECTURE.md with the bounded display policy, `--all` source, conservative 24-hour Closed history and authority boundaries. After approval and implementation, run targeted regressions and the full Node 24 `CI=true npm run test:ci` suite, including the earlier git-location/pr-agent-links/sidebar-refresh fixtures. Native pixels and real remote refresh behavior remain unclaimed without deployment/explicit validation.

## Risks / Trade-offs

- [An outage can display last-known structure for a long-lived pair] → Bound it to exact extant native identities and one record per known machine; honor completed contradictory evidence/disablement, show stale Git state and refuse unverified actions.
- [Keeping successful timestamps could create immediate retry loops] → Track attempts/retry cadence independently from successful verification age.
- [A stale display pair could accidentally become a single-space move] → Preserve block metadata for rendering/gestures but use strict live binding at commit and acknowledgement boundaries; assert no commands in the regression.
- [Historical status JSON has no task lifecycle timestamps] → Use GitHub close/merge time for the explicit 24-hour Closed cutoff; exclude undated closed history and do not read private task files.
- [A deduplicated historical source could hide a live robot or retain a dead target] → Filter targets to current live contributions first, revalidate on click, and count each full PR identity only once.
- [Partial host snapshots are not proof of removal] → Distinguish a coherent completed negative result from pending/transport uncertainty, while never inventing a pair without verified history.

## Migration Plan

Continue the same branch and PR. Do not edit or revert the bot's finalized archive; link this active follow-up change for later finalization. Existing runtime snapshots may lack the new durable identity record and must not be treated as persisted verification merely because a role hint exists. Populate durable facts only from an actual verified pair, with no portable schema migration or copied PR/task history. No deployment is authorized. Rollback is a normal source revert, never a live-document rewrite.
