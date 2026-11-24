# Spec Delta

## MODIFIED Requirements

### Requirement: Bounded aggregate reads and invalidation
Aggregate reads SHALL be read-only, machine-bound and limited to a shown enabled Git panel. New local task links SHALL trigger bounded repository-batched targeted reads. Events, explicit refresh and the shown-open safety fallback SHALL refresh mutable facts, reusing session-final facts. Selection, plugin or ownership changes SHALL invalidate stale subscribers and actions without duplicating a shared read. One repository's failure SHALL NOT erase valid rows from another.

#### Scenario: Refresh and repository events
- **WHEN** the panel opens, the user refreshes, or a relevant authenticated repository event arrives
- **THEN** it refreshes appropriate mutable linked PR state and checks and retains unaffected repository rows and cached final facts
- **AND** timer-based local Crew membership checks do not themselves periodically re-fetch unchanged GitHub PR or CI facts

#### Scenario: Hide, disable or switch during a request
- **WHEN** Git is hidden or disabled, Crew or attachment is disabled, or the selected coordinator binding changes during a read
- **THEN** no new aggregate follow-up read starts from that obsolete request
- **AND** its late result cannot populate the next context or authorize a stale agent-focus action
- **AND** another independently current subscriber can reuse the same correctly routed in-flight read without inheriting coordinator authority

#### Scenario: Repository unavailable
- **WHEN** one linked repository is inaccessible to that machine's GitHub login
- **THEN** the panel preserves other repositories' valid rows and reports a scoped incomplete result for actionable failures, while rate refusals remain quiet
- **AND** it does not switch accounts, install companions or enroll webhook repositories automatically

### Requirement: Labels share PR data refresh
PR labels SHALL be obtained with existing PR reads rather than additional per-row requests. Mutable PR labels SHALL refresh with other row facts on panel opening, manual refresh, reconnect and relevant webhook invalidation, including pull_request labeled and unlabeled actions. Session-final rows SHALL reuse cached labels unless precise change evidence invalidates them. Stale replies SHALL NOT restore labels in another context, and unchanged PRs SHALL NOT acquire periodic label polling.

#### Scenario: Existing repository and targeted reads
- **WHEN** a PR is loaded through a paginated repository list, an older active-PR lookup or a coordinator task lookup
- **THEN** its assigned label names and colours are included in that same PR read
- **AND** no additional label request is started for the row

#### Scenario: Label added or removed
- **WHEN** a relevant authenticated pull_request labeled or unlabeled event identifies a loaded PR as changed
- **THEN** the corresponding existing refresh path updates its labels from authoritative PR data
- **AND** removing the final label removes its visible pills and any now-redundant separator without changing the line height or leaving a visible placeholder or horizontal reservation

### Requirement: Bounded finished-task pull request history
Closed tasks from the verified coordinator's crew home SHALL contribute their validated Open/Draft task PRs without live workers. Historical-only Merged/Closed PRs SHALL appear only within 24 hours of GitHub's merge/close timestamp; undated closed history SHALL be excluded. Live sources SHALL win deduplication and keep worker navigation. Historical-only rows SHALL have no robot or worker action. Status and targeted-read bounds SHALL remain enforced.

#### Scenario: Worker finishes before merge
- **WHEN** a same-home task becomes closed and loses its live worker while its validated task PR remains Open or Draft on GitHub
- **THEN** that PR remains in the coordinator's Open tab and repository/global counts
- **AND** it has no worker robot or navigation unless another eligible live task shares it
- **AND** finishing the final worker does not discard same-home PR history while its verified coordinator remains live

#### Scenario: Conservative Closed history
- **WHEN** a historical-only task PR is Merged or Closed on GitHub
- **THEN** it appears in the Closed tab and counts only within 24 hours of its authoritative merge/close timestamp
- **AND** older or undated historical closed PRs do not appear or leave empty repository headers
- **AND** PRs still linked by eligible live tasks retain normal Closed behavior regardless of age

#### Scenario: Live task shares a historical PR
- **WHEN** several closed tasks and an eligible live task link the same repository and PR number
- **THEN** the panel fetches, displays and counts one full PR identity and retains the live task's robot
- **AND** closing that live task removes its worker navigation but does not remove an otherwise eligible historical PR
- **AND** a stale captured robot callback cannot navigate to the former worker

#### Scenario: No recorded PR or wrong home
- **WHEN** a reviewer or scout has no PR, a task link is malformed, or status does not belong to the verified coordinator's crew home and owner
- **THEN** that record adds no historical row, count or worker target
- **AND** matching task names, repository names or local terminal IDs on another machine cannot bypass provenance checks

#### Scenario: Existing bounded reader and refresh
- **WHEN** historical candidates are read or updated by the shown enabled aggregate panel
- **THEN** status includes closed tasks through `--all --json`, requests discovery when supported, and retains response-size, task-count and finite transport bounds
- **AND** targeted GitHub reads retain their concurrency and batch bounds
- **AND** webhook/manual refresh and the eligible state-and-check fallback handle mutable PR transitions without repository-wide inventory, while unchanged final facts are reused and historical expiry needs no GitHub request

