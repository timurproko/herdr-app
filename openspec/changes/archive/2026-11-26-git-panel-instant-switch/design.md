# Design

## Context

See proposal.md for motivation and dependency/collision boundaries. Investigation was performed on main `5b62e79` and PR #87 head `d76e8b0`; PR #88 was initially read at `b9dd677`; its Git seams were rechecked at `ab60ac9` for this scope revision without importing unrelated work. The person's latest instruction supersedes the earlier space-entry pin requirements.

### Current state and root cause

- `location.js:location()` captures live shell-reported cwd, machine (`on`), terminal, space and tab. Ordinary `main.js` keys repository state by `folderKey([cwd,on])`, not space. Moving between spaces in the same folder already preserves facts; moving to a worker worktree usually changes that key.
- `Changes.refresh()` calls `syncAggregate()` first. A coordinator gets `tasks:<scope>`; worker entry has no coordinator pull context and falls through to folder Git. A different key calls `resetRepository()`, clearing root, repository, both row lists, both counts, pages, related PR and pin presentation before root/GitHub reads finish. The later root resolution can reset again. This is the Loading/0 flash.
- `aggregate.js:AggregatePulls.sync()` obtains the generic `pluginPullContext(selectedSpace)`. Crew produces explicit validated task PR URLs only for the selected coordinator; no inference from its cwd occurs. `pump()` deduplicates repository/number, reads targeted batches of at most 20 with at most three concurrent jobs, and applies live/history eligibility. Task totals are not repository totals.
- The existing coordinator-return mechanism is `AggregatePulls.rememberPresentation()` plus restoration in `sync()`, scoped to machine/owner/home/provider and Git generations. It retains at most four snapshots / 4096 admitted identities, marks restored entries dirty, and keeps pure task reveal/anchor snapshots separately in `main.js:taskSections()`.
- PR #88 completes exactly the requested presentation: `AggregatePulls.published`, `publicationPending`, `presentationEntries()`, `presentationRows()`, `hasPresentation`, `updating` and `rememberCounts()` hold the committed list until replacement settles. `Changes.renderAggregate()` and `repositorySections()` render it; `activity(t.working)` beside the Git title is the native header pulsing bulb. Cold Loading is below tabs; warm refresh has no body Loading. Reuse this, not another spinner, skeleton, fade or cache-specific badge.
- `pulls.js:GitReads` already coalesces routed reads and keeps raw facts keyed by route `[on,credentialScope]`, canonical repository and PR number. `lists`/`targets` are pending promises, not completed list snapshots; cached per-PR facts contain neither page membership/cursors nor full totals. `PullFactsOrder` rejects obsolete publication. Raw shared facts strip aggregate projection keys in `rememberPull()`.
- `AgentLinks.entries` uses an exact live target key containing terminal/pane/tab/space/cwd/machine and stores canonical repository plus explicit PR or branch. Its canonical repository mapping includes effective git config/gh-resolved fingerprint; labels alone cannot prove a terminal's new directory is still that repository.
- `pin-swap.js:PinSwap` is the current 320ms native motion controller. `main.js:renderPulls()` holds `pullPresentation` while `resolve()` waits for footer/selection confirmation, `swapOverlay()` uses native top transitions, and settlement applies latest rows. One arming callback and one cleanup callback run, with a three-second wait bound and safe normal reveal on unavailable geometry. Currently `start()` requires a previous pin and click geometry; row measurements exclude aggregate keyed rows. PR #87 already invokes this controller for ordinary stage-chip and robot clicks; aggregate chip/robot clicks currently go straight through `AggregatePulls.focus()`.

## Goals / Non-Goals

Goals: first safe destination frame reuses known data; one coordinator-derived presentation lifecycle and header treatment in both directions; space entry adds no pin, row reorder or move-to-top animation; no facts or authority cross identities.

Non-goals: unify space entry with click animation, extend PinSwap, change existing chip/robot click pin behavior or stage targeting, merge task inventory with repository inventory, modify Crew's wire contract or multi-child layout, introduce periodic reads, persist PR lists, alter auto-fix, change native software or touch excluded paths.

## Decisions

### 1. Share presentation entry/publication, not unrelated read authority

Extract/generalize PR #88's committed-versus-refreshing mechanism into a small Git-local pure presentation owner used by both the coordinator and ordinary adapters. Both enter through the same `enter -> restore/project -> mark updating -> refresh -> publish` path and build the same section/header shell. Reuse `sidebarSectionHeader`, `sidebarNumericSlot`, `repositorySection` and `activity(t.working)` rather than copying their styles or adding an alternative worker loading branch.

Keep coordinator `AggregatePulls` membership/targeted reads and ordinary root/list/pagination reads as adapters. Worker entry contains one repository section in its cached order, without an entry-created active pin. Coordinator return restores all eligible sections in their cached order directly, without an unpin/reorder transition. Ordinary spaces outside a fleet remain repository-wide; a warm task section may seed a worker, not permanently restrict it to tasks. Do not make a worker an invented coordinator context or grant task reads from cache.

