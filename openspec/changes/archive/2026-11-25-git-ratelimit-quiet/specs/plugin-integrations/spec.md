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
- **THEN** recorded-only status includes closed tasks through the advertised fleet view when available or legacy `--all --json`, with separate lower-priority discovery when supported, and retains response-size, task-count and finite transport bounds
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

### Requirement: Pending checks fallback without live coverage
Shown Open/Draft PRs SHALL retain 45-second unenrolled and 120-second enrolled state/check safety reads, independent of relay connectivity. Known Closed/Merged rows SHALL stay session-cached even with pending checks. Failures SHALL retain values with bounded backoff and at least 15 minutes for rate limits. Hidden, disabled, offline and superseded contexts SHALL stop safety reads; window activity alone SHALL NOT gate reads.

#### Scenario: Pending checks settle
- **WHEN** an unenrolled shown Open/Draft PR has pending checks and its fallback read returns settled checks
- **THEN** the count updates in place and the fallback continues reading that shown open PR's state and checks at its normal cadence
- **AND** a confirmed empty rollup is settled rather than unknown but does not stop an open row's state refresh

#### Scenario: Failure and visibility
- **WHEN** a fallback read fails or the panel is hidden, disabled or its machine goes offline
- **THEN** its last displayed value remains and failures back off before another eligible read
- **AND** hidden, disabled or offline contexts start no fallback reads and late replies cannot overwrite a new context

#### Scenario: Thin unchanged-row cycle
- **WHEN** shown PR heads and overall check summaries remain unchanged during a safety cycle
- **THEN** one bounded repository probe reads state, draft/completion/head facts and the rollup summary without requesting individual check contexts
- **AND** full check contexts are fetched only for changed heads or summaries, under the same single-flight lease

#### Scenario: Secondary rate limit
- **WHEN** GitHub refuses a safety read with a secondary limit despite positive hourly quota
- **THEN** last-good facts remain and no immediate automatic retry occurs
- **AND** the next automatic attempt waits at least 15 minutes or a longer Retry-After value

#### Scenario: Settled open PR changes state
- **WHEN** a shown unenrolled PR with settled checks is merged, closed or converted to draft after its last successful refresh
- **THEN** the next successful fallback cycle reads its current state alongside checks and reconciles its row and totals
- **AND** settlement alone cannot leave it indefinitely in Open after closure

#### Scenario: Coordinator viewport selection
- **WHEN** a coordinator safety cycle selects eligible PRs
- **THEN** every revealed PR in an unfolded section of the selected tab is eligible, including rows below or above the visible viewport
- **AND** unrevealed rows, folded sections and the other tab remain excluded
- **AND** scroll input itself starts no inventory read or immediate extra probe, while ordinary safety selection stays unchanged

#### Scenario: Window changes during a safety request
- **WHEN** reveal, fold, tab, context or relevant inventory changes supersede a held safety selection, including changing away and back
- **THEN** its reply is rejected by the captured selection generation
- **AND** moving only the native viewport within an unchanged revealed selection does not invalidate that selection or change its normal cadence

#### Scenario: Final history retains pending checks without rereads
- **WHEN** a shown known Closed or Merged PR has pending or unknown checks
- **THEN** its last-known checks remain session-cached without a safety probe or detail reread
- **AND** Open/Draft rows still retain their normal state-and-check safety cadence

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
- **THEN** batching, caching and quiet-refusal benefits remain available without a relay change
- **AND** cached final coordinator history is session-bound rather than polled for external reopen or metadata changes; precise hints remain a separately scoped optional follow-up

### Requirement: Selected-tab batched Git refresh
Ordinary Git refresh SHALL read only the selected tab's pages and use bounded details only for new or changed heads/summaries. Cooldown retries SHALL re-evaluate current selected demand. Event and enrollment scheduling SHALL retain main's lifecycle without a two-second debounce, pending-demand transfer, inactive-window pause or deferred enrollment retry queue. Thin shown-open safety probes SHALL retain their 45/120-second cadences.

#### Scenario: Open shown after Closed was visited
- **WHEN** Open is shown and refresh, webhook or reconnect occurs after Closed rows have loaded
- **THEN** Closed row pages are not reread and last-good Closed totals remain until an authoritative totals/state update arrives
- **AND** a later Closed selection can lazily reconcile its demanded membership without clearing cached final facts first

#### Scenario: Current demand after cooldown
- **WHEN** a Closed page or append is rate-refused and Open is selected before the retry fires
- **THEN** recovery reads Open rather than the hidden Closed tab
- **AND** an already-loaded selected destination retains its expanded depth

#### Scenario: Unchanged checks on any refresh trigger
- **WHEN** an existing row is refreshed and its head and rollup summary are unchanged
- **THEN** its known check contexts are reused on event, manual, list and targeted paths as well as safety probes
- **AND** new rows or changed heads/summaries fetch bounded details under the same read lease without overwriting unrelated row fields

#### Scenario: Main event and window lifecycle
- **WHEN** three repository events are separately dispatched inside two seconds to a shown panel, including an inactive window
- **THEN** main's immediate event path invokes three repository-batched refreshes rather than one debounced refresh
- **AND** enrollment remains main's per-repository configuration or explicit Refresh check, without a deferred retry timer

#### Scenario: Effective repository default changes
- **WHEN** remote gh-resolved routing changes while remote URLs remain unchanged
- **THEN** the canonical agent repository cache is invalidated and rechecked
- **AND** unchanged effective routing still reuses verified identity without a GitHub lookup each footer tick