### Requirement: Truthful repository-scoped pull request read notices
The coordinator Git overview SHALL render at most one actionable PR-read failure notice per repository section in the selected tab. Notices SHALL distinguish GitHub responses from transport unreachability. Rate-limit refusals and confirmed missing recorded task PRs SHALL produce no error UI. Missing task PRs SHALL have no row, hint or tooltip. Failures SHALL preserve healthy last-good rows and existing history eligibility.

#### Scenario: One live open PR and three finished merged PRs
- **WHEN** a verified coordinator records one live Open or Draft PR and three finished-task Merged PRs in the same repository, each merged within 24 hours
- **THEN** Open shows only the live PR and Closed shows the three merged PRs without historical worker robots
- **AND** successful reads produce no failure notices in either tab, with repository and global counts of Open 1 and Closed 3

#### Scenario: Failed refresh of known closed history
- **WHEN** precise change evidence invalidates previously loaded historical Merged or Closed facts and replacement reads fail without confirming absence
- **THEN** actionable failures produce no notice in Open and at most one scoped read-failure notice in Closed, while rate refusals remain quiet
- **AND** last-good eligible rows and counts remain, while expired historical rows and their row-specific failures do not reappear

#### Scenario: Historical failure before state is known
- **WHEN** an initial read fails actionably for a recorded historical-only PR whose GitHub state has not been established, without confirming its absence
- **THEN** at most one history-load notice appears in that repository's Closed section, with no per-PR error line under Open
- **AND** no state, completion date or count is invented for the unread PR

#### Scenario: GitHub answered with a refusal
- **WHEN** GitHub answers a PR read with a genuine access, authentication or other actionable non-absence response failure rather than a rate-limit refusal
- **THEN** the notice describes the failed read or relevant refusal instead of declaring GitHub unreachable
- **AND** several failures in that repository still produce at most one notice in the applicable tab

#### Scenario: Local process failure or timeout
- **WHEN** the GitHub CLI cannot start, exits abnormally with empty stderr or exceeds its local command timeout
- **THEN** the applicable repository section shows one transient read-failure notice offering Refresh to retry rather than asserting that GitHub is unreachable
- **AND** last-good eligible PR facts survive and the existing bounded refresh path remains without a new polling or automatic retry loop

#### Scenario: Current account cannot resolve the repository
- **WHEN** GitHub explicitly refuses access to the repository or PR with the current login rather than establishing that the recorded PR is missing
- **THEN** the notice identifies access with the current GitHub account rather than a GitHub connectivity outage
- **AND** the panel does not switch the login or discard healthy rows

#### Scenario: Genuine connectivity failure
- **WHEN** applicable PR reads fail because the GitHub connection cannot be established or times out at the transport boundary
- **THEN** the repository section shows one clear connectivity notice rather than one line per PR
- **AND** other repositories' valid rows remain visible and no account switch or automatic enrollment occurs

#### Scenario: Partial recovery and folded sections
- **WHEN** some failed reads recover or a repository section is folded
- **THEN** recovered failures are removed from the summary without hiding remaining applicable failures
- **AND** folding hides the single notice with that section's body, without new reads or changes to its counts

#### Scenario: Confirmed missing finished-task PR
- **WHEN** GitHub authoritatively reports that an exact recorded historical-only task PR does not exist
- **THEN** the PR contributes no row, count, notice, neutral hint, tooltip or empty repository header in either tab, even if it previously had cached facts
- **AND** its canonical repository and number are remembered for the app session so manual refresh, webhook invalidation, hide/show and coordinator or panel recreation do not repeatedly request it
- **AND** first confirmation emits one sanitized customization-log line identifying that repository and number, with no raw command output, credentials or task inventory

#### Scenario: Mixed historical results
- **WHEN** a repository's recorded historical links contain both found PRs and confirmed missing PRs
- **THEN** only the found eligible rows contribute to presentation and counts, with no missing-history notice
- **AND** a different repository with the same PR number is independent of the remembered absence

#### Scenario: Missing live-task PR
- **WHEN** an unfinished task records a PR that GitHub confirms missing, including a PR also linked by finished tasks
- **THEN** the PR contributes no row, count, notice, neutral hint, tooltip, worker control or empty repository header in either tab
- **AND** repeated refreshes within five minutes do not re-request it; the next eligible existing shown-panel refresh after five minutes may recheck it once, without a new timer or concurrent duplicate read
- **AND** a corrected recorded URL can be read immediately without clearing unrelated remembered absences, and a successful later read can display the now-existing PR normally
- **AND** repeated missing confirmations still emit only the first sanitized customization-log line for that exact repository and number in the session; finishing the task restores session-long historical suppression

## ADDED Requirements

### Requirement: Quiet GitHub rate refusal episodes
Any Git panel GitHub read refused for primary or secondary rate limits SHALL retain last-good rows, totals, pins and paging without an error notice, banner, replacement empty state or new Stale alarm. With no prior successful data it SHALL retain standard Loading feedback. Each refusal episode SHALL emit one sanitized customization-log line, never one per attempt. Actionable non-rate failures SHALL retain their existing notices.

