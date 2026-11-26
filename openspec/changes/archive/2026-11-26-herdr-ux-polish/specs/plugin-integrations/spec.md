# Spec Delta

## MODIFIED Requirements

### Requirement: Stale coordinator presentation without action authority
When strict fleet action context is unavailable, the coordinator SHALL retain its shown same-home list with header activity, no body Loading and no Stale label. Cold context SHALL show top-left Loading below Open/Closed. Retained context SHALL NOT authorize GitHub reads or worker navigation. Fresh verification SHALL restore operation or replace invalid context. PR/task inventory SHALL NOT persist for restart.

#### Scenario: Status unavailable beyond action freshness
- **WHEN** a status read fails or times out after strict action freshness expires while the verified pair's native spaces still exist
- **THEN** the sidebar stays attached and previously shown Git rows, counts and folds remain with header activity while reconciliation is pending, no body Loading and no Stale label
- **AND** no new aggregate read or robot navigation uses the retained context as authorization
- **AND** Stale, the removed task heading and the generic incomplete-list notice do not appear in the header

#### Scenario: Cold restart before verification
- **WHEN** the selected coordinator is restored from durable pair identity but no task/PR facts have been verified in this runtime
- **THEN** Git shows only its standard top-left Loading inventory feedback rather than switching to folder-based non-repository mode or showing partial sections
- **AND** only a fresh verified same-home status result can start task-linked GitHub reads

#### Scenario: Different selected space or confirmed home change
- **WHEN** the user selects another space or a completed read disproves or changes coordinator/home ownership
- **THEN** stale rows are not displayed or reused as facts for the unrelated destination
- **AND** ordinary folder Git and existing stale-generation guards remain intact

### Requirement: Selected-tab coordinator repository visibility
Coordinator Git SHALL withhold cold partial successes until first reads settle, using one top-left Loading below Open/Closed. Warm return/refresh SHALL retain the shown list with header activity, no body Loading and in-place replacement on completion. Actionable notices SHALL appear immediately. Eligibility SHALL precede folding, preserving history, truthful totals and saved folds. Enrollment SHALL use full eligible inventory independently of section visibility.

#### Scenario: Open and Closed contain different repositories
- **WHEN** one repository has only Open or Draft task PRs and another has only eligible Merged or Closed task PRs, with no unresolved task PRs
- **THEN** Open shows only the first repository section and Closed shows only the second
- **AND** omitted sections leave no header or chevron, and switching tabs preserves both totals

#### Scenario: Genuine selected-tab notice without rows
- **WHEN** a repository has no eligible selected-tab rows but has an applicable actionable PR-read notice
- **THEN** its section appears immediately with that notice under existing folding behavior, even without a known PR state or while other repositories are still loading
- **AND** a failure scoped only to the other tab does not keep an otherwise empty section visible
- **AND** this explicit failure exception never becomes an empty Loading-only section

#### Scenario: History ages out
- **WHEN** a historical-only Merged or Closed PR is outside the existing 24-hour history limit or lacks a valid completion date
- **THEN** that PR and its expired row-specific failure do not keep a section visible
- **AND** other eligible rows or genuine applicable notices can still keep a section visible once admitted, while unresolved work remains represented by panel Loading

#### Scenario: Folded repository disappears and returns
- **WHEN** a repository is folded, becomes ineligible in the selected tab and later reappears through a tab switch or updated PR facts
- **THEN** its saved folded state is restored
- **AND** folding an eligible section alone does not produce an empty state or change counts

#### Scenario: Empty settled tab
- **WHEN** no repository has an eligible row or applicable read notice and no unresolved work remains in a settled verified tab
- **THEN** ordinary Git's `No open pull requests` or `No closed pull requests` appears without empty repository headers
- **AND** pending or unverified work uses one standard panel Loading indication instead of a false empty state

#### Scenario: Hidden section remains an enrollment choice
- **WHEN** a confirmed unenrolled repository has eligible PRs only in the other tab
- **THEN** the single pinned enrollment footer still includes it in canonical inventory order
- **AND** hiding its section does not enroll it, remove its fold state, or initiate or cancel reads

#### Scenario: Mixed successful repositories and a quietly deferred cold repository
- **WHEN** no compatible sections have previously been shown and admitted links include unread PRs in one repository while healthy siblings have supplied rows
- **THEN** only one standard top-left Loading bulb and text appear as inventory feedback, with successful sibling headers and rows withheld until all admitted first reads settle
- **AND** queued, in-flight and quietly deferred work remain unresolved; genuine applicable failures may show their repository notice immediately below Loading
- **AND** no error or rate-limit wording, placeholder PR, per-repository Loading flash or falsely complete global total is introduced

