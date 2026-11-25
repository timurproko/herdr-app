## MODIFIED Requirements

### Requirement: Pending checks fallback without live coverage
Shown Open/Draft PRs SHALL use 45-second safety reads while checks are pending or unknown, even when enrolled; settled rows SHALL retain 45-second unenrolled and 120-second enrolled state/check reads. Known Closed/Merged rows SHALL stay session-cached. Failures SHALL retain values with bounded backoff and at least 15 minutes for rate refusals. Hidden, disabled, offline and superseded contexts SHALL stop safety reads; window activity alone SHALL NOT gate reads.

#### Scenario: Pending checks settle
- **WHEN** a shown Open/Draft PR has pending checks and its fallback read returns settled checks
- **THEN** the count updates in place and the fallback continues reading that shown open PR's state and checks at its settled cadence
- **AND** a confirmed empty rollup is settled rather than unknown but does not stop an open row's state refresh

#### Scenario: Failure and visibility
- **WHEN** a fallback read fails or the panel is hidden, disabled or its machine goes offline
- **THEN** its last displayed value remains and failures back off before another eligible read
- **AND** hidden, disabled or offline contexts start no fallback reads and late replies cannot overwrite a new context

#### Scenario: Thin unchanged-row cycle
- **WHEN** shown PR heads and overall check summaries remain unchanged during a safety cycle
- **THEN** one bounded repository probe reads state, draft/completion/head facts and rollup summary, including up to 100 contexts for each pending or unknown row in that same request
- **AND** settled rows remain thin; changed heads or summaries can use the existing bounded detail follow-up under the same single-flight lease
- **AND** detailed pending counts use the full-detail newest-workflow and newest-attempt derivation, combining check runs and status contexts with SUCCESS, SKIPPED and NEUTRAL passed

#### Scenario: No events while pending counts advance
- **WHEN** GitHub advances a shown row from 2/10 to 5/10 to 10/10 without changing its head and with overall PENDING retained during the numeric progression, and no event arrives
- **THEN** successive successful 45-second probes publish the new numbers using one repository request per bounded chunk per cycle
- **AND** no raw aggregate replaces the newest-workflow derivation and no extra detail request is added for that already-pending row

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

### Requirement: Completion-driven Git checks freshness
A shown, enabled Git panel with an enrolled repository and healthy relay SHALL refresh loaded PR state and numeric checks after relevant events, including during an in-flight refresh and without head/summary changes. Reconnect and reopening SHALL catch up. The app SHALL retain latest-workflow/rerun semantics, 45-second pending safety and 120-second enrolled settled safety, documenting latency and stale-data conditions.

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
- **AND** it states that shown pending/unknown rows use 45-second safety regardless of enrollment, while settled enrolled rows use 120 seconds; hidden or disabled panels, unverified coordinator context and failed reads can retain stale facts until eligible fallback, catch-up or manual refresh
- **AND** it does not promise a bounded live-update delay when those prerequisites or successful reads are absent

### Requirement: Selected-tab batched Git refresh
Ordinary Git refresh SHALL read only the selected tab's pages, refreshing pending numeric checks even with unchanged head/summary and reusing unchanged settled details. Cooldown retries SHALL re-evaluate current demand. Events and enrollment SHALL retain main's immediate lifecycle without debounce, inactive-window pause or deferred enrollment retries. Shown-open safety SHALL use 45 seconds while pending, otherwise existing 45/120-second cadences.

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
- **THEN** known settled check contexts are reused, but pending numeric checks are reread on event, manual, list, targeted and safety paths
- **AND** new rows or changed heads/summaries fetch bounded details under the same read lease without overwriting unrelated row fields

#### Scenario: Main event and window lifecycle
- **WHEN** three repository events are separately dispatched inside two seconds to a shown panel, including an inactive window
- **THEN** main's immediate event path invokes three repository-batched refreshes rather than one debounced refresh
- **AND** enrollment remains main's per-repository configuration or explicit Refresh check, without a deferred retry timer

#### Scenario: Effective repository default changes
- **WHEN** remote gh-resolved routing changes while remote URLs remain unchanged
- **THEN** the canonical agent repository cache is invalidated and rechecked
- **AND** unchanged effective routing still reuses verified identity without a GitHub lookup each footer tick

## ADDED Requirements

### Requirement: Bounded pending numeric confirmation recovery
Pending-row numeric freshness SHALL reflect successful numeric reads, not state-only or cached reads. After more than 90 seconds without numeric confirmation, the next eligible cycle SHALL demand fresh numbers past unchanged/coalescing shortcuts. Active reads SHALL retain single-flight guards. Cooldown-skipped reads SHALL retry at cooldown expiry without another event, retaining loaded data and quiet refusal handling.

#### Scenario: Overdue numbers behind an existing read
- **WHEN** a shown pending row's last successful numeric confirmation is older than 90 seconds or unknown
- **THEN** its next eligible probe requests fresh numeric facts rather than satisfying demand from an already-started read
- **AND** busy queues retry without overlapping active panel reads; state-only or cached success does not reset numeric age

#### Scenario: Cooldown expires without a new event
- **WHEN** a pending probe is skipped because a shared rate cooldown is nearly expired
- **THEN** it retries on the existing scheduler at that cooldown's expiry rather than extending the cooldown or waiting for another event
- **AND** rate refusal alone produces no error UI and preserves loaded rows

#### Scenario: Incomplete contexts remain uncertain
- **WHEN** a pending PR has more than 100 contexts and the bounded response reports another page
- **THEN** the read retains today's incomplete-context refusal and last-good facts instead of publishing a partial total