#### Scenario: Every read path is quiet
- **WHEN** list, count, targeted, older/pinned, history, safety, check-detail, repository-resolution, account-diagnosis or panel auxiliary reads encounter a genuine rate refusal
- **THEN** refusal alone introduces no error UI or new stale alarm, and already known rows and totals remain
- **AND** first-load unknown data stays Loading with unknown-count semantics rather than settling as an empty list
- **AND** an unrelated existing actionable error or fleet-verification Stale state is not falsely cleared or reclassified

#### Scenario: Bounded retry and manual bypass
- **WHEN** a refusal starts or extends a cooldown
- **THEN** automatic reads wait at least fifteen minutes or the longer Retry-After duration, even with positive hourly quota
- **AND** one explicit user Refresh can attempt one read during cooldown without starting a retry loop or fan-out after another refusal
- **AND** a refused manual read remains quiet and does not emit another line in the same episode

#### Scenario: Episode recovery and strict classification
- **WHEN** retries keep failing with rate refusal, then an admitted read succeeds, and a later read is rate-refused
- **THEN** the first episode logs only once and the later episode can log once after successful recovery
- **AND** authentication, permission, network, local process, timeout and malformed-response failures are not silenced merely because they mention rate-related text or return HTTP 403 without rate-limit evidence
- **AND** logs contain no tokens, raw replies or task inventories and logging failure never blocks retry or presentation

### Requirement: Session-final Git facts and shared reads
Ordinary and coordinator views SHALL reuse session-cached Closed/Merged PR facts across refreshes and context recreation instead of rereading unchanged final rows. Compatible in-flight reads of the same routed repository SHALL be shared across both views. Cache keys SHALL isolate machine, repository and credential-routing scope; caches SHALL grant no coordinator or worker authority and SHALL NOT persist PR inventory as portable or restart state.

#### Scenario: Warm final history
- **WHEN** known final PRs are revisited by tab switch, manual refresh, reconnect, generic webhook, local membership refresh or hide/show
- **THEN** unchanged final rows and their labels/checks are reused without targeted history or detail reads
- **AND** coordinator task totals and twenty-four-hour eligibility are still computed from the current verified task membership and current time

#### Scenario: Changed final fact or reopen hint
- **WHEN** precise validated change evidence identifies a cached PR, such as a successful Open inventory that contradicts its Closed state
- **THEN** only affected cached facts are invalidated and reread authoritatively
- **AND** the hint itself cannot move a row, invent totals or grant worker authority
- **AND** generic check/push events do not invalidate every cached Closed row

#### Scenario: Shared compatible read and stale subscriber
- **WHEN** ordinary and coordinator views need overlapping compatible repository facts while a read is pending
- **THEN** they reuse the pending facts rather than issuing duplicate reads for the same PRs and shape
- **AND** each subscriber independently validates its scope before publication or follow-up, so a retired subscriber cannot cancel another current subscriber's authority or receive its results in a new context

#### Scenario: No relay redeployment dependency
- **WHEN** the panel uses the currently deployed relay with repository-only invalidations
- **THEN** all batching, caching, quiet-refusal and activity benefits remain available without a relay change
- **AND** cached final coordinator history is session-bound rather than polled for external reopen or metadata changes; precise hints remain a separately scoped optional follow-up

### Requirement: Demand-driven Git reads
Git SHALL debounce event bursts for two seconds per routed repository and refresh only demanded mutable rows. Hidden, disabled, offline, superseded or explicitly inactive-window contexts SHALL start no reads or follow-ups. Return SHALL catch up once. Thin state/summary probes SHALL retain the 45-second unenrolled and 120-second enrolled shown-open cadences; check contexts SHALL be requested only for new or changed heads/summaries.

#### Scenario: Open shown after Closed was visited
- **WHEN** Open is shown and refresh, webhook or reconnect occurs after Closed rows have loaded
- **THEN** Closed row pages are not reread and last-good Closed totals remain until an authoritative totals/state update arrives
- **AND** a later Closed selection can lazily reconcile its demanded membership without clearing cached final facts first

#### Scenario: Burst with in-flight work
- **WHEN** several events for a repository arrive inside two seconds, including events while its read is in flight
- **THEN** they become one pending repository refresh per short window, with at most one dirty follow-up rather than one read per event
- **AND** an event arriving too late to be represented by the in-flight snapshot is not lost

#### Scenario: Unchanged checks on any refresh trigger
- **WHEN** an existing row is refreshed and its head and rollup summary are unchanged
- **THEN** its known check contexts are reused on event, manual, list and targeted paths as well as safety probes
- **AND** new rows or changed heads/summaries fetch bounded details under the same read lease without overwriting unrelated row fields

#### Scenario: Background and return
- **WHEN** the host exposes an explicit inactive window or Git is hidden during pending work
- **THEN** no subsequent API command starts until it is shown and active again, while completed data remains available
- **AND** return coalesces accumulated invalidations into one catch-up per repository subject to cooldown and current authority
- **AND** absent host activity information does not guess inactivity, and any unavailable independent minimized-state signal is documented