Alternative rejected: simply stop `resetRepository()` or retain the last visible list. That displays the source machine/repository while resolving an unrelated destination and loses the explicit provenance needed for counts and authority.

### 2. Two qualified kinds of snapshot, one bounded owner

Store pure committed snapshots with machine/routing, canonical repository, source kind (`tasks` or `repository`), source scope, timestamp/revision, source and Git enable generations, per-tab row membership, known counts/completeness and relevant pagination/reveal metadata. Use the existing four-snapshot / 4096-admitted-identity aggregate bound as the combined retained-context budget, not an unbounded second inventory. Eviction removes pure snapshots/mappings together; current mounted native handles remain view-owned.

A coordinator publication contributes repository projections to the owner with task-count provenance. Ordinary successful pages contribute repository snapshots with full totals, loaded depth/cursors and per-tab availability. Prefer a compatible ordinary snapshot; otherwise seed from the compatible coordinator section for exactly that repository and machine. Retain an authoritative empty snapshot as warm too. Never treat arbitrary raw `GitReads.facts` enumeration as a complete list or total.

Before async work, resolve entry from a previously verified exact live folder/target-to-repository mapping in this runtime. Coordinator agent-link scans already establish such mappings; retain them independently from click-only pin state and invalidate on native target/cwd/config changes. A validated task PR can identify its row but cannot alone prove the terminal's changed cwd. A genuinely unmapped directory must resolve normally and must not borrow a section by matching a space name, branch, short repository name or terminal ID on another machine. Once canonical identity resolves, reuse any compatible presentation immediately without waiting for its own list fetch.

### 3. Cached values stay useful without falsifying totals

Coordinator remains task-scoped; ordinary remains repository-wide. A worker seeded only from a coordinator section shows that section's known Open/Closed numbers immediately, retaining existing count-loading metadata with explicit cached-task/incomplete-repository meaning. It never receives the coordinator's global multi-repository totals. The section count covers its known displayed selected-tab rows until authoritative replacement. The first successful repository page and both full totals publish together in place; a task subset is never silently promoted to an exact repository total. This is a narrow extension of existing count-loading semantics, not a new visual treatment.

Refreshed data is read through existing routing/single-flight/publication order. Restore dirty mutable facts and request shown-context catch-up once; local context ticks must not become list polling. Known final facts retain session-cache policy. While a request runs, use exactly the existing native header activity. Cooldown pauses admission using the existing retry path, retaining rows; verification uncertainty keeps PR #88's diagnostic tooltip and disabled action policy. Actionable errors stay repository-scoped. No false success or secondary retry loop.

### 4. Keep space entry separate from existing click-only motion

Space entry only restores the destination's compatible section snapshot and starts the shared header refresh lifecycle. Do not start PinSwap, derive a new active pin from the selected agent's PR/branch, move a row to the top, or run an unpin transition on return to coordinator. Do not route native space/tab/agent changes through a new click-animation entrypoint. Cached ordering is presentation, not an instruction to refocus an agent.

Keep PR #87's chip and fallback robot click handlers, role-aware focus, PinSwap controller, overlay, timing, geometry, confirmation, cancellation and settlement behavior owned by that PR. The coordinator chose click-only initially-unpinned support, to be delivered by the #87 worker; consume that dependency and add the enter-unpinned -> click-chip integration test here without editing the controller. A panel click may naturally cause a space change; its already-started click transition must still complete through the existing acknowledgement path, rather than being cancelled by cache entry or started a second time. Space entry itself never creates such a transition. No changes to `pin-swap.js`, new section-motion endpoints, aggregate animation or new measurement machinery are planned.

On direct space entry, the section adapter must not invoke ordinary active-PR projection merely because the selection changed: render the cached section order and refresh in place. Existing click-origin transitions remain owned by their original click handlers; they are not generalized to navigation events. Regression tests distinguish direct selection (zero new pin/motion/reorder) from chip/robot clicks (existing behavior unchanged), including a click followed by its native selection acknowledgement.

### 5. Main header simplification

The person's added instruction removes the duplicate repository label and its full-URL tooltip/right-click Code / Pull requests / Actions menu from the main header. Keep only Git, its existing title chevron, native header activity and Refresh/Pin/Close tools in both modes. The removed label had no left-click action or dedicated keyboard/focus entry; keyboard access belonged to the popup. Delete that repository popup path, including its keyboard actions; individual PR Open / Copy path menus stay unchanged. Do not relocate the three repository page shortcuts in this change: they will be gone from this panel, explicitly reported for the person to decide.

Repository identity remains the canonical section name/count/chevron, with the existing clipped-name tooltip. Verification uncertainty and its sanitized reason/time remain on PR #88's header activity/refresh feedback rather than a duplicate label or Stale text. Pending count feedback stays on count badges. Update former header/menu tests and docs to assert absence, not merely hide the text.

### 6. Invalidation rules

