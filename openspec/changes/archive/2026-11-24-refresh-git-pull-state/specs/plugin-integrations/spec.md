# Spec Delta

## MODIFIED Requirements

### Requirement: Bounded aggregate reads and invalidation
Aggregate reads SHALL be read-only, machine-bound and limited to a shown enabled Git panel. New local task links SHALL trigger targeted PR reads. PR state and checks SHALL use authenticated events or explicit refresh, with a bounded fallback for shown Open/Draft or uncovered pending/unknown-check rows. Selection, plugin or ownership changes SHALL invalidate stale responses and captured actions. One repository's failure SHALL NOT erase valid rows from another.

#### Scenario: Refresh and repository events
- **WHEN** the panel opens, the user refreshes, or a relevant authenticated repository event arrives
- **THEN** it refreshes the appropriate linked PR state and checks and retains unaffected repository rows
- **AND** timer-based local Crew membership checks do not themselves periodically re-fetch unchanged GitHub PR or CI facts

#### Scenario: Hide, disable or switch during a request
- **WHEN** Git is hidden or disabled, Crew or attachment is disabled, or the selected coordinator binding changes during a read
- **THEN** no new aggregate follow-up read starts from that obsolete request
- **AND** its late result cannot populate the next context or authorize a stale agent-focus action

#### Scenario: Repository unavailable
- **WHEN** one linked repository is inaccessible to that machine's GitHub login
- **THEN** the panel preserves other repositories' valid rows and reports a scoped incomplete result
- **AND** it does not switch accounts, install companions or enroll webhook repositories automatically

### Requirement: Pending checks fallback without live coverage
Shown Open/Draft PRs and uncovered pending/unknown checks SHALL refresh state and checks through coalesced repository jobs on the existing queue: every 45 seconds unenrolled or 120 seconds enrolled, independent of relay connectivity. Failures SHALL retain values and back off exponentially; rate limits SHALL delay retries at least 15 minutes. Hidden, disabled, offline or superseded contexts SHALL stop reads.

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
- **THEN** last-good facts remain and no immediate retry occurs
- **AND** the next attempt waits at least 15 minutes or a longer Retry-After value

#### Scenario: Settled open PR changes state
- **WHEN** a shown unenrolled PR with settled checks is merged, closed or converted to draft after its last successful refresh
- **THEN** the next successful fallback cycle reads its current state alongside checks and reconciles its row and totals
- **AND** settlement alone cannot leave it indefinitely in Open after closure

### Requirement: Completion-driven Git checks freshness
A shown, enabled Git panel with an enrolled repository and healthy relay SHALL refresh loaded PR state and checks from authoritative GitHub reads after relevant events, including events during an in-flight refresh. Reconnect and reopening SHALL catch up. The app SHALL retain latest-workflow/rerun semantics with a 120-second shown-open safety net and document latency dependencies and conditions that retain stale facts.

#### Scenario: Completion and rerun update loaded rows
- **WHEN** authenticated check, status or workflow invalidation arrives for a loaded ordinary or coordinator repository after checks change
- **THEN** refreshed icon/count values match the latest authoritative checks, including partial completion and reruns, and include current PR state
- **AND** pinned, unpinned and explicitly linked older rows receive the refresh without requiring agent selection changes

#### Scenario: Completion during an in-flight read
- **WHEN** a relevant completion event arrives while the previous refresh is reading GitHub facts
- **THEN** a coalesced follow-up refresh consumes that invalidation rather than leaving the previous count indefinitely
- **AND** obsolete replies cannot overwrite facts in a different repository, machine or coordinator context

#### Scenario: Refresh timing and unavailable live updates
- **WHEN** refresh behavior is documented or reported
- **THEN** it distinguishes event receipt, request queue/read latency and GitHub data propagation from measured end-to-end latency
- **AND** it states that absent enrollment uses a 45-second shown-open state-and-check fallback, and enrolled shown Open/Draft rows use a 120-second safety net; hidden or disabled panels, unverified coordinator context and failed reads can retain stale facts until the applicable fallback, catch-up or manual refresh
- **AND** it does not promise a bounded live-update delay when those prerequisites or successful reads are absent

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
- **AND** targeted GitHub reads retain their concurrency bound
- **AND** webhook/manual refresh and the eligible state-and-check fallback handle merge, close and reopen transitions without repository-wide inventory

## ADDED Requirements

### Requirement: Coherent pull request state transitions
Every successful row refresh SHALL read authoritative Open/Draft/Merged/Closed state with checks. Ordinary and coordinator views SHALL reconcile tab membership, state presentation and totals without duplicate identities or a clear-to-empty intermediate frame. Failed reads SHALL preserve last-good facts. Coordinator counts SHALL remain task-scoped; ordinary counts SHALL remain repository-wide.

#### Scenario: Settled open row merges or closes
- **WHEN** a loaded PR with settled checks merges or closes and the next event, fallback or manual refresh succeeds
- **THEN** it leaves Open and appears in Closed with its authoritative merged/closed presentation, subject to coordinator history eligibility
- **AND** both totals change in the same committed presentation while unaffected rows retain relative order and loaded content does not flicker to empty

#### Scenario: Reopened or draft row
- **WHEN** a refresh observes a Closed PR reopened or an Open PR converted to Draft
- **THEN** reopening moves the row to Open and updates both totals, while draft conversion updates its icon without changing Open membership or counts
- **AND** stale responses cannot restore its former state, duplicate a pin or overwrite another repository's facts

#### Scenario: History does not pin a merged row in Open
- **WHEN** a finished task's previously open PR is now merged or closed
- **THEN** retention uses its new GitHub completion timestamp and Closed eligibility rather than retaining its former Open membership
- **AND** unrelated row order, saved folds and ordinary pagination and pin geometry remain intact