#### Scenario: Retry fills the existing section
- **WHEN** the existing cooldown expires while the panel remains shown, enabled and freshly verified, and its automatic retry succeeds
- **THEN** the complete eligible selected-tab success sections appear together when no unresolved first reads remain, without requiring a new event or manual refresh
- **AND** previously shown compatible section identities, folds, reveal depth and scroll anchors remain stable without clearing healthy last-good rows
- **AND** confirmed missing PRs, other-tab-only rows and expired history leave no empty section, while top-left Loading remains until unresolved work finishes

#### Scenario: Return to a previously visited coordinator
- **WHEN** the user returns to the same coordinator machine, owner, home and enable generation during the same runtime
- **THEN** the last compatible previously shown selected-tab sections, rows, counts and folds are shown immediately while current verification or membership reconciliation runs
- **AND** pending reconciliation uses the existing header activity indicator, with no body Loading or Stale label, and completion stops activity and updates the list in place
- **AND** newly loading partial success sections are withheld until first reads settle, while actionable notices appear immediately
- **AND** authoritative removals, state transitions and expiry reconcile without restoring incompatible facts or granting stale worker actions

#### Scenario: One cold repository fails while others load
- **WHEN** one admitted repository has an actionable first-read failure and other repositories have pending or deferred first reads
- **THEN** one top-left Loading indication remains and the failed repository's applicable header and notice appear beneath it under existing folding rules
- **AND** successful partial sections remain withheld; when all remaining reads succeed, confirm absence or fail actionably, eligible successes appear and Loading disappears
- **AND** actionable failures without authoritative PR state keep totals loading rather than inventing exact totals, even after the body Loading disappears

#### Scenario: Background refresh of an already shown list
- **WHEN** the coordinator list is on screen and known PR facts refresh without new unread membership or lost verification
- **THEN** existing sections and rows remain mounted without body Loading or Stale text, and the existing working bulb animates in the header throughout the update
- **AND** new unread membership or pending verification also uses header activity only; activity stops and the list updates in place when the update finishes
- **AND** new partial success sections are withheld until first reads settle, while current authoritative removals, history expiry and state transitions remain effective

### Requirement: Non-destructive same-context PR refresh presentation
A same-context refresh SHALL retain displayed rows, pin geometry and pagination until replacement is ready. Pending reads, verification and transient failures SHALL NOT replace known rows with empty states. Coordinator return/background updates SHALL use header activity, no body Loading and no Stale label. Returns SHALL reuse bounded compatible runtime presentation. Different identities SHALL invalidate incompatible facts; retained context SHALL NOT authorize reads or worker actions.

#### Scenario: Delayed manual or webhook refresh
- **WHEN** a manual, webhook, reconnect or show-time refresh is pending for the displayed repository or coordinator home
- **THEN** known rows stay mounted without a temporary empty list or replacement Loading content
- **AND** replacement facts apply directly, preserving expanded webhook depth and resetting manual pagination only when the replacement page is ready

#### Scenario: Transient root or PR read failure
- **WHEN** a same-context Git-root probe or PR refresh fails without authoritative evidence of a changed or absent repository
- **THEN** last-good rows remain visible with the appropriate failure notice rather than being cleared
- **AND** later success replaces facts without a blank intermediate frame

#### Scenario: Loading and fleet verification
- **WHEN** the panel has unresolved first reads or the same coordinator home temporarily loses fresh verification
- **THEN** previously shown compatible rows remain with header activity only, no body Loading and no Stale text anywhere
- **AND** cold verification uses only that ordinary panel working bulb and Loading wording as inventory feedback, with no extra Verifying header, invented PRs, counts, skeleton values or partial success sections

#### Scenario: Off and on with slow or failed first verification
- **WHEN** a verified coordinator list is switched off and back on and the first current read is slow, interrupted or fails
- **THEN** off uses ordinary Git and clears inventory; on shows standard top-left Loading for the current candidate, never Not a git repository while verification is pending or awaiting retry
- **AND** no previous inventory returns across off/on and retained presentation grants no reads or worker navigation

#### Scenario: Negative completes before toggle without a panel render
- **WHEN** authoritative absence completes without a Git render, then attachment is switched off/on and new verification is pending or fails
- **THEN** top-left Loading appears without old inventory or Stale resurrection
- **AND** only current fresh verification can populate the list