| Event | Presentation | Reads / action authority |
| --- | --- | --- |
| Space changes, verified same machine/repository | Restore/project destination snapshot before async work; retain compatible source facts | Retire old selection subscribers and acquire current read demand; entry starts no pin or reorder |
| Another machine or canonical repository | Only its own qualified snapshot, otherwise cold Loading | No shared folder alias, totals, agent or response publication |
| Cwd/native target changes without a verified mapping | Remove old-folder display until destination identity is known | Reject old context requests before root/PR follow-ups |
| Effective git routing changes | Invalidate affected folder mapping and routed snapshot | Existing canonical lookup/read boundary must re-establish identity |
| Successful non-repository or authoritative replacement | Remove incompatible snapshot/seed and reconcile counts/rows coherently | Obsolete responses cannot restore it |
| Same-context timeout, auth/read failure or cooldown | Keep last-good rows/counts; existing notice or quiet retry | Never interpret uncertainty as absence or grant stale actions |
| Task removal, PR absence, state transition or history expiry | Apply current eligibility; never resurrect an excluded task in coordinator | Ordinary full-repository membership remains independent of task membership |
| Git disable/re-enable | Clear presentation inventory and mappings for old enable generation | Retire all consumers/late replies |
| Crew/attachment disable or owner/home replacement | Clear affected task-derived snapshots and worker seeds | Ordinary independently loaded repository data retains only its own authority |
| Hide/close/restart | Hidden snapshots do no work; close/restart discards session presentation | No hidden IO or persisted PR inventory; no cached callback action |

### 7. Dependency/collision integration

PR #87 is the required base and owns chip behavior. Before implementing, re-read its current head and merge status; use latest main after its merge, otherwise its branch. Preserve its chip-click motion and role-target refusals exactly, including robot fallback; do not connect direct space entry to that animation path.

PR #88 owns the coordinator loading/publication implementation being reused. Necessary source overlap is `aggregate.js` constructor/sync/rememberPresentation/rememberCounts/presentation getters/invalidate/pump and `main.js` repositorySections/renderAggregate/header activity (plus shared section composition). Necessary test/spec/doc overlap is coordinator-return/loading/count presentation in `plugin-integrations`, `tests/git-coordinator-return.test.mjs`, `git-inventory-presentation` when present, and relevant README/TESTING paragraphs. Integrate #88's delivered mechanism once, after coordinating its current version; do not revert its no-Stale treatment or duplicate its publication policy. No changes to Spaces, Crew/global settings, native targets, `src/services/updates`, `tools/deploy-all.mjs` or `src/plugins/trello`.

## Risks / Trade-offs

- A canonical repository cache cannot safely identify a never-mapped directory instantly -> warm presentation requires exact current location evidence; unknown mapping uses honest cold identity resolution, then immediately adopts compatible data.
- Coordinator inventory is only a task subset -> typed provenance, visible known values with existing incomplete-count metadata, atomic full-page/totals replacement, and tests against unrelated task/repository totals.
- Two active PRs alter these seams -> coordinate #88 integration and refresh #87 base before code; preserve upstream tests, stage semantics and no new native UI treatment.
- Cache entry could accidentally cancel or duplicate an existing chip-click transition -> keep click handlers/controller untouched and test the click's native selection acknowledgement separately from direct space entry.
- Sharing presentation can accidentally share authority -> pure snapshots contain no callbacks, native handles or permissions; every current reader and captured action retains independent membership and generation checks.

## Validation and handoff after approval

Focused packaged-controller tests will hold identity, footer, page and targeted reads and sample every render: coordinator -> worker A -> worker B -> coordinator; same/different repositories and machines; cold/known-empty caches; in-place successful/failed/cooldown refresh; duplicate PR numbers; config/cwd/home/generation changes; warm counts with honest task provenance; direct entry with no pin/reorder/move-to-top; unchanged chip/robot click behavior through native selection acknowledgement; stale replies after away-and-back. Preserve pagination/cursors, folded/reveal batches, scroll anchors, row geometry, no render-time side effects and existing caps.

Disposable native proof at 100% and 130% will capture the cold/warm/header-activity/in-place sequence in both space-entry directions, showing stable row ordering and no move-to-top animation. Chip/robot click checks are regression evidence only for unchanged existing behavior, not new animation work. Use fake repositories/agents/transport and production renderers only, never real credentials, production deployment or input into live agents. Store captures/logs outside the checkout in the allowed crew task folder and stop every owned instance/server before reporting. Synthetic/controller-driven evidence will be identified honestly.

Run the full local suite once on the final implementation head using documented isolation, then push and consume delivery-bot finalization, fast-forward locally and inspect all checks. No manual ready, auto-merge or merge. At this stage only plan artifacts are delivered; implementation, broad suites and native evidence wait for approval.

## Migration Plan

No persisted schema migration or deployment is part of this task. Implementation changes only bounded session memory and normal packaged Git UI; restoring the previous customization drops that memory. No native app/Core, Crew records, accounts or user preferences are changed.