#### Scenario: Changed coordinator owner with verification pending
- **WHEN** a previous owner has a positive or negative result and a different labelled owner begins verification
- **THEN** the current candidate shows top-left Loading rather than ordinary folder Git or the previous inventory
- **AND** only a witnessed authoritative negative matching current dependency identity can suppress Loading

#### Scenario: Authoritative context or membership change
- **WHEN** a different machine, folder or coordinator home is selected, a repository is definitively absent, or authoritative PR/task membership changes
- **THEN** incompatible rows are removed or replaced rather than retained as facts for the destination
- **AND** legitimate pin navigation, task-history expiry and requested folds or tab changes remain allowed layout changes

#### Scenario: Bounded runtime return memory
- **WHEN** a previously visited coordinator is selected again within the same runtime and enable generation
- **THEN** only that exact machine, owner, home and selected-tab previously shown presentation can be restored, subject to current eligibility and fresh action verification
- **AND** the cache is bounded, starts no hidden reads, and persists no PR/task inventory to disk, portable preferences or restart state
- **AND** Git, Crew or attachment disablement and authoritative ownership loss invalidate affected cached presentations

### Requirement: Sanitized fleet verification diagnostics
Failed, unmatched and discarded fleet verification attempts SHALL retain a bounded machine-scoped reason, timestamp and attempted generation in runtime-only diagnostics. The customization log SHALL receive a bounded deduplicated line without raw command output, credentials, reports or task inventory. Late diagnostics SHALL NOT replace newer verification facts or grant action authority. Diagnostic persistence failure SHALL NOT prevent verification or recovery.

#### Scenario: Transport and status failures
- **WHEN** verification encounters a transport rejection, command timeout, nonzero Crew status exit, malformed response or unready native membership
- **THEN** its runtime diagnostic identifies the sanitized failure category, time and attempted generation
- **AND** timeout remains distinguishable from generic status failure without logging raw stderr or stdout

#### Scenario: No matching identity and obsolete reply
- **WHEN** a completed read has no owner, mismatching membership or no eligible fleet, or a reply is rejected as obsolete
- **THEN** diagnostics distinguish authoritative absence from uncertain membership and generation, lease or identity supersession
- **AND** an older reply cannot overwrite a newer success, current failure or retry deadline

#### Scenario: Repeated failures and recovery
- **WHEN** several mod copies or repeated retries encounter the same reason for the same machine and generation
- **THEN** runtime facts retain the latest occurrence but the log emits only the first line of that unchanged reason episode
- **AND** changed reasons or a new failure episode after recovery can produce a new line within the log's fixed size bound

#### Scenario: Existing verification feedback
- **WHEN** the selected coordinator has a relevant last verification failure
- **THEN** a tooltip on the existing working bulb exposes sanitized reason/time, in cold top-left Loading or warm header activity, without Stale text or notifications
- **AND** a cold unverified coordinator candidate gains no attachment, PR inventory, GitHub-read permission or worker-navigation authority from that feedback

#### Scenario: Runtime privacy and retention
- **WHEN** diagnostics are retained across mod replacement or inspected by an agent
- **THEN** their bounded runtime facts and customization log remain readable locally and excluded from portable preferences
- **AND** recovery history does not become a durable authorization record or contain raw task, transcript or authentication data

### Requirement: Quiet GitHub rate refusal episodes
Any Git panel GitHub read refused for primary or secondary rate limits SHALL retain last-good rows, totals, pins and paging without an error notice, banner, replacement empty state or new Stale alarm. With no prior shown inventory it SHALL retain standard top-left Loading feedback without exposing cold partial success sections. Each refusal episode SHALL emit one sanitized customization-log line, never one per attempt. Actionable non-rate failures SHALL retain their existing notices.

#### Scenario: Every read path is quiet
- **WHEN** list, count, targeted, older/pinned, history, safety, check-detail, repository-resolution, account-diagnosis or panel auxiliary reads encounter a genuine rate refusal
- **THEN** refusal alone introduces no error UI or new stale alarm, and already shown rows and totals remain
- **AND** first-load unknown data stays top-left Loading with unknown-count semantics rather than settling as an empty list or exposing partial successful repositories
- **AND** unrelated existing actionable errors or fleet-verification waiting feedback are not falsely cleared or reclassified

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

#### Scenario: Warm refusal in either panel mode
- **WHEN** a same-context coordinator or ordinary repository with loaded facts is refused during refresh
- **THEN** its last-good rows and counts remain without replacement Loading content, paging reset or new error UI
- **AND** existing cooldown recovery remains subject to current visibility, enablement, machine and context guards
